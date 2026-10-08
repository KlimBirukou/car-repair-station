---
paths:
  - "backend/src/**/*.java"
---
# Rule: Package Structure

## Default
Unless explicitly overridden by the project specification:

- **What:** Package-by-feature. Each feature has one top-level package with the same internal layout.
- **When:** For every new feature (aggregate).
- **Where:** `<base>/<feature>/`; `<base>` is `com.carrepair.station`. Shared code lives in `<base>/common/` (`common/exception`, `common/web`, `common/service`, `common/security` with `CurrentUser`, `Role`, `PasswordPolicy` and `PasswordHasher`, `common/persistence` with `SoftDelete`).
- **How:** Use this layout. Create only the parts the feature needs.

```text
<feature>/
├── <Feature>.java                  # domain record
├── <Feature>Filter.java            # domain filter record for list queries
├── exception/                      # feature-specific business exceptions
├── service/
│   ├── <Feature>Service.java
│   ├── <Feature>ServiceImpl.java
│   ├── Create<Feature>Dto.java     # service input
│   └── Update<Feature>Dto.java     # mutable fields only, no id
├── repository/
│   ├── <Feature>Repository.java    # port, public
│   └── jpa/                        # everything here is package-private
│       ├── <Feature>RepositoryAdapter.java
│       ├── <Feature>JpaRepository.java
│       ├── <Feature>JpaEntity.java
│       ├── <Feature>Specification.java
│       └── <Feature>PersistenceMapper.java
└── web/
    ├── <Feature>ControllerApi.java          # OpenAPI documentation only
    ├── <Feature>Controller.java
    ├── Create<Feature>Request.java
    ├── Update<Feature>Request.java
    ├── <Feature>FilterRequest.java          # list filters (query parameters)
    ├── <Feature>Response.java
    └── <Feature>WebMapper.java
```

- **Dependencies:** `web` → `service` → `repository` (port) ← `repository.jpa`. Domain records in the feature root may be used by every layer. The port never depends on `repository.jpa`.
- **Cross-feature:** A feature may use another feature's domain records, repository port (for example `existsById`) and service interface. It must not use another feature's `repository.jpa`, `*ServiceImpl` or `web` package.
- **Visibility:** Everything in `repository.jpa` is package-private. The rest is public.
- **Naming:** Package names are lowercase without underscores (`workorder`, not `work_order`). `<Feature>` is the name of the feature or aggregate.

## Why
- A new class has exactly one place, so generated code looks the same in every feature.
- Package-private persistence types make the compiler stop JPA from leaking into services and controllers.
- One-way dependencies keep features independent and testable.

## Exceptions
The specification may define a shared module used by several features. Put it in `common/` or in its own top-level package and follow the specification.

## Prohibitions
- No layer-first packages (`controllers/`, `services/`, `repositories/`) and no `util` dumping ground.
- No `facade` layer and no `repository/domain` package.
- No `public` on classes in `repository.jpa`.
- No cycles between features.

## Special Cases
A non-standalone entity lives in the package of its parent feature, and only when the specification says it is not standalone (see the Aggregates rule). There are two kinds:
- **Owned child** (an order line): a domain record nested in the root record and a package-private JPA entity in `repository.jpa`. No port, no service, no web package of its own.
- **Dependent record** (a payment, a status history record): a domain record in the feature root, its own port in `repository/` and adapter in `repository/jpa/`. No service and no web package of its own; its logic lives in the parent's service. It refers to the parent by id.
- A feature that wires a framework (the `auth` feature with Spring Security) may have a `security/` package for that wiring. The dependency directions stay the same.

## Verification
- ArchUnit: layer dependencies as above; `repository.jpa` classes are not public; the port package does not depend on `repository.jpa`.
- ArchUnit: features are free of cycles; no feature depends on another feature's `repository.jpa`, `*ServiceImpl` or `web`.
