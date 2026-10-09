---
paths:
  - "backend/src/main/java/**/repository/**/*.java"
---

# Rule: Repositories (Port and Adapter)

## Default

Unless explicitly overridden by the project specification:

- **What:** Each feature has a repository port `<Feature>Repository` and one JPA adapter `<Feature>RepositoryAdapter`.
- **When:** For every persisted feature.
- **Where:** The port is in `<feature>/repository/` (public). The adapter, the Spring Data repository
  `<Feature>JpaRepository`, the entity, the specification and the persistence mapper are in `<feature>/repository/jpa/`
  (package-private).
- **How (port):** Only domain types. `Page`/`Pageable` from Spring Data Commons are allowed. Methods are named by
  meaning: `insert`, `update`, `findById`, `findAll(filter, pageable)`, `existsById`. There is no generic `save`. Every
  port of a standalone feature that other features show in their responses also has `findAllByIds(Set<UUID>)`: one
  query, deleted and inactive records included, no filter (see the References rule).
- **How (adapter):** `@Repository`, `@RequiredArgsConstructor`. It takes the Spring Data repository and the persistence
  mapper by direct injection, accepts and returns domain objects, and never lets an entity out.
- **insert / update:** Use `saveAndFlush`. `update` loads the entity, applies the changes with the mapper's
  `updateEntity`, then saves.
- **Lists:** `findAll(filter, pageable)` only. Filtering goes through `<Feature>Specification.byFilter(filter)`.
- **Soft-deleted entities** (customer, vehicle): `byFilter` always adds `notDeleted()` (the delete token equals the live
  token). `deleted` is not a field of the filter, so a list can never return deleted records. `findById` returns deleted
  records too, because old orders refer to them. The port also has `existsActiveById` (exists and not deleted) for
  checks when something new refers to the record, and a command that marks the record deleted (it sets the token to the
  record's id).
- **Deactivated entities** (employee, service item, part): `active` is a nullable field of the filter. `null` means no
  condition, as for every filter field.
- **Transactions:** The adapter has no `@Transactional`. The service defines the boundaries.

Example (adapter, insert and list):

```java

@Override
public Person insert(@NonNull Person person) {
    var saved = jpaRepository.saveAndFlush(mapper.toEntity(person));
    return mapper.toDomain(saved);
}

@Override
public Page<Person> findAll(@NonNull PersonFilter filter, @NonNull Pageable pageable) {
    return jpaRepository.findAll(PersonSpecification.byFilter(filter), pageable)
        .map(mapper::toDomain);
}
```

Specification:

```java
static Specification<PersonJpaEntity> byFilter(PersonFilter filter) {
    return Specification.allOf(
        hasActive(filter.active()),
        matchName(filter.name())
    );
}

private static Specification<PersonJpaEntity> hasActive(Boolean active) {
    return (root, _, cb) -> Objects.isNull(active) ? null : cb.equal(root.get("active"), active);
}
```

A specification that returns `null` adds no condition. A new filter means: a field in the filter record, a private
static method in the specification, and one line in `byFilter`. The adapter does not change.

## Why

- Services see only the port, so JPA stays replaceable and services can be tested with a mock.
- With assigned IDs Hibernate postpones INSERT and UPDATE until commit. `saveAndFlush` sends the SQL inside the adapter,
  so constraint and version conflicts are thrown before the service logs success.
- One filtered `findAll` instead of many `findByXAndY` methods keeps the port small.

## Exceptions

The specification may require a different persistence approach for an entity. Follow it for that entity.

## Prohibitions

- No business logic, validation or business logging in the adapter.
- No entities in port signatures; no JPA or Hibernate imports outside `repository.jpa`.
- No `ConversionService` and no manual field copying (`entity.setX(...)`); use the mapper.
- No upsert-style `save`; no per-filter query methods.
- No `@Repository` on the Spring Data interface.
- No catching of persistence exceptions in the adapter; translation happens in the global exception handler.
- No `deleted` condition outside the specification class, and no list method that can return deleted records.

## Special Cases

- LIKE filters are case-insensitive: compare `lower(column)` with a lower-cased `%value%` pattern.
  A dependent record (see the Aggregates rule) has `findAllBy<Parent>Id(UUID)` for one parent and
  `findAllBy<Parent>Ids(Set<UUID>)` for a page of parents (one query, returns a `List`; the service groups it). They are
  the only exceptions to "lists through `findAll(filter, pageable)`".
- A number from a database sequence (`nextNumber()` of the order port) is the one place where an adapter uses the
  `EntityManager`: the adapter takes the dialect of the Hibernate session factory and asks it for the "next value"
  statement of the sequence, so the same code runs on H2 and PostgreSQL. No hand-written `nextval`, `NEXT VALUE FOR` or
  `select … from dual`. The first order task proves it on H2 with an integration test (the second call returns a larger
  number).

## Infrastructure

Spring Data JPA: `JpaRepository` and `JpaSpecificationExecutor`.

## Verification

- ArchUnit: classes in `..repository.jpa..` are not public; the port package does not depend on `..repository.jpa..` or
  `jakarta.persistence..`; services do not depend on `..repository.jpa..`.
- Integration tests per adapter (H2): insert, update, findById, each filter on its own and combined, `existsById`.
- For a soft-deleted entity: `findAll` hides deleted records, `findById` returns them, `existsActiveById` is false for
  them.
- `findAllByIds` and `findAllBy<Parent>Ids` run one query for any number of ids (statement count in the integration
  test).
- No sequence statement written for one database.
