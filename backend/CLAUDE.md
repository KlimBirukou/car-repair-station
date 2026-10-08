# Backend

<!-- Part 1 (WHAT) is complete. Part 2 (HOW) is filled in; the "To decide" section lists what is still open. -->
<!-- The root CLAUDE.md is already loaded: do not repeat it here. -->

## Requirements for this area (WHAT)
Read before working on a task here. Paths are in backticks on purpose: do not import them.
- `docs/domain/entities.md` — entities, fields, types, uniqueness, deletion, validation.
- `docs/domain/work-order-lifecycle.md` — statuses, transitions, conditions.
- `docs/domain/operations.md` — what each role can do.
- `docs/product/scope.md` — what not to build.
- `docs/product/seed-data.md` — the data the system starts with.

## What the backend must provide (WHAT)
- Transition rules live in exactly one place (`state-machine.md`). For a given order and user the backend returns the transitions the user may use, each with `enabled` and, when it is not enabled, a reason and a short message; the frontend draws its buttons from them.
- A transition with an unmet condition is rejected with a short reason the UI can show.
- Every successful transition is written to the status history: from, to, who, when, comment.
- Rights are enforced here, not in the UI: a `MECHANIC` gets only own orders; `Part.purchasePrice` is returned to a `MANAGER` only.
- Validation follows `docs/domain/entities.md`. A duplicate email, VIN, login, code or SKU among non-deleted records is rejected with an error tied to the field.
- If an order was changed by someone else in the meantime, the change is rejected and reported, not silently overwritten.
- Derived values are never entered by hand: line total = quantity × price, order total = sum of line totals, balance = total minus payments.
- Order list filters: status, intake date range, customer, mechanic, vehicle. Search: customers by full name and phone, vehicles by license plate and VIN.

## Stack and conventions (HOW)
Read every file in `.claude/rules/backend/` before writing or changing backend code. They are the code rules; this section is the map.

### Stack and versions
- Java 25, Spring Boot 4.0.5, Gradle (Groovy DSL) with the wrapper. Versions are pinned; upgrade only on request.
- H2 (D-052; PostgreSQL may replace it later), Liquibase (YAML), Spring Data JPA (Hibernate), Bean Validation.
- Lombok, MapStruct, springdoc-openapi, uuid-creator, Spring Security (BCrypt and JWT).
- Tests: JUnit, Mockito, ArchUnit. Integration tests run on H2.

### Architecture and packages
- Package-by-feature, ports and adapters, one layout for every feature: `.claude/rules/backend/structure.md`. The base package is `com.carrepair.station`, the Gradle group is `com.carrepair`.
- Use cases: `service.md`. Port and JPA adapter: `repository.md`. JPA entities: `jpa-entity.md`. MapStruct mappers: `mapper.md`. Identifiers (UUID v7 assigned in the service): `identifier.md`. Aggregates (the work order with its lines, dependent records, versioning, commands): `aggregate.md`. Status transitions: `state-machine.md`.
- Domain objects are records. JPA entities and everything else in `repository.jpa` are package-private and never leave it.

### Persistence and migrations
- The schema belongs to Liquibase changelogs: database-agnostic YAML, one file per table, in the schema `repair_schema`. Hibernate only validates it (`ddl-auto=validate`). Files, names, contexts and the seed: `liquibase.md`.
- Until the human records "Schema frozen" in `docs/decisions.md`, the changelogs may be rewritten and the development database recreated. After the freeze an applied changeset is never edited: a change is a new changeset.
- Entity mapping, constraint naming and `@Version`: `jpa-entity.md`.
- Uniqueness among non-deleted records (customers, vehicles) is a unique constraint over the value and the delete token: `jpa-entity.md`.
- Soft delete (customers, vehicles) marks a record with a delete token: a live row holds a constant, a deleted row holds its own id. Lists hide deleted records inside the specification class; `findById` still returns them for old orders: `jpa-entity.md`, `repository.md`.
- Money is `BigDecimal` with scale 2 (GEL), never `double` or `float`; in JSON it is a plain number: `money-time.md`.
- Moments in time are `Instant` (UTC), dates without time are `LocalDate`; the station time zone is `Asia/Tbilisi`: `money-time.md`.

### API conventions
- Every endpoint is under `/api/v1`. Controllers, requests, responses, the OpenAPI documentation and its errors: `web.md`.
- Errors: `BusinessException` with a kind and a code, one global handler, `ProblemDetail`. Validation and unique violations share one `errors` map of field texts: `exception.md`.
- Lists are always paginated and filtered through a filter record: `pagination.md`.
- Update is `PUT /{id}`: it replaces the mutable fields; immutable fields are not in the request. The work order is the exception: it has no single `PUT`, but one operation per screen section: `aggregate.md`.
- Order transitions are a separate operation (`POST /{id}/transitions`), not part of any PUT. It returns the new state: `state-machine.md`.
- Concurrent changes: work orders expose `version`; every request that changes an order carries the expected version; a mismatch is a conflict: `aggregate.md`.
- The OpenAPI specification is generated by springdoc from the code. Controller and DTO annotations keep it accurate: it is the contract for the frontend. An integration test writes it to `backend/openapi/openapi.json` (committed); the frontend generator reads that file.
- Spring Security with a stateless JWT in an HttpOnly cookie, valid for 12 hours: `security.md`. Roles `MANAGER` and `MECHANIC`. Services read the current user through a small `CurrentUser` port, not through `SecurityContextHolder`, so rights are unit-testable. Row-level rules (a mechanic sees own orders) are applied by the service to the filter. Field-level rules (`Part.purchasePrice`) are applied by the service, which sets the field to `null` for a user without the right: `service.md`.

### Testing
- Rules: `testing.md`. The gate is `./gradlew check`.
- Unit tests, mapper tests, `@WebMvcTest` slices and ArchUnit in `src/test`. Everything that needs a database or the full context in `src/integrationTest`.

### Code rules
`.claude/rules/backend/`: `structure.md`, `identifier.md`, `jpa-entity.md`, `repository.md`, `mapper.md`, `service.md`, `pagination.md`, `exception.md`, `testing.md`, `aggregate.md`, `state-machine.md`, `liquibase.md`, `security.md`, `money-time.md`, `web.md`.

### To decide
- Nothing is open here.
