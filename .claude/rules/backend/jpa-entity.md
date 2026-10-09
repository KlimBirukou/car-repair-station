---
paths:
  - "backend/src/main/java/**/repository/jpa/**/*.java"
---

# Rule: JPA Entities

## Default

Unless explicitly overridden by the project specification:

- **What:** One JPA entity `<Feature>JpaEntity` per table. It is a persistence model only and never leaves the
  `repository.jpa` package.
- **When:** For every persisted domain record.
- **Where:** `<feature>/repository/jpa/`, package-private.
- **How:** Lombok
  `@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor @ToString @EqualsAndHashCode(onlyExplicitlyIncluded = true)`.
  `equals`/`hashCode` use `id` only.
- **ID:** `@Id UUID id`, assigned by the service, no `@GeneratedValue` (see the Entity Identifiers rule).
- **Version:** `@Version Long version` (wrapper type) in every entity. It marks a new entity (`null`), so `save()` uses
  `persist()` instead of `merge()`, and it detects a race between overlapping transactions. It is technical: not in the
  domain record, not in DTOs. The exception is the root of an aggregate that the specification declares
  version-controlled (the work order): its version is part of the domain record and of the API (see the Aggregates
  rule).
- **Immutable fields** (`id`, `version`, and fields the specification marks as immutable): `@Setter(AccessLevel.NONE)`.
  The column is `updatable = false` (except `version`).
- **References:** another entity is referenced by its id (`UUID <name>Id` column). No JPA associations.
- **Timestamps:** no `createdAt`/`updatedAt` unless the specification asks for them.
- **Enums:** `@Enumerated(EnumType.STRING)` with an explicit `length`.
- **Columns:** explicit `@Column(name, nullable, length/precision)`. Required values are `nullable = false`.
- **Unique constraints:** named in `@Table(uniqueConstraints = @UniqueConstraint(name = "uk_<table>_<column>", ...))`.
  No `unique = true` on the column. The name is used to build the error response.
- **Soft delete:** an entity that the specification soft-deletes (customer, vehicle) has a `delete_token` column
  (`UUID`, not null, no default). A live row holds `SoftDelete.LIVE_TOKEN` (`00000000-0000-0000-0000-000000000000`, in
  `common/persistence`), a deleted row holds its own id. Uniqueness among non-deleted records is a plain named unique
  constraint over the value and the token, for example
  `@UniqueConstraint(name = "uk_customer_email", columnNames = {"email", "delete_token"})`. It needs no partial index,
  so it works on every database. The domain record has `boolean deleted`; the persistence mapper converts it from and to
  the token.
- **Deactivation:** an entity that the specification deactivates (employee, service item, part) has an `active` column
  and a plain named unique constraint: inactive rows still count for uniqueness.

Example:

```java

@Id
@EqualsAndHashCode.Include
@Setter(AccessLevel.NONE)
@Column(name = "id", nullable = false, updatable = false)
private UUID id;

@Setter(AccessLevel.NONE)
@Column(name = "birth_date", nullable = false, updatable = false)   // immutable by specification
private LocalDate birthDate;

@Version
@Setter(AccessLevel.NONE)
@Column(name = "version", nullable = false)
private Long version;
```

## Why

- Without `@Version`, a new entity with an assigned ID looks like an existing one: `save()` calls `merge()`, which adds
  a SELECT before every INSERT and silently overwrites a row if an ID is reused by mistake. With `@Version = null`,
  `save()` calls `persist()`: one INSERT, and a duplicate fails loudly.
- No setter means the compiler stops accidental changes, and MapStruct does not treat the field as a target of
  `updateEntity`.
- References by id keep entities independent: no lazy loading, simple mapping.
- Named constraints make error responses stable: they are matched by name, not by database message text.

## Exceptions

Associations (`@OneToMany` and similar) are allowed only for a non-standalone entity that the specification declares as
part of an aggregate. The Aggregates rule describes the mapping.

## Prohibitions

- No `@Data`, no `@Value` on entities.
- No `@GeneratedValue`.
- No `@ManyToOne`, `@OneToOne`, `@OneToMany`, `@ManyToMany` unless the specification allows it.
- No `EnumType.ORDINAL`.
- No setter for `id`, `version` or immutable fields.
- No `public` entity class and no entity in a signature outside `repository.jpa`.
- No `unique = true` next to a named `@UniqueConstraint`.
- No Hibernate `@SoftDelete`, `@SQLRestriction` or `@Where`: deleted rows must stay readable for old orders, so
  visibility is decided by the specification class (see the Repositories rule).

## Special Cases

Join entities that consist only of two IDs have a composite key and no `version` (see the Entity Identifiers rule).

## Infrastructure

- `lombok.config`: `lombok.data.flagUsage = error`.
- The schema belongs to Liquibase migrations. Hibernate only validates it: `spring.jpa.hibernate.ddl-auto=validate`.

## Verification

- ArchUnit: every `@Entity` has a `@Version` field of wrapper type `Long`; no field has `@GeneratedValue`; no
  association annotations; entity classes are not public and reside in `..repository.jpa..`.
- `lombok.config` turns `@Data` into a compile error.
- Integration test per soft-deleted entity: a deleted record is not in `findAll`, is returned by `findById`, and its
  unique value can be used again.
- Integration test per entity (H2): insert, update, unique violation. `ddl-auto=validate` fails the context if the
  mapping and the migrations diverge.
