---
paths:
  - "backend/src/main/java/**/*.java"
---
# Rule: Entity Identifiers

## Default
Unless explicitly overridden by the project specification, use these rules for entity identifiers.

- **What:** Primary key is **UUID v7** (time-ordered, RFC 9562).
- **When:** Generate the ID when creating a new entity, before persistence.
- **Where:** The **Service layer** owns ID generation.
- **How:** Inject `org.springframework.util.IdGenerator` and call `generateId()`.
- **Update:** Entity IDs are immutable and must never be changed. The JPA entity has no setter for `id` and the column is `updatable = false`.
- **Create DTOs:** Must not contain an `id` field.
- **Database:** The primary key column uses the native UUID type (`uuid` in H2 and PostgreSQL) and has no default value.

Example:

```java
private final IdGenerator idGenerator;

public Person create(@NonNull CreatePersonDto dto) {
    var person = Person.builder()
            .id(idGenerator.generateId())
            .firstName(dto.firstName())
            .lastName(dto.lastName())
            .email(dto.email())
            .active(true)
            .birthDate(dto.birthDate())
            .build();

    return personRepository.insert(person);
}
```

## Why
- The ID exists before the INSERT, so it can be used for child objects, logs and events without a database round trip.
- UUID v7 starts with a timestamp, so new rows land at the end of the primary key index. Random UUID v4 scatters them across the index.
- One `IdGenerator` bean is the single place to change the algorithm or to replace it in tests.

## Exceptions
The default applies only when the entity specification does not say otherwise.
Examples of valid overrides:
- ID is supplied externally/client-side.
- ID uses another type or format, such as `String`.

Follow the entity-specific specification in such cases.

## Prohibitions
The following must **not** generate or select entity IDs:
- JPA / entities
- repositories / database
- controllers
- mappers
- clients

Also forbidden anywhere in application code:

```java
@GeneratedValue(strategy = GenerationType.UUID)   // JPA/database generation
UUID.randomUUID()                                  // random v4, not time-ordered
UuidCreator.getTimeOrderedEpoch()                  // outside UuidV7Generator
.id(request.id())                                  // ID taken from the client
```

- Do not sort by ID to get "newest first": IDs created in the same millisecond have no guaranteed order.
- Do not treat an ID as a secret: UUID v7 reveals its creation time.

## Special Cases
**Many-to-many join entities.** If an entity represents only a many-to-many relationship and consists of the two related entity IDs, those two IDs form the **composite primary key** (`@EmbeddedId` with an `@Embeddable` key class). Do not add a separate `id` field.

**Seed data / migrations.** Seed data may define IDs directly in database migrations (for example, Liquibase). Use fixed UUID v7 literals, not database functions such as `gen_random_uuid()`.

## Infrastructure
- **ID generator bean:** a Spring `IdGenerator` implementation that generates UUID v7.
- **Library:** `uuid-creator` (`com.github.f4b6a3`), exact version pinned (6.1.1 was current in Oct 2026).

```java
package com.carrepair.station.common.service;

import com.github.f4b6a3.uuid.UuidCreator;
import org.springframework.stereotype.Component;
import org.springframework.util.IdGenerator;

import java.util.UUID;

@Component
public class UuidV7Generator implements IdGenerator {

    @Override
    public UUID generateId() {
        return UuidCreator.getTimeOrderedEpoch();
    }
}
```

## Verification
- ArchUnit: no calls to `UUID.randomUUID()` in application packages; only `UuidV7Generator` depends on `UuidCreator`; no field annotated with `@GeneratedValue`. Exceptions are listed explicitly in the test, each with a link to the specification.
- Unit tests of services mock `IdGenerator` and assert the exact id (see the Testing rule). They never depend on `UuidV7Generator`.
- Reviewer checklist: IDs are assigned only in services; child objects created in the same operation get their own IDs; create DTOs have no `id`.
