---
paths:
  - "backend/src/main/resources/db/**"
  - "backend/src/main/resources/application*.yaml"
---

# Rule: Liquibase Changelogs

## Default

Unless explicitly overridden by the project specification:

- **What:** The schema and the seed data are defined only by Liquibase changelogs in YAML. They are database-agnostic:
  H2 is the database now (D-052), PostgreSQL may replace it later, and the changelogs must stay portable (see
  Verification).
- **When:** For every table, constraint, index and seed row.
- **Where:** `backend/src/main/resources/db/`

```text
db/
├── init/create-schema.sql           # CREATE SCHEMA IF NOT EXISTS repair_schema;
├── changelog/
│   ├── db.changelog-master.yaml
│   └── <table>-changelog.yaml       # one file per table
└── seed/
    ├── seed-changelog.yaml
    └── <table>.csv                  # one file per seeded table
```

- **How (files):**
    - One file per table. The file name is the table name with hyphens (`work-order-line-changelog.yaml` for
      `work_order_line`).
    - The master includes the table files in dependency order (a table after the tables it references) with
      `relativeToChangelogFile: true`, then the seed file the same way. The master is the only place that defines the
      order. It also holds the property `schema` (`repair_schema`).
    - A table file starts with the changeset that creates the table, then the changeset for its foreign keys and their
      indexes, then the changesets for unique and check constraints. A later change is a new changeset appended to the
      file. A changeset that needs a table from a file included later goes into the file of the later table: a fresh
      database runs the changesets in include order, an existing one runs only the new ones, and the two orders must
      agree.
    - A sequence that numbers the rows of a table is created by the first changeset of that table's file, before the
      table: id `create-<table>_<column>_seq-sequence` (for example `create-work_order_number_seq-sequence`). A
      sequence is not a table: it has no file of its own.
    - Changeset ids: `create-<table>-table`, `create-fk-and-index-<table>-<ref>`, `create-check-<table>-<column>`,
      `create-uk-<table>-<column>`, later `<verb>-<table>-<object>`. Table names keep their underscores.
    - `author` is the name of the agent that wrote the changeset (`db-dev`, as the schema and the seed are its work).
      Never a person's name or an email. Id, author and file path together identify a changeset: never change them.
- **How (names):** Every constraint and index has an explicit name: `pk_<table>`, `fk_<table>_<ref>`,
  `uk_<table>_<column>`, `idx_<table>_<column>`, `ck_<table>_<column>`. A unique constraint over several columns is
  named after the business column (`uk_customer_email` covers `email, delete_token`). The error response is built from
  these names (see the Exceptions rule).
- **How (columns):**
    - `id` is `uuid` without a default. `version` is `BIGINT NOT NULL` without a default. No `created_at` and no
      `updated_at` unless the specification asks for them.
    - A soft-deleted entity has `delete_token uuid NOT NULL` without a default. A deactivated entity has
      `active BOOLEAN NOT NULL`.
    - Strings are `VARCHAR(n)` with an explicit length, long texts too (a generous length, for example 4000), so that
      the column matches the `@Column(length)` of the entity. Money is `NUMERIC(12,2)` and a fractional quantity
      `NUMERIC(10,3)` (see the Money and Time rule). Instants are `TIMESTAMP WITH TIME ZONE`, dates are `DATE`.
    - `standardHours` is `NUMERIC(5,2)`; `year` and `mileage` are `INTEGER`. Check constraints (changeset
      `create-check-<table>-<column>`, name `ck_<table>_<column>`): `service_item.standard_hours` ≥ 0, `vehicle.year` ≥
      1900 (the upper bound moves with the calendar and is checked by the service), `vehicle.mileage` and
      `work_order.mileage` ≥ 0, `price`, `purchase_price`, `sale_price` ≥ 0, `quantity` > 0, `payment.amount` > 0.
      String lengths are chosen by `db-dev`, reported, and mirrored by `@Size` in the requests.
    - An enum is `VARCHAR(30)` with a check constraint `ck_<table>_<column>` that lists the values.
    - Every foreign key has `onDelete: RESTRICT`, `onUpdate: RESTRICT` and an index on its column.
    - A business number from a sequence (`work_order.number`) is `INTEGER NOT NULL` with the named unique constraint
      `uk_work_order_number` (orders are never deleted, so there is no delete token). The sequence is named
      `<table>_<column>_seq` (`work_order_number_seq`) and made with the structured change `createSequence`
      (`startValue` 1, `incrementBy` 1, no `schemaName`). The column has no default: the service assigns the value (see
      the Aggregates rule).
    - `work_order_status_history.from_status` is nullable (empty only in the creation record). Its check constraint
      lists the values; NULL passes a check, so the constraint stays as it is.
- **How (portability):** Only generic Liquibase types and plain SQL. A check constraint is a `sql` change with its own
  `rollback`, and its table is written as `${schema}.<table>`. Structured changes carry no `schemaName`: the schema is
  set once in the configuration.
- **How (schema):** The application creates the schema from the one script `db/init/create-schema.sql`: the H2 URL runs
  it with `INIT=RUNSCRIPT FROM 'classpath:db/init/create-schema.sql'`, for the application and for the tests alike.
  `spring.liquibase.default-schema` and `spring.jpa.properties.hibernate.default_schema` are both `repair_schema`. If
  PostgreSQL comes later, the same script is run by its init mechanism.
- **How (seed):**
    - `seed-changelog.yaml` has one changeset per table in dependency order, each with `context: seed`,
      `runOnChange: true` and `loadUpdateData` with `primaryKey: id`. The columns have explicit types (`UUID`, `STRING`,
      `NUMERIC`, `BOOLEAN`, `DATE`, `DATETIME`).
    - Ids are fixed UUID v7 literals (see the Entity Identifiers rule). A live soft-delete row holds the constant
      `00000000-0000-0000-0000-000000000000` in `delete_token`, a deleted row holds its own id.
    - What the seed contains is defined in `docs/product/seed-data.md`.
    - A seeded table with a sequence-numbered column has one more seed changeset after its data (`context: seed`,
      `runOnChange: true`): `dropSequence` and `createSequence` with a `startValue` above the highest seeded number
      (`work_order_number_seq`: seeded numbers 1001 and up, `startValue` 2001). So the first order created in
      development gets a number above the seeded ones. `db-dev` names the highest seeded number in the report. The
      development database is in memory, so recreating the sequence on a re-run loses nothing.
- **How (contexts):** Every profile sets `spring.liquibase.contexts` explicitly, because without a context Liquibase
  runs all changesets, the seed included: `dev` → `seed`, `test` → `test` (matches nothing), any other profile → `prod`.
- **How (freeze):** The schema and the seed are built first and shown to the human. Until the human records "Schema
  frozen" in `docs/decisions.md`, the changelogs may be rewritten, and the development database is recreated (restart
  the application: the development H2 database lives in memory). After the freeze an applied changeset is never edited:
  a change is a new changeset, on H2 too.

Example (a table file):

```yaml
databaseChangeLog:

  - changeSet:
      id: create-customer-table
      author: db-dev
      changes:
        - createTable:
            tableName: customer
            columns:
              - column:
                  name: id
                  type: uuid
                  constraints:
                    primaryKey: true
                    primaryKeyName: pk_customer
                    nullable: false
              - column:
                  name: email
                  type: VARCHAR(255)
                  constraints:
                    nullable: false
              - column:
                  name: delete_token
                  type: uuid
                  constraints:
                    nullable: false
              - column:
                  name: version
                  type: BIGINT
                  constraints:
                    nullable: false
        - addUniqueConstraint:
            tableName: customer
            columnNames: email, delete_token
            constraintName: uk_customer_email

  - changeSet:
      id: create-check-work_order-status
      author: db-dev
      changes:
        - sql:
            sql: >-
              ALTER TABLE ${schema}.work_order
              ADD CONSTRAINT ck_work_order_status
              CHECK (status IN ('APPOINTMENT', 'WORK_ORDER', 'IN_PROGRESS'));
      rollback:
        - sql:
            sql: >-
              ALTER TABLE ${schema}.work_order
              DROP CONSTRAINT ck_work_order_status;
```

Example (a seed changeset):

```yaml
  - changeSet:
      id: seed-employee
      author: db-dev
      context: seed
      runOnChange: true
      changes:
        - loadUpdateData:
            tableName: employee
            file: employee.csv
            relativeToChangelogFile: true
            primaryKey: id
            columns:
              - column:
                  name: id
                  type: UUID
              - column:
                  name: login
                  type: STRING
              # ... one entry for every column of the CSV
```

## Why

- One file per table keeps a table's history in one place. The ordering note above removes its one weak spot.
- Plain generic YAML runs on every database the course may ask for. A partial index, `now()` or `::` would not.
- Explicit constraint names make the error responses stable. A misspelled attribute silently loses the name, so a
  convention test reads the files.
- `context: seed` alone does not keep the seed out of an environment that sets no context.
- The schema is created by the environment because Liquibase needs it before its first changeset, and a script shared by
  three environments has one source of truth.
- Before the freeze a rewrite gives a clean schema (one `create` per table with its final columns). After it the rule is
  the usual one and works on every database.

## Exceptions

If the course requires PostgreSQL as the main database, add a profile for it. Then the whole integration suite must be
run on it first (Testcontainers), and the constraint-name normalization in the exception handler adapted if it reports
names differently. The changelogs stay as they are.

## Prohibitions

- No `schemaName` in a structured change and no hardcoded schema in raw SQL: use `${schema}`.
- No database-specific SQL: partial indexes, `gen_random_uuid()`, `now()`, `interval`, `ILIKE`, `::` casts, `dbms:`
  branches.
- No unnamed constraint or index, and no `unique: true` shorthand without a name.
- After the freeze: no edit of an applied changeset. At any time: no change of an id, an author or a file name after it
  was applied.
- No data in a schema changelog; no seed row outside the seed file; no seed changeset without `context: seed`.
- No profile without an explicit `spring.liquibase.contexts`.
- No default for `id`, `version` or `delete_token`.
- No empty list item in YAML (a lone `-`).

## Special Cases

- A join table of two ids has a composite primary key named `pk_<table>` and no `version` (see the Entity Identifiers
  rule).
- The seed changesets use `loadUpdateData`, so a changed CSV updates its rows when the changeset re-runs. A row removed
  from the CSV stays in the database until the development database is recreated.

## Infrastructure

- Spring Boot Liquibase support; `spring.liquibase.change-log=classpath:db/changelog/db.changelog-master.yaml`.
- `runtimeOnly 'com.h2database:h2'`.
- The H2 URL runs `db/init/create-schema.sql` (see How (schema)).

## Verification

- `ChangelogPortabilityTest` in `src/integrationTest`: H2 in memory, context `seed`; every changeset and the seed apply,
  and every seeded table has rows.
- `SeedConsistencyTest` (H2, context `seed`): the consistency rules of `docs/product/seed-data.md`.
- `ddl-auto=validate` passes on H2.
- Convention test over the YAML files: every `*-changelog.yaml` is included by the master; every constraint and index
  name starts with `pk_`, `fk_`, `uk_`, `idx_` or `ck_`; no id is repeated.
- Reviewer checklist: file-per-table, the include order, explicit names, a `rollback` on every `sql` change,
  `context: seed` on every seed changeset, no item from Prohibitions.
- `ChangelogPortabilityTest` (context `seed`): the next value of `work_order_number_seq` is greater than the highest
  seeded `work_order.number`; the sequence is created on H2 by `createSequence` only (no database-specific SQL).
