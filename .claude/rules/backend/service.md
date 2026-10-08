---
paths:
  - "backend/src/main/java/**/service/**/*.java"
---
# Rule: Services

## Default
Unless explicitly overridden by the project specification:

- **Structure:** Each service has an interface `<Feature>Service` and implementation `<Feature>ServiceImpl` in `<feature>/service/` (see the Package Structure rule).
- **Implementation:** `@Service`, Lombok `@RequiredArgsConstructor`; use constructor injection.
- **Dependencies:** Depend on interfaces/abstractions (repository ports, `IdGenerator`), not concrete infrastructure classes. Another feature is used only through its domain records, repository port or service interface.
- **Responsibilities:** Service owns use-case orchestration, business/domain checks, transaction boundaries, and create-time ID generation according to the Entity Identifiers rule.
- **Models:** Services accept service DTOs (`Create<Feature>Dto`, `Update<Feature>Dto`) and return domain records. Never JPA entities, never web request/response types.
- **Field-level visibility:** A field that only some roles may see (`Part.purchasePrice`) is masked in the service. The current user comes from the `CurrentUser` port; for a user without the right the returned domain record has the field set to `null`. Web mappers map the record as it is. The response field is nullable and documented in OpenAPI.
- **Mapping:** Converting between layer models (domain ↔ entity, request → DTO, domain → response) is done by MapStruct mappers outside the service. Assembling a domain object from a DTO (ID, defaults, preserved immutable fields) is use-case logic and stays in the service, with the builder.
- **Create:** Validate required relations → generate ID → assemble domain object → `insert` → log successful creation.
- **Update (PUT, standalone entities; the root of an aggregate has commands instead, see the Aggregates rule):** Verify the target exists → validate required relations → assemble the new domain object from the existing one and the mutable DTO fields (ID and immutable fields unchanged) → `update` → log successful update. The ID is a separate parameter, not a DTO field.
- **Read:** `@Transactional(readOnly = true)`.
- **Write:** `@Transactional`.
- **Lists:** Accept a filter record and `Pageable`, return `Page` (see the Pagination rule).
- **Guarding a rule across several rows:** An operation whose rule depends on more than one row (an employee must not deactivate themselves; at least one active manager must stay) locks the rows it checks inside the transaction with a pessimistic write lock, in ascending id order so that two such operations cannot deadlock. After taking the locks it checks the rule again on the fresh data and writes. `@Version` alone does not protect it: two requests that change two different rows both pass the version check. The repository port has a method for this (for example `findAllByIdForUpdate(ids)`); the adapter implements it with `@Lock(LockModeType.PESSIMISTIC_WRITE)`.
- **Null contract:** Use Lombok `@NonNull` on required parameters of `*ServiceImpl` methods. Lombok inserts the check into a method body; on the interface it is documentation only.
- **Errors:** Throw `BusinessException` subclasses (see the Exceptions rule). Do not catch persistence exceptions.
- **Logging:** Log successful state-changing operations at `INFO` with the entity ID, after the repository call returned (insert and update flush inside the adapter, so conflicts are thrown before the log line). Do not log routine reads or expected not-found/business exceptions.

Example (update):

```java
@Override
@Transactional
public Person update(@NonNull UUID id, @NonNull UpdatePersonDto dto) {
    var existing = getById(id);
    var updated = existing.toBuilder()
            .firstName(dto.firstName())
            .lastName(dto.lastName())
            .email(dto.email())
            .active(dto.active())
            .build();
    var saved = personRepository.update(updated)
            .orElseThrow(() -> new NotFoundException(Person.class, id));
    log.info("Updated person: id={}", saved.id());
    return saved;
}
```

## Why
- Models stay inside their layers: JPA entities never reach the web, web types never reach the service.
- Building a domain object from a create DTO includes decisions (ID, defaults), which are business logic and must be visible in the use case.
- Logging after the flush keeps the log truthful: a conflict is thrown before "created" is written.

## Exceptions
The default applies only when the entity/use-case specification explicitly requires another service contract, dependency, transaction model, mapping approach, or ID strategy.

## Prohibitions
- No concrete service/repository/infrastructure dependencies when an interface is available.
- No DTO ↔ domain/entity field mapping between layer models inside services.
- No JPA/`EntityManager`/Spring Data usage inside services.
- No web types (request/response, `ResponseEntity`) inside services.
- No generic/abstract base services unless explicitly required.
- No routine read logging or `ERROR` logging for expected not-found/business cases.
- Never change an entity ID during update.
- No dependency on another feature's `repository.jpa`, `web` or `*ServiceImpl`.

## Special Cases
- Small private `require*` methods are allowed for use-case validation (for example `requireAgencyExists`).
- Explicitly required domain-specific orchestration may add service dependencies or checks.

## Infrastructure
- Spring `@Service`, `@Transactional`.
- Lombok `@RequiredArgsConstructor`, `@NonNull`, `@Slf4j`.
- Repository ports.
- MapStruct mappers for layer boundaries outside the service.

## Verification
- ArchUnit: `*ServiceImpl` implements `*Service`; services do not depend on `..repository.jpa..`, `jakarta.persistence..`, `org.springframework.data.jpa..` or `..web..`; no field injection.
- Unit tests with a mocked port and a mocked `IdGenerator`: create assigns the generated ID; update keeps ID and immutable fields; missing target throws `NotFoundException`.
- A hidden field has two unit tests: the value for the allowed role, `null` for the other.
- Reviewer checklist: every write method is `@Transactional`, every read method is `readOnly`, every successful write logs once.
