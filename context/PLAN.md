# Plan and Progress

The single plan and progress file. The `planner` writes the task list (modes `plan` and `revise`); the orchestrator owns the statuses, the assumptions and the run summary. Workflow and roles: root `CLAUDE.md`, section "Workflow: plan and progress". A task states WHAT only; HOW comes from the area's rules folder. The review of this plan is in `context/PLAN_REVIEW.md`.

## Task format
```
### T-001 Title
- **Area:** backend | frontend
- **Agent:** db-dev | backend-dev | frontend-dev
- **Goal:**
- **Acceptance criteria:**
  - ...
- **WHAT to read:** `docs/...`
- **Depends on:** T-000 | none
- **Status:** pending | doing | review | done | blocked
- **Notes:**
```

## Tasks
Order: project skeletons (T-001, T-002) → schema and seed (T-003 to T-008, then the human gate "Schema frozen") → backend features (T-009 to T-022, the last one writes the contract file) → frontend (T-023 to T-035) → browser flows (T-036, T-037). Open questions for the human are in "Questions" (Q-3 and Q-12 before T-012, T-013 and T-019). Tasks run one at a time. Every backend task ends with `./gradlew check` green (run from `backend/`); every frontend task ends with `npm run check` green (run from `frontend/`). Backend workers read `backend/CLAUDE.md` and every file in `.claude/rules/backend/` first; frontend workers read `frontend/CLAUDE.md` (the rule set until `.claude/rules/frontend/` is written). Where a task says "rights" it means `docs/domain/operations.md`; "lifecycle" means `docs/domain/work-order-lifecycle.md`.

### T-001 Backend project skeleton
- **Area:** backend
- **Agent:** backend-dev
- **Goal:** A Spring Boot 4 / Java 25 Gradle project in `backend/` that starts against a local PostgreSQL and contains the shared building blocks every feature needs, with no business feature yet.
- **Acceptance criteria:**
  - Gradle (Groovy DSL, wrapper, versions pinned) with the `integrationTest` source set, Spotless, ArchUnit and Testcontainers wired; `check` runs unit tests, integration tests, ArchUnit and formatting.
  - Base package `com.carrepair.station`, group `com.carrepair`; `common/` holds the shared types named in the rules (exceptions with `ErrorKind` and `GlobalExceptionHandler`, `IdGenerator` bean (UUID v7), `Clock` bean, `StationTime` for `Asia/Tbilisi`, `PageResponse`, `PageRequests`, `ApiPaths.V1 = "/api/v1"`, `ApiErrors`, `ApiProblem`, `OpenApiConfig` and the errors customizer, `SoftDelete`, `messages.properties`, `ValidationMessages.properties`).
  - Profiles `dev`, `test`, any other: each sets `spring.liquibase.contexts` explicitly (`dev` -> `seed`, `test` -> `test`, other -> `prod`); `ddl-auto=validate`; default schema `repair_schema` in the Liquibase and Hibernate configuration; Swagger UI and the API document only in `dev` and `test`; page size default and maximum configured.
  - `db/init/create-schema.sql` creates `repair_schema`; a Docker Compose file starts PostgreSQL and mounts that script (the file location is Question Q-2); `docker compose up -d` then `./gradlew bootRun` with profile `dev` starts the application (an empty master changelog is enough at this stage).
  - Tests: context-loads integration test on Testcontainers (uses `withInitScript`); unit tests of `GlobalExceptionHandler` mapping for each `ErrorKind` (404, 400 with `errors`, 409, 403, 401), of the unique-violation mapping (SQLState 23505 -> 409 with `errors.<field>` from `messages.properties`), of `PageRequests.restrict` (unknown sort property -> 400 `errors.sort`, `id` appended), and of the money and time helpers with the literals from the money-time rule; ArchUnit tests for the structure, naming, no-cycles and no-`double` rules that can already be checked.
  - `./gradlew check` is green and the application starts.
- **WHAT to read:** `docs/product/scope.md`, `backend/CLAUDE.md`, `docs/decisions.md` (D-022, D-024, D-029, D-030, D-045, D-046, D-047, D-048)
- **Depends on:** none
- **Status:** pending
- **Notes:** No business feature, no table and no JPA entity here. Rules: `structure.md`, `exception.md`, `web.md`, `pagination.md`, `money-time.md`, `identifier.md`, `liquibase.md` (profiles and contexts), `testing.md`.

### T-002 Frontend project skeleton
- **Area:** frontend
- **Agent:** frontend-dev
- **Goal:** A React / TypeScript / Vite / Ant Design 6 project in `frontend/` with the station look, the router and the providers, and an empty themed shell, that builds and starts.
- **Acceptance criteria:**
  - `package.json` with pinned versions and the scripts `dev`, `build`, `typecheck`, `lint`, `format:check`, `test` and `check`; `npm run check` runs typecheck, ESLint, Prettier check, Vitest and the production build, and is green. TypeScript strict mode.
  - The Ant Design theme is applied through `ConfigProvider` tokens from `docs/product/ui-style.md`: accent `#A8281F`, page background `#FAF7F5`, text and border colors, radius 10 (buttons) and 14 (cards), font Onest, button minimum height 44; the default blue theme never appears. One light theme.
  - `src/app` (providers: QueryClient, router, ConfigProvider), `src/shared` (layout, theme tokens), `src/features` (empty folders mirroring backend features are not required); a placeholder route renders inside a layout with a 220 px sidebar and a top bar; Vite proxy forwards `/api/v1` to the backend; no CORS and no base URL setting.
  - One unit test (Vitest + React Testing Library) renders the shell; `npm run dev` starts.
  - `npm run check` is green.
- **WHAT to read:** `docs/product/ui-style.md`, `docs/product/scope.md`, `frontend/CLAUDE.md`
- **Depends on:** none
- **Status:** pending
- **Notes:** No API client yet: the generated client is wired in T-023, after the backend contract file exists (T-022). The final report states what was checked in the UI (the shell in a browser).

### T-003 Schema: employee, price list, customer and vehicle tables
- **Area:** backend
- **Agent:** db-dev
- **Goal:** Liquibase master changelog and the tables of the standalone entities, with constraints, indexes and the two schema tests.
- **Acceptance criteria:**
  - `db.changelog-master.yaml` (property `schema` = `repair_schema`, includes with `relativeToChangelogFile: true`) and one YAML file per table: `employee`, `service_item`, `part`, `customer`, `vehicle`, with the fields, types, lengths and required flags of `docs/domain/entities.md`. Technical columns per `liquibase.md` (`id`, `version`, `delete_token` for customer and vehicle, `active` for employee, service item and part); no `created_at`, no `updated_at`.
  - Unique constraints on `employee.login`, `service_item.code`, `part.sku`, and over `(email, delete_token)` and `(vin, delete_token)` for customer and vehicle; none on phone or license plate; checks for the `role` enum and for non-negative prices; foreign key and index from `vehicle` to `customer`; indexes for search on customer phone and full name, vehicle license plate and VIN. All names follow `pk_/fk_/uk_/idx_/ck_`.
  - `ChangelogPortabilityTest` (H2 in memory, with the schema script, context `seed`) applies every changeset; the convention test over the YAML files (every table file included by the master, names start with the allowed prefixes, no repeated changeset id, a `rollback` on every `sql` change, no item from the Prohibitions of `liquibase.md`).
  - On PostgreSQL (Testcontainers) the changelogs apply and a `ddl-auto=validate`-style check is deferred to the feature tasks that add JPA entities.
  - `./gradlew check` is green.
- **WHAT to read:** `docs/domain/entities.md`, `docs/product/scope.md`, `backend/CLAUDE.md`
- **Depends on:** T-001
- **Status:** pending
- **Notes:** Author of every changeset is `db-dev`. The schema is not frozen yet: changelogs may be rewritten until the human records "Schema frozen". Field lengths are not given in the docs (Q-6).

### T-004 Schema: work order, order line, payment and status history tables
- **Area:** backend
- **Agent:** db-dev
- **Goal:** The tables of the work order aggregate and its dependent records, appended to the master in dependency order.
- **Acceptance criteria:**
  - One file per table: `work_order`, `work_order_line`, `payment`, `work_order_status_history`, included after the tables they reference.
  - `work_order`: `intake_date` (instant), optional `mileage`, `status` (check constraint with the nine statuses), `vehicle_id`, `customer_id`, `problem_description`, optional `diagnostic_notes`, `manager_id`, optional `mechanic_id`, `version`; no stored total.
  - `work_order_line`: `work_order_id`, exactly one of `service_item_id` or `part_id` (check constraint), snapshot `name`, `quantity` `NUMERIC(10,3)` greater than 0, `price` `NUMERIC(12,2)` not negative, optional `performer_id`, `version`.
  - `payment`: one payment per order (unique on `work_order_id`), `amount` greater than 0, `date`, `method` check (`CASH`, `CARD`, `TRANSFER`), `recorded_by_id`. `work_order_status_history`: `from_status`, `to_status` (checks), `employee_id`, `changed_at`, optional `comment`.
  - Every foreign key has `RESTRICT` and an index; indexes for the order list filters (status, intake date, customer, mechanic, vehicle).
  - Portability and convention tests from T-003 still pass and cover the new files; `./gradlew check` is green.
- **WHAT to read:** `docs/domain/entities.md`, `docs/domain/work-order-lifecycle.md`, `backend/CLAUDE.md`
- **Depends on:** T-003
- **Status:** pending
- **Notes:** No cascade delete anywhere: orders, payments and history are never deleted. Rules: `liquibase.md`, `money-time.md`, `aggregate.md` (to know which columns the aggregate needs).

### T-005 Seed: employees and price list
- **Area:** backend
- **Agent:** db-dev
- **Goal:** The seed changelog and CSV files for employees, services and parts, loaded in the `seed` context only.
- **Acceptance criteria:**
  - `seed/seed-changelog.yaml` (included last by the master) with one changeset per table, `context: seed`, `runOnChange: true`, `loadUpdateData` with `primaryKey: id` and explicit column types; fixed UUID v7 literal ids.
  - Employees: 2 managers (`manager1`, `manager2`), 5 mechanics plus the deactivated `mechanic6` (logins `mechanic1` to `mechanic6`), the BCrypt strength-10 hash of the development password from `seed-data.md`, logins lower case.
  - 25 services (2 inactive), 50 parts (3 inactive, purchase price lower than sale price), plausible for a Georgian station, prices in lari.
  - The portability test (H2, context `seed`) applies the seed and every seeded table has rows; no seed changeset without `context: seed`; the CSV files and the throwaway generator are not committed apart from the CSVs.
  - `./gradlew check` is green.
- **WHAT to read:** `docs/product/seed-data.md`, `docs/domain/entities.md`
- **Depends on:** T-004
- **Status:** pending
- **Notes:** Rules: `liquibase.md` (seed), `identifier.md`, `security.md` (hash). The password hash is created offline; no password is committed other than the documented development one in `seed-data.md`.

### T-006 Seed: customers and vehicles
- **Area:** backend
- **Agent:** db-dev
- **Goal:** Customers and vehicles in the seed with all the special cases listed in `seed-data.md`.
- **Acceptance criteria:**
  - 30 customers, every one with a phone; 10 without an email; 2 deleted (delete token equals own id); 3 without a vehicle; 5 with two vehicles. Emails lower case, trimmed.
  - 45 vehicles: 42 with a 17-character VIN, 3 with a non-standard VIN, VINs upper case; years from 1995 to the current year; 1 deleted; the owner of every vehicle exists; mileage set for most vehicles.
  - Live rows use the constant live token; uniqueness holds; the portability test shows rows in both tables.
  - `./gradlew check` is green.
- **WHAT to read:** `docs/product/seed-data.md`, `docs/domain/entities.md`
- **Depends on:** T-005
- **Status:** pending
- **Notes:** The vehicle mileage must later match the newest order mileage (seed rule 4): generate the customers and vehicles together with the orders' plan so that T-007 can set it correctly; if T-007 needs to change vehicle rows, it edits this CSV (the schema is not frozen).

### T-007 Seed: work orders and status history
- **Area:** backend
- **Agent:** db-dev
- **Goal:** About 60 orders in every status and the status history that leads to each of them.
- **Acceptance criteria:**
  - At least the counts of `seed-data.md`: 4 `APPOINTMENT` (3 for the generation day at different times), 3 `WORK_ORDER` (one without a mechanic), 6 `IN_PROGRESS`, 3 `ON_HOLD`, 3 `WAITING_FOR_PARTS`, 5 `READY`, 4 `PAID`, 25 `CLOSED` (over the previous six months), 5 `CANCELLED` (cancelled at different stages, each with a reason).
  - Every order has a customer, a vehicle of that customer (two orders belong to a former owner of a transferred vehicle), a problem description in plain words, an intake date, a responsible manager; from `IN_PROGRESS` on a responsible mechanic (role `MECHANIC`). An open order never refers to a deleted customer or vehicle or an inactive employee.
  - Status history: for every order the chain of transitions from `APPOINTMENT` to its status along allowed transitions of the lifecycle document, made by employees who may do them; rollbacks and cancellations carry a comment; the status of an order equals the target of its newest record.
  - Order mileage and vehicle mileage follow seed rule 4.
  - The portability test shows rows in `work_order` and `work_order_status_history`; `./gradlew check` is green.
- **WHAT to read:** `docs/product/seed-data.md`, `docs/domain/work-order-lifecycle.md`, `docs/domain/entities.md`, `docs/domain/operations.md`
- **Depends on:** T-006
- **Status:** pending
- **Notes:** The full consistency test comes with T-008 (it needs lines and payments). Dates are fixed in the files around the generation day.

### T-008 Seed: lines and payments, and the seed consistency test
- **Area:** backend
- **Agent:** db-dev
- **Goal:** Order lines and payments in the seed, and `SeedConsistencyTest` checking all consistency rules of `seed-data.md`.
- **Acceptance criteria:**
  - Lines: `APPOINTMENT` and `WORK_ORDER` orders may have none; `READY`, `PAID`, `CLOSED` orders have at least one; a mix of service and part lines, each referring to exactly one; some fractional quantities; varied performers (role `MECHANIC`); some line prices differ from the current price list (snapshots).
  - Payments: exactly one for every `PAID` and `CLOSED` order, equal to the order total (sum of quantity times price rounded per line), recorded by a manager, methods varied; one `READY` order has its payment; no other order and no cancelled order has one.
  - `SeedConsistencyTest` (Testcontainers PostgreSQL, context `seed`) checks the eight consistency rules; the allowed-transition table used by rule 1 is written in the test as literals taken from the lifecycle document, not imported from application code. A deliberately broken fixture proves at least one rule fails.
  - Portability test still green; `./gradlew check` is green.
- **WHAT to read:** `docs/product/seed-data.md`, `docs/domain/entities.md`, `docs/domain/work-order-lifecycle.md`
- **Depends on:** T-007
- **Status:** pending
- **Notes:** HUMAN GATE. This is the last schema and seed task. After it has passed review, the orchestrator STOPS and does not hand out T-009 or any later task until the human records "Schema frozen" in `docs/decisions.md`. Until then changelogs may be rewritten and the development database recreated (`docker compose down -v`).

### T-009 Backend: authentication and sessions
- **Area:** backend
- **Agent:** backend-dev
- **Goal:** Employees log in with a login and a password; the session is a JWT in an HttpOnly cookie; the `CurrentUser` port and the password policy exist for every later service.
- **Acceptance criteria:**
  - `POST /api/v1/auth/login`: success sets the cookie (`HttpOnly`, `SameSite=Strict`, `Max-Age` 43200) and returns `expiresAt` and the user (`id`, `fullName`, `role`); the login is compared in lower case. Unknown login and wrong password give the same 401 `error.invalid-credentials`; a right password for a deactivated employee gives 403 "Your account is deactivated. Ask a manager to activate it."; a wrong password never reveals the deactivation.
  - `POST /api/v1/auth/logout` clears the cookie; `GET /api/v1/auth/me` returns the current user; `PUT /api/v1/auth/password` changes the own password (wrong current password is the field error "Current password is incorrect").
  - Every `/api/v1/**` request except login needs a session; an expired, tampered or unknown-employee token gives 401; the same token gives 401 right after the employee is deactivated (the employee is loaded on every request; the role comes from the loaded employee).
  - `PasswordPolicy`: 10 to 72 bytes, a letter, a digit and a symbol; table test with literals. Passwords are BCrypt-hashed (strength 10) through the `PasswordHasher` port; no hash, password or token in a response or a log.
  - Tests: unit tests of the login service (unknown login, wrong password, deactivated, success); integration tests of the cookie attributes, expiry, tampering, deactivation, logout and the anonymous 401; ArchUnit that only `..auth.security..` depends on Spring Security.
  - `./gradlew check` is green.
- **WHAT to read:** `docs/domain/operations.md`, `docs/domain/entities.md` (Employee), `docs/product/screens.md` (Login, Change password), `docs/product/seed-data.md` (accounts)
- **Depends on:** T-008
- **Status:** pending
- **Notes:** Starts only after the human has recorded "Schema frozen" in `docs/decisions.md`. Rules: `security.md`, `service.md`, `exception.md`, `web.md`, `jpa-entity.md`, `repository.md`, `mapper.md`, `testing.md`. This task adds the `employee` JPA entity and port that T-010 extends. No login rate limiting (D-036).

### T-010 Backend: employees
- **Area:** backend
- **Agent:** backend-dev
- **Goal:** A manager manages employees: list, create with an initial password, edit, activate, deactivate and reset a password.
- **Acceptance criteria:**
  - Paginated list with filters (name or login text, role, `active`); create, `PUT /{id}`, `POST /{id}/activate`, `/deactivate`, `PUT /{id}/password` (reset); all of them `MANAGER` only, a `MECHANIC` gets 403 on each (test).
  - Validation per `entities.md` (required fields not blank, role is `MECHANIC` or `MANAGER`); the password policy applies to the initial password and to a reset; login is stored trimmed in lower case; a duplicate login gives 409 with `errors.login`.
  - A deactivated employee is not offered for new assignments but stays visible in old orders; `passwordHash` never appears in a response.
  - Tests: service unit tests with strict mocks (rights, duplicate, policy), mapper tests, `@WebMvcTest` slice, integration test of the repository adapter and the endpoints; `./gradlew check` is green.
- **WHAT to read:** `docs/domain/entities.md`, `docs/domain/operations.md`, `docs/product/screens.md` (Employees)
- **Depends on:** T-009
- **Status:** pending
- **Notes:** Rules: `service.md`, `repository.md`, `jpa-entity.md`, `mapper.md`, `pagination.md`, `web.md`, `security.md`, `testing.md`. A manager deactivating themselves is not addressed by the documents (Q-8).

### T-011 Backend: price list (services and parts)
- **Area:** backend
- **Agent:** backend-dev
- **Goal:** The price list of services (`ServiceItem`) and parts, readable by both roles and managed by managers.
- **Acceptance criteria:**
  - Paginated lists for services and for parts with a text filter and an `active` filter (inactive hidden by default); create, `PUT /{id}`, activate and deactivate for `MANAGER` only; `MECHANIC` reads (403 on changes, test).
  - Validation: prices not negative, required fields not blank, `standardHours` is a decimal; duplicate service `code` or part `sku` gives 409 with the field error "A service with this code already exists" style from `messages.properties`.
  - `Part.purchasePrice` is `null` in every response for a `MECHANIC` and present for a `MANAGER` (service-level test and endpoint test for both roles, list and single read).
  - Tests as in T-010; `./gradlew check` is green.
- **WHAT to read:** `docs/domain/entities.md` (ServiceItem, Part), `docs/domain/operations.md`, `docs/product/screens.md` (Price list)
- **Depends on:** T-009
- **Status:** pending
- **Notes:** Rules: `service.md` (field-level rights), `repository.md`, `jpa-entity.md`, `mapper.md`, `pagination.md`, `web.md`, `money-time.md`, `testing.md`. A `MECHANIC` must not be able to sort or filter by `purchasePrice` either (Q-9).

### T-012 Backend: customers
- **Area:** backend
- **Agent:** backend-dev
- **Goal:** Customers with soft delete, search and the data for the customer card.
- **Acceptance criteria:**
  - Paginated list filtered by text matching full name and phone; each row carries the number of vehicles; deleted customers never appear in a list; `GET /{id}` still returns a deleted customer (old orders read it).
  - Create, `PUT /{id}`, delete (204) for `MANAGER` only; `MECHANIC` can read (403 on changes, test).
  - Validation: full name and phone required, email optional and valid when present; email stored trimmed in lower case; a duplicate email among non-deleted customers gives 409 with `errors.email`; a customer without an email takes no part in the uniqueness; the same email can be reused after the first customer is deleted (test).
  - Tests as in T-010; `./gradlew check` is green.
- **WHAT to read:** `docs/domain/entities.md` (Customer, Uniqueness, Deletion), `docs/domain/operations.md`, `docs/product/screens.md` (Customers)
- **Depends on:** T-009
- **Status:** pending
- **Notes:** Rules: `jpa-entity.md` (delete token), `repository.md` (specification hides deleted), `service.md`, `pagination.md`, `web.md`, `testing.md`. NEEDS AN ANSWER to Q-3 before it starts: what happens when a customer that still has vehicles or open orders is deleted. Conservative default: reject with 409.

### T-013 Backend: vehicles
- **Area:** backend
- **Agent:** backend-dev
- **Goal:** Vehicles with soft delete, search, and the explicit change of owner.
- **Acceptance criteria:**
  - Paginated list filtered by text matching license plate and VIN, and by customer; rows carry the owner; deleted vehicles never appear in a list; `GET /{id}` still returns a deleted one.
  - Create, `PUT /{id}`, delete (204), `PUT /vehicles/{id}/owner` for `MANAGER` only; `MECHANIC` reads (403 on changes, test). A vehicle cannot be created for a deleted customer; the new owner cannot be a deleted customer.
  - Validation: `year` between 1900 and next calendar year, `mileage` not negative, VIN required with no fixed format, stored trimmed in upper case; a duplicate VIN among non-deleted vehicles gives 409 with `errors.vin`, also on a change of owner request that carries a VIN; license plate and customer phone are not unique.
  - Changing the owner does not touch existing orders (test at the repository level once orders exist is in T-015; here the owner changes and the vehicle history is unchanged).
  - Tests as in T-010; `./gradlew check` is green.
- **WHAT to read:** `docs/domain/entities.md` (Vehicle, Rules), `docs/domain/operations.md`, `docs/product/screens.md` (Vehicles)
- **Depends on:** T-012
- **Status:** pending
- **Notes:** Rules as in T-012. NEEDS AN ANSWER to Q-3 before it starts: deleting a vehicle with open orders. Conservative default: reject with 409.

### T-014 Backend: work order read side
- **Area:** backend
- **Agent:** backend-dev
- **Goal:** The work order aggregate as a domain record with its lines, its persistence, the filtered order list and the order card read.
- **Acceptance criteria:**
  - Domain records, JPA entities (order, order line), port and adapter per `aggregate.md`; the total is a method, not a column; version exposed.
  - `GET /api/v1/work-orders` paginated with filters: status (several), intake date range (a day becomes a range of instants in `Asia/Tbilisi`), customer, mechanic, vehicle. A `MANAGER` sees all orders; a `MECHANIC` sees only own orders (responsible mechanic or performer of at least one line); a filter cannot widen that (test with two mechanics).
  - A list row carries the order total, the customer, the vehicle and the mechanic; lines are loaded in batches: an integration test shows a bounded number of statements that does not grow with the number of orders.
  - `GET /{id}`: order with lines, total, version; an order that is not own is 404 for a `MECHANIC`; `Part` data inside lines never carries `purchasePrice`. Deleted customers, vehicles and inactive employees still read in old orders.
  - Tests: unit tests of the visibility rule, mapper tests, `@WebMvcTest`, integration tests with fixtures written through the ports; `./gradlew check` is green.
- **WHAT to read:** `docs/domain/entities.md` (WorkOrder, WorkOrderLine, Aggregates), `docs/domain/operations.md`, `docs/product/screens.md` (Orders, Order card)
- **Depends on:** T-010, T-011, T-013
- **Status:** pending
- **Notes:** Rules: `aggregate.md`, `structure.md`, `jpa-entity.md`, `repository.md`, `pagination.md`, `mapper.md`, `service.md`, `money-time.md`, `web.md`, `testing.md`. No transitions, payments or history reads here: the order response gets `transitions` in T-017, `cancellation` in T-018, payments in T-019. The mechanic's customer filter is Q-10.

### T-015 Backend: create an order and the section commands
- **Area:** backend
- **Agent:** backend-dev
- **Goal:** A manager creates orders; the info, the diagnostic notes and the responsible mechanic are changed by their own commands with the expected version.
- **Acceptance criteria:**
  - `POST /work-orders` (`MANAGER` only, 403 for a mechanic): creates the order in `APPOINTMENT` with the current user as responsible manager, the vehicle's current owner as `customer`, an intake date (default now), optional mileage, a required problem description and an optional mechanic; a deleted vehicle or customer, an inactive employee, or a mechanic who does not have the role `MECHANIC` is rejected with a field error; the vehicle must belong to the chosen customer.
  - `PUT /{id}/info` (problem description and mileage, `MANAGER` only), `PUT /{id}/diagnostic-notes` (responsible mechanic, line performers, `MANAGER`), `PUT /{id}/mechanic` (`MANAGER` only, active `MECHANIC`). Every command carries `version`; a stale version gives 409 `error.concurrent-update` and writes nothing; every command raises the root version by exactly one; each returns the whole order.
  - When an order's mileage is set, the vehicle's mileage becomes the same value (test). Mileage not negative.
  - The customer of an order never changes when the vehicle changes owner (test).
  - Tests: unit tests (rights per role and per own order, stale version, nothing written), integration tests of the version mechanism required by `aggregate.md`; `./gradlew check` is green.
- **WHAT to read:** `docs/domain/entities.md`, `docs/domain/operations.md`, `docs/product/screens.md` (New order, Order card: Info)
- **Depends on:** T-014
- **Status:** pending
- **Notes:** Rules: `aggregate.md`, `service.md`, `identifier.md`, `exception.md`, `testing.md`. Creation writes no history record: the initial status has no "from" (Q-11).

### T-016 Backend: order lines
- **Area:** backend
- **Agent:** backend-dev
- **Goal:** Add, change and remove lines of an order while it is editable.
- **Acceptance criteria:**
  - `POST /{id}/lines` adds a service or a part (exactly one of `serviceItemId` or `partId`; both or none is a validation error); the name and the unit price are copied from the price list and kept as a snapshot; quantity is greater than 0 and may be fractional; the performer defaults to the responsible mechanic and must have the role `MECHANIC`; an inactive item is rejected.
  - `PUT /{id}/lines/{lineId}` changes quantity and performer; `DELETE /{id}/lines/{lineId}` removes the row physically; each returns the whole order with the new version.
  - Allowed only while the status is `APPOINTMENT`, `WORK_ORDER`, `IN_PROGRESS`, `ON_HOLD` or `WAITING_FOR_PARTS`; in `READY`, `PAID`, `CLOSED` and `CANCELLED` the command is 409 `error.lines-locked` (test for every status).
  - A `MANAGER` edits lines of any order; a `MECHANIC` only of own orders (403/404 otherwise, test); stale version is 409.
  - A later price list change does not change an existing line (test). Line total is `quantity × price` rounded half up to two decimals; the order total is the sum (literal examples including a fractional quantity).
  - Tests: unit, mapper, `@WebMvcTest` and the integration tests of `aggregate.md` (removing a line deletes its row; a change of only a line raises the root version by one); `./gradlew check` is green.
- **WHAT to read:** `docs/domain/entities.md` (WorkOrderLine, Deletion, Rules), `docs/domain/operations.md`, `docs/product/screens.md` (Work and parts)
- **Depends on:** T-015, T-011
- **Status:** pending
- **Notes:** Rules: `aggregate.md`, `state-machine.md` (the single definition `linesEditable()`; the status enum is introduced here if T-014 did not), `money-time.md`, `service.md`.

### T-017 Backend: the transitions table and the available transitions
- **Area:** backend
- **Agent:** backend-dev
- **Goal:** All transition rules in one declarative table, and the order response lists the transitions the current user may use.
- **Acceptance criteria:**
  - `WorkOrderTransitions` has exactly one row per transition of the lifecycle document (the eleven rows, with row 5 as two transitions and row 10 as three), with roles, own-orders-only, primary, comment required, confirm and guards `MECHANIC_ASSIGNED`, `LINES_PRESENT`, `BALANCE_ZERO`, `NO_PAYMENT_RECORDED`; guard hints come from `messages.properties` ("Assign a mechanic", "Add at least one line", "Record the payment first", "A payment is already recorded").
  - The order response carries `transitions`: `id`, `primary`, `enabled`, `commentRequired`, `confirm`, `reasonCode`, `message`; transitions the user can never use are not returned (a mechanic never gets a rollback, a cancel, "Accept vehicle", "Mark paid" or "Close order"). A line performer gets the same options as the responsible mechanic.
  - Tests: the sorted list of row ids equals the literal list from the lifecycle document; a literal expectation for every status × role (manager, own mechanic, other mechanic) including `enabled` and the reason; every guard passes and fails; `./gradlew check` is green.
- **WHAT to read:** `docs/domain/work-order-lifecycle.md`, `docs/domain/operations.md`, `docs/product/screens.md` (Order card: Actions)
- **Depends on:** T-016
- **Status:** pending
- **Notes:** Rules: `state-machine.md` (the whole file), `aggregate.md`. The balance for `BALANCE_ZERO` comes from the payments port, which T-019 fills; here the context takes it from the port (an empty one is enough). ArchUnit: the table is used only by `WorkOrderServiceImpl`; guards do not depend on `..repository..`.

### T-018 Backend: perform a transition and the status history
- **Area:** backend
- **Agent:** backend-dev
- **Goal:** `POST /{id}/transitions` changes the status through the table, writes a history record, and the history and the cancellation reason can be read.
- **Acceptance criteria:**
  - The request carries `transition`, `version` and `comment`; success sets the new status, writes exactly one history record (from, to, user, `changedAt` from the injected clock, comment) in the same transaction and returns the whole order with its new options.
  - Failures: unknown id gives 400 `error.unknown-transition`; a row that does not start from the current status gives 409 `error.transition-not-available`; a user who may never use the row gives 403; a failing guard gives 409 with the guard's code and message; a blank required comment (rollback, cancel) gives 400 with `errors.comment`; a stale version gives 409. In every failure nothing is written.
  - A mechanic changes only own orders (responsible mechanic or line performer); cannot accept the vehicle, mark paid, close, roll back or cancel (tests per transition).
  - `GET /{id}/history` returns the records newest first, `MANAGER` for all orders and `MECHANIC` for own orders; for a cancelled order the order response carries `cancellation` (reason, user, time) taken from the cancelling record.
  - One test walks an order through the whole main chain `APPOINTMENT` to `CLOSED` (payment is faked at the port until T-019) and checks the history; another checks each rollback and the cancel from every allowed status.
  - ArchUnit: the status is changed nowhere but `transition(...)`; `./gradlew check` is green.
- **WHAT to read:** `docs/domain/work-order-lifecycle.md`, `docs/domain/operations.md`, `docs/product/screens.md` (Order card: Actions, History)
- **Depends on:** T-017
- **Status:** pending
- **Notes:** Rules: `state-machine.md`, `aggregate.md`, `exception.md`, `service.md`, `testing.md`. The history port is append-only (no update, no delete).

### T-019 Backend: payments
- **Area:** backend
- **Agent:** backend-dev
- **Goal:** A manager records the one full payment of an order in `READY`; the balance feeds the transitions.
- **Acceptance criteria:**
  - `POST /{id}/payments` (`MANAGER` only; 403 for a mechanic): allowed only in `READY`, once, with `amount` equal to the order total, a `method` (`CASH`, `CARD`, `TRANSFER`) and a date; the employee who records it is stored. It does not change the status and returns the whole order with the new version.
  - Rejections with a clear message: any other status, a second payment, an amount that differs from the total, a missing method, an order with a zero total (nothing to pay). Nothing is written on failure.
  - `GET /{id}/payments` lists the payments (visible to a mechanic for own orders, with amounts); the balance is total minus payments; "Mark paid" is enabled only when the balance is zero; with a zero total it is enabled without a payment.
  - While a payment exists, rollback and cancel are disabled with "A payment is already recorded" and rejected when forced (test); a payment cannot be changed or deleted (no endpoint; ArchUnit on the port).
  - Tests: unit, mapper, `@WebMvcTest`, integration; the full chain test of T-018 now uses the real payment; `./gradlew check` is green.
- **WHAT to read:** `docs/domain/entities.md` (Payment), `docs/domain/operations.md`, `docs/domain/work-order-lifecycle.md` (Rules), `docs/product/screens.md` (Payment)
- **Depends on:** T-018
- **Status:** pending
- **Notes:** Money: touches rights and amounts, so the reviewer checks it carefully. Rules: `aggregate.md`, `money-time.md`, `service.md`. Whether the date may lie in the future is Q-12.

### T-020 Backend: lists for Today, the board and My orders
- **Area:** backend
- **Agent:** backend-dev
- **Goal:** The list queries behind the Today screen, the board and the mechanic's tabs, with the transitions in the rows.
- **Acceptance criteria:**
  - Today's appointments: orders in `APPOINTMENT` whose intake date falls on today in `Asia/Tbilisi` (a day boundary test with instants just before and after midnight), ordered by time; awaiting pickup: orders in `READY`. Both `MANAGER` only through their filters; the rows carry vehicle, customer, phone, total.
  - The board is the same list endpoint called once per column (statuses filter); the waiting column is `ON_HOLD` and `WAITING_FOR_PARTS` together; `CLOSED` and `CANCELLED` are only in the table.
  - The mechanic's "Active" tab is `WORK_ORDER`, `IN_PROGRESS`, `ON_HOLD`, `WAITING_FOR_PARTS`, `READY` and "All" is all statuses, both limited to own orders; cards carry the problem description, intake date and the `transitions` of the user, loaded in batch (no N+1, an integration test counts statements).
  - Tests as in T-014; `./gradlew check` is green.
- **WHAT to read:** `docs/product/screens.md` (Today, Orders, My orders), `docs/domain/operations.md`
- **Depends on:** T-018
- **Status:** pending
- **Notes:** Prefer extending the filters of the T-014 endpoint over adding new endpoints; add one only if the screen needs it. Rules: `pagination.md`, `state-machine.md` (special cases), `money-time.md`.

### T-021 Backend: global search
- **Area:** backend
- **Agent:** backend-dev
- **Goal:** One search request returns customers and vehicles grouped.
- **Acceptance criteria:**
  - Its own feature `search`: a text query matches customers by full name and phone and vehicles by license plate and VIN; at most 5 results per group, unpaged, ignoring case; deleted records are not found.
  - Both roles can search; a blank or too short query gives an empty result or a validation error as the web rule says (stated in the report).
  - Tests: unit, `@WebMvcTest`, integration with fixtures; ArchUnit that the feature does not use another feature's `repository.jpa` or `web`; `./gradlew check` is green.
- **WHAT to read:** `docs/domain/entities.md` (Rules), `docs/product/screens.md` (Navigation)
- **Depends on:** T-013
- **Status:** pending
- **Notes:** Rules: `structure.md` (cross-feature), `web.md`, `pagination.md`.

### T-022 Backend: the contract file, security matrix and final architecture checks
- **Area:** backend
- **Agent:** backend-dev
- **Goal:** The OpenAPI document is generated and committed, and the rights are proven across all endpoints.
- **Acceptance criteria:**
  - An integration test writes the API document to `backend/openapi/openapi.json` and the file is committed; every response field is required or explicitly nullable; every operation lists its errors through `@ApiErrors`; Swagger UI and the document exist only in `dev` and `test`.
  - A role matrix test over all endpoints for anonymous, `MECHANIC` and `MANAGER` against `docs/domain/operations.md`: anonymous is always 401 (login excepted), forbidden operations are 403, own-order rules hold.
  - The complete ArchUnit set of the rules (layers, naming, no cycles between features, package-private `repository.jpa`, no `double` for money) is green.
  - `./gradlew check` is green and the repository builds from a clean clone.
- **WHAT to read:** `docs/domain/operations.md`, `backend/CLAUDE.md`, `docs/decisions.md` (D-032, D-045, D-046, D-048)
- **Depends on:** T-019, T-020, T-021
- **Status:** pending
- **Notes:** This is the contract the frontend generates its client from (T-023). Any later API change comes backend first, then the client is regenerated.

### T-023 Frontend: API client and shared modules
- **Area:** frontend
- **Agent:** frontend-dev
- **Goal:** The typed client generated from the contract, and the shared modules every screen uses.
- **Acceptance criteria:**
  - `npm run api:generate` reads `backend/openapi/openapi.json` and writes the types to `src/api/generated`; `openapi-fetch` is the one client for relative `/api/v1` calls; a 401 sends the user to the login route with "Session expired. Log in again."
  - `src/shared/format` is the only place that formats money (`1,250.00 ₾`), dates (`01.10.2026`) and date-times (`01.10.2026 10:30:15`) in `Asia/Tbilisi` from UTC strings; unit tests with literals, including a date across midnight.
  - `src/shared/strings` holds every user-visible text (messages and validation texts from `screens.md`); one helper maps the backend `errors` onto Ant Design form fields with `form.setFields` and shows `detail` of any other rejection as a toast.
  - Vitest with React Testing Library and MSW is set up with handlers typed from the generated schema; `npm run check` is green.
- **WHAT to read:** `docs/product/screens.md` (Messages and states), `docs/product/scope.md`, `frontend/CLAUDE.md`
- **Depends on:** T-002, T-022
- **Status:** pending
- **Notes:** Generated files are never edited by hand; query hooks are written per feature in the next tasks. No transition knowledge, no money arithmetic.

### T-024 Frontend: login, session, role navigation and change password
- **Area:** frontend
- **Agent:** frontend-dev
- **Goal:** A user logs in, sees the menu of the role, can change the password and log out.
- **Acceptance criteria:**
  - Login screen with login, password and "Log in"; errors "Invalid login or password", the deactivated-account message and "Session expired. Log in again."; no registration, no "forgot password". After login a manager goes to Today and a mechanic to My orders.
  - The current user comes from `GET /auth/me`; the sidebar shows Today, Orders, Customers, Vehicles, Price list, Employees for `MANAGER` and My orders, Vehicles for `MECHANIC`; the user menu shows name and role, "Change password", "Log out"; the forbidden page shows "No access".
  - Change password dialog with current, new, repeat and the hint "10 to 72 characters with a letter, a digit and a symbol"; backend field errors appear under the fields.
  - Component tests with MSW for login errors, redirects by role, menu items per role and the password dialog; touch targets at least 44 px; `npm run check` is green.
- **WHAT to read:** `docs/product/screens.md` (Navigation, Login, Change password), `docs/product/ui-style.md`, `docs/domain/operations.md`
- **Depends on:** T-023, T-009
- **Status:** pending
- **Notes:** The UI hides what the user cannot do; the backend enforces it. The report states what was checked in the browser.

### T-025 Frontend: employees
- **Area:** frontend
- **Agent:** frontend-dev
- **Goal:** The Employees screen for a manager.
- **Acceptance criteria:**
  - Table: full name, login, role, specialization, status; add (with initial password), edit, deactivate, activate, "Reset password"; deactivation and similar actions open the formal dialog of `screens.md`.
  - Backend errors (duplicate login, password policy) appear under the matching field; the screen is not reachable for a mechanic.
  - Component tests with MSW for the table, the form errors and the dialog; `npm run check` is green.
- **WHAT to read:** `docs/product/screens.md` (Employees, Dialogs), `docs/domain/operations.md`
- **Depends on:** T-024, T-010
- **Status:** pending
- **Notes:** Inactive records stay visible with "(inactive)" where they are shown in history.

### T-026 Frontend: price list
- **Area:** frontend
- **Agent:** frontend-dev
- **Goal:** The Price list screen for a manager.
- **Acceptance criteria:**
  - Tabs "Services" (code, name, standard hours, price) and "Parts" (SKU, name, purchase price, sale price); add, edit, deactivate, activate; the switch "Show inactive" is off by default.
  - Duplicate code or SKU appears under the field; money is shown as `1,250.00 ₾`.
  - Component tests with MSW; `npm run check` is green.
- **WHAT to read:** `docs/product/screens.md` (Price list), `docs/domain/entities.md`
- **Depends on:** T-024, T-011
- **Status:** pending
- **Notes:** The mechanic's read-only price list is only used inside order lines (T-033); there is no mechanic menu item for it.

### T-027 Frontend: customers
- **Area:** frontend
- **Agent:** frontend-dev
- **Goal:** The customer list and card.
- **Acceptance criteria:**
  - List: search by full name and phone, columns full name, phone, email, number of vehicles, "Nothing found" for an empty result; "New customer" for `MANAGER`.
  - Card: details with edit and delete (manager, formal dialog), the vehicles with "Add vehicle" (and "This customer has no vehicles yet"), the timeline of orders; a mechanic opens it read-only from an order.
  - Duplicate email appears under the field "A customer with this email already exists"; "(deleted)" mark where a deleted customer is shown in history.
  - Component tests with MSW; `npm run check` is green.
- **WHAT to read:** `docs/product/screens.md` (Customers, Dialogs, Messages), `docs/domain/entities.md`, `docs/domain/operations.md`
- **Depends on:** T-024, T-012
- **Status:** pending
- **Notes:** The order timeline reads the order list filtered by customer (T-014).

### T-028 Frontend: vehicles
- **Area:** frontend
- **Agent:** frontend-dev
- **Goal:** The vehicle list and card with the owner change.
- **Acceptance criteria:**
  - List: search by plate and VIN, columns plate, make, model, year, owner, mileage; "New vehicle" for `MANAGER`.
  - Card: details, owner with "Change owner" (manager, dialog with customer search), mileage, the table of orders, delete (manager, formal dialog); a mechanic sees it read-only.
  - Validation texts for the year and mileage, duplicate VIN under the field; a free-format VIN is accepted.
  - Component tests with MSW; `npm run check` is green.
- **WHAT to read:** `docs/product/screens.md` (Vehicles), `docs/domain/entities.md`, `docs/domain/operations.md`
- **Depends on:** T-027, T-013
- **Status:** pending
- **Notes:** None.

### T-029 Frontend: global search
- **Area:** frontend
- **Agent:** frontend-dev
- **Goal:** The search box in the top bar.
- **Acceptance criteria:**
  - Typing queries the search endpoint (with a short delay); results are grouped into customers (name, phone) and vehicles (plate, VIN, make, model); choosing a result opens its card; "Nothing found" for an empty result; both roles see it.
  - Component tests with MSW (grouping, navigation, empty result); `npm run check` is green.
- **WHAT to read:** `docs/product/screens.md` (Navigation)
- **Depends on:** T-027, T-028, T-021
- **Status:** pending
- **Notes:** None.

### T-030 Frontend: orders list and board
- **Area:** frontend
- **Agent:** frontend-dev
- **Goal:** The Orders screen with the table, the board and the filters.
- **Acceptance criteria:**
  - Switch "Table / Board" over the same filters (status multiple, intake date range, customer, mechanic, vehicle); the table opens on default; columns are status badge, vehicle (make, model, plate), customer, mechanic, intake date, total.
  - Badges use the colours of `ui-style.md` (one component, nine statuses, pill shape).
  - The board columns are Appointment, Accepted, In progress, Waiting (both pauses, each with its own badge), Ready, Paid; cards show vehicle, plate, customer, mechanic, total; cards cannot be dragged; `CLOSED` and `CANCELLED` are table only.
  - Component tests with MSW for filters, switch, the waiting column and the badges; `npm run check` is green.
- **WHAT to read:** `docs/product/screens.md` (Orders), `docs/product/ui-style.md`
- **Depends on:** T-028, T-025, T-020
- **Status:** pending
- **Notes:** The mechanic's variant of the list (My orders) is T-035.

### T-031 Frontend: new order
- **Area:** frontend
- **Agent:** frontend-dev
- **Goal:** The New order screen.
- **Acceptance criteria:**
  - Fields: customer (search by name or phone, or "New customer" in a dialog), vehicle (only the customer's vehicles, or "New vehicle" in a dialog), intake date and time (default now), mileage (optional), problem description, responsible mechanic (optional); "Create" opens the new order in `APPOINTMENT`.
  - Backend field errors appear under the fields; deleted and inactive records are not selectable; `MANAGER` only.
  - Component tests with MSW including creating a customer and a vehicle on the way; `npm run check` is green.
- **WHAT to read:** `docs/product/screens.md` (New order), `docs/domain/entities.md`
- **Depends on:** T-030, T-015
- **Status:** pending
- **Notes:** For a walk-in customer the manager presses "Accept vehicle" on the card right after (T-032).

### T-032 Frontend: order card — header, info, history and actions
- **Area:** frontend
- **Agent:** frontend-dev
- **Goal:** The order card shell with the transitions drawn from the backend.
- **Acceptance criteria:**
  - Header with breadcrumb, title (make, model, plate), the badge and the line "intake date · mileage · mechanic"; a cancelled order shows the banner with reason, user and time.
  - The buttons are exactly the `transitions` of the response: `primary` ones filled, others secondary, rollback and cancel in the "More" menu (danger outline for cancel); a not-enabled one is disabled with the backend `message` as the hint; `confirm` opens the formal dialog with the consequence text of `screens.md`; `commentRequired` makes the reason field required ("Enter a reason"). There is no status logic in the code (a test passes made-up transitions and sees them drawn).
  - The result of a command goes into the query cache with `setQueryData` and the lists are invalidated; the message "The order was changed by another user. Refresh the page." appears on a 409 conflict.
  - Info section with inline editing and "Save" (problem description and mileage for `MANAGER`; diagnostic notes for the responsible mechanic, performers and `MANAGER`); customer and vehicle links; mechanic assignment for `MANAGER`; history newest first.
  - Component tests with MSW for each kind of button, the dialogs, the conflict message and the rights-based editing; `npm run check` is green.
- **WHAT to read:** `docs/product/screens.md` (Order card, Dialogs, Messages), `docs/product/ui-style.md`, `docs/domain/operations.md`
- **Depends on:** T-030, T-018
- **Status:** pending
- **Notes:** Forbidden: any `if` on a status to decide a button. A `MECHANIC` sees the same card without the manager-only parts.

### T-033 Frontend: order card — work and parts
- **Area:** frontend
- **Agent:** frontend-dev
- **Goal:** The lines section.
- **Acceptance criteria:**
  - Columns position (with a small "service" or "part" label), quantity, price, performer, sum; the total below as returned by the backend (no arithmetic in the frontend).
  - "Add service" and "Add part" pick from the price list (inactive items are not offered); quantity 1; performer defaults to the responsible mechanic; edit and remove per row.
  - When the backend marks the lines as not editable (the order is from `READY` on), buttons and row actions are hidden and "Lines are locked" is shown; the decision uses the flag from the response, not the status.
  - `purchasePrice` never appears for a mechanic; the quantity error "Quantity must be greater than 0" shows under the field.
  - Component tests with MSW; `npm run check` is green.
- **WHAT to read:** `docs/product/screens.md` (Work and parts), `docs/domain/entities.md` (WorkOrderLine)
- **Depends on:** T-032, T-026
- **Status:** pending
- **Notes:** This task may need a flag such as `linesEditable` in the order response. If T-014 and T-016 did not add it, the worker stops and reports it (it is a backend change) and the task becomes `blocked` (Q-13).

### T-034 Frontend: order card — payment and print
- **Area:** frontend
- **Agent:** frontend-dev
- **Goal:** The payment section and the printed order.
- **Acceptance criteria:**
  - The Payment section from `READY`: total, paid, balance; "Record payment" for `MANAGER` opens a dialog with the amount prefilled with the total, a required method ("Cash", "Card", "Transfer"), a date (today) and the warning "A saved payment cannot be changed or cancelled."; after saving the payment is listed (amount, method, date, who recorded it).
  - "Print" calls `window.print()`; a print stylesheet hides the sidebar, buttons and history and keeps header, customer, vehicle, lines, total and payment.
  - Component tests with MSW for the dialog and the list; `npm run check` is green.
- **WHAT to read:** `docs/product/screens.md` (Payment, Order card)
- **Depends on:** T-032, T-019
- **Status:** pending
- **Notes:** The "Mark paid" hint "Record the payment first" comes from the backend.

### T-035 Frontend: Today and My orders
- **Area:** frontend
- **Agent:** frontend-dev
- **Goal:** The start screens of both roles.
- **Acceptance criteria:**
  - Today (`MANAGER`): "Today's appointments" by time (time, customer, vehicle, problem) with "Accept vehicle" and "Cancel" taken from the row's transitions; "Awaiting pickup" (vehicle, customer, phone, total) opens the order.
  - My orders (`MECHANIC`): tabs "Active" (default) and "All"; large cards with badge, vehicle and plate, problem description, intake date; one big button for the next action drawn from the transitions; one column, buttons at least 44 px high on a tablet and a phone width (test at narrow width).
  - Component tests with MSW; `npm run check` is green.
- **WHAT to read:** `docs/product/screens.md` (Today, My orders), `docs/product/ui-style.md`
- **Depends on:** T-032, T-020
- **Status:** pending
- **Notes:** Which transition is "the next action" is the `primary` flag from the backend, not a frontend rule.

### T-036 Frontend: browser tests — the manager's flow
- **Area:** frontend
- **Agent:** frontend-dev
- **Goal:** `npm run e2e` with Playwright on the seeded development stack and the first flow.
- **Acceptance criteria:**
  - Playwright is configured (not MCP); `npm run e2e` runs against the backend started with the `dev` profile and the seed; it is not part of `npm run check`.
  - Flow: the manager logs in, creates an order for a seeded customer and vehicle, accepts the vehicle, assigns a mechanic, starts work, adds a service and a part, marks ready, records the payment, marks paid, closes the order and sees the history.
  - The report says how the stack was started and what was checked in the UI; `npm run check` stays green.
- **WHAT to read:** `TASK.md` (flows), `docs/product/screens.md`, `docs/product/seed-data.md` (accounts)
- **Depends on:** T-034, T-035
- **Status:** pending
- **Notes:** The seed password is the documented development password. Tests must not depend on the generation day of the seed.

### T-037 Frontend: browser tests — the mechanic and the cancellation
- **Area:** frontend
- **Agent:** frontend-dev
- **Goal:** The two remaining flows of `TASK.md`.
- **Acceptance criteria:**
  - Mechanic flow: a mechanic logs in, sees only own orders in My orders, cannot open another mechanic's order, sees no price-list purchase price, starts work, adds a line and marks the order ready on a phone-sized viewport.
  - Cancellation flow: the manager cancels an order with a required reason, sees the banner and the history; the cancel button is disabled with the hint once a payment is recorded.
  - `npm run e2e` and `npm run check` are green.
- **WHAT to read:** `TASK.md`, `docs/domain/operations.md`, `docs/domain/work-order-lifecycle.md`
- **Depends on:** T-036
- **Status:** pending
- **Notes:** None.

## Assumptions
None yet. The orchestrator adds one line per assumption: the date, the task, the assumption, the reason.

## Questions
All questions of the first plan are answered by the human (2026-10-08). The answers are in `docs/decisions.md` (D-052 to D-059) and in `docs/`. The task texts above were written before the answers and are not updated yet: the planner updates them in `revise` mode. Until then, where a task text and the decisions disagree, the decisions win.

Answered:
- **Q-1.** The frontend rules do not exist and are not written now (a draft). Frontend tasks follow `frontend/CLAUDE.md`. Recorded in the Open list.
- **Q-2.** Docker Compose is not used (D-052). There is no `docker-compose.yml`. T-001, T-003 and T-008 drop the Docker parts and use H2 with the init script.
- **Q-3.** D-055: a customer with a non-deleted vehicle or an open order cannot be deleted; a vehicle with an open order cannot be deleted. Built with a guard port (`structure.md`), implemented in `vehicle` and `workorder`. T-012 declares the port; the implementations arrive with T-013 (vehicles) and T-014/T-015 (orders).
- **Q-4.** `screens.md` is agreed; "Mark ready" has one text (D-054).
- **Q-6.** Field lengths are chosen by `db-dev` and shown to the human at the "Schema frozen" stop.
- **Q-8.** D-056: an employee cannot deactivate themselves or change their own role; row locks protect two managers acting at once.
- **Q-10.** D-053: the customer filter exists for both roles.
- **Q-12.** D-057: the payment date is prefilled with today, can be changed, not later than today.
- **Q-13.** D-059: the order response carries `linesEditable`; T-014/T-016 have it as a criterion and T-033 uses it.
- **Q-14.** D-058: the responsible mechanic and a line performer are active `MECHANIC` employees.
- **Q-B.** D-059: each transition carries `label`, `targetStatus` and `group`.
- **Q-C.** D-058: a read of active mechanics (id and name), for both roles.

Accepted as written:
- **Q-5.** The nine badges are one component in T-030 (colours fixed by D-050).
- **Q-7.** `GET /auth/me` reads the role from the loaded employee (`security.md`).
- **Q-9.** A mechanic must not sort or filter by `purchasePrice` (T-011).
- **Q-11.** Creating an order writes no status history record; the history starts with the first transition.

Contradictions between files: none left. `docs/product/task.md` (the original assignment) mentions photos, a customer cabinet, an employee rate and an audit log; they are postponed or out of scope in `scope.md` and are not planned.

To do in `revise` mode (from `context/PLAN_REVIEW.md`): dependencies of T-036 and T-037; the 14 transition ids in T-017; a test performing every transition in T-018; splitting T-001, T-014 and T-032; a "too long" criterion; the delete dialog in T-026; a test of the seeded password hashes; one "not found" answer for a foreign order; HOW removed from tasks; and the work from D-055 to D-059 (guard port, self-deactivation and row locks, the payment date, the mechanics list, the transition fields).

## Changes
None yet. In `revise` mode the planner lists here what it changed after a review and why.

## Run summary
The orchestrator fills this in at the end of a run: what is done, what is blocked, the assumptions, what the human should check.
