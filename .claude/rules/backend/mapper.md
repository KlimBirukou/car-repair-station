---
paths:
  - "backend/src/**/*Mapper*.java"
---

# Rule: Mappers

## Default

Unless explicitly overridden by the project specification:

- **What:** MapStruct only. Two kinds of mappers: the persistence mapper (domain record ↔ JPA entity) and the web mapper
  (request → service DTO, domain record → response).
- **When:** Whenever data crosses a layer boundary between two different models.
- **Where:** `<Feature>PersistenceMapper` in `<feature>/repository/jpa/` (package-private). `<Feature>WebMapper` in
  `<feature>/web/`.
- **How:** An interface annotated with `@Mapper`. The component model `spring` and `unmappedTargetPolicy = ERROR` are
  set globally in the compiler options. The consumer injects the mapper by its own type.
- **Persistence mapper methods:** `toEntity(domain)`, `toDomain(entity)`, `updateEntity(domain, @MappingTarget entity)`.
- **Ignored fields:** fields that must not be mapped are ignored explicitly (for example `version` in `toEntity`).
  Immutable entity fields have no setter, so `updateEntity` does not touch them.
- **Not a mapper's job:** assembling a new domain object from a create DTO (ID, defaults) is use-case logic and stays in
  the service.

Example:

```java

@Mapper
interface PersonPersistenceMapper {

    @Mapping(target = "version", ignore = true)
    PersonJpaEntity toEntity(Person person);

    Person toDomain(PersonJpaEntity entity);

    void updateEntity(Person person, @MappingTarget PersonJpaEntity entity);
}
```

## Why

- A field added to a model and forgotten in a mapper becomes a compile error, not silent data loss.
- Direct injection is type-safe. A missing mapper is a compile or startup error, not a runtime
  `ConverterNotFoundException`.
- Tests of adapters need only the adapter and its mapper, no `ConversionService`.

## Exceptions

If MapStruct cannot express a conversion, add a `default` method with `@Named` inside the same mapper. Do not move the
logic to another class. Synchronizing the owned collection of an aggregate is such a case (see the Aggregates rule).

## Prohibitions

- No business logic, repository calls, service calls or ID generation in mappers.
- No Spring `Converter` or `ConversionService` for mapping between layer models.
- No hand-written mapping classes next to a MapStruct mapper.
- No `public` persistence mapper.
- No per-mapper `componentModel` or `unmappedTargetPolicy` once they are set globally.
- No role checks and no `CurrentUser` in mappers: field visibility by role is applied in the service (see the Services
  rule).

## Infrastructure

- Compiler options: `-Amapstruct.defaultComponentModel=spring` and `-Amapstruct.unmappedTargetPolicy=ERROR`.
- Annotation processors are listed explicitly in the build: Lombok first, then `lombok-mapstruct-binding`, then the
  MapStruct processor. JDK 23+ does not run annotation processors implicitly, so Lombok must be listed too. The working
  build fragment is kept in the backend build template.

## Verification

- The build fails on an unmapped target property.
- ArchUnit: mapper interfaces reside only in `..repository.jpa..` or `..web..`; mappers do not depend on services or
  repositories.
- Unit test of the persistence mapper: `toDomain(toEntity(x))` equals `x`; `updateEntity` changes mutable fields only.
