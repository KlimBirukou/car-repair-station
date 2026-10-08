---
paths:
  - "backend/src/main/resources/db/**"
  - "backend/src/main/resources/application*.yaml"
---
# Rule: Liquibase Changelogs

## Default
Unless explicitly overridden by the project specification:

- **What:** The schema and the seed data are defined only by Liquibase changelogs in YAML. They are database-agnostic: PostgreSQL is the main database, and H2 checks the portability (see Verification).
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
    - One file per table. The file name is the table name with hyphens (`work-order-line-changelog.yaml` for `work_order_line`).
    - The master includes the table files in dependency order (a table after the tables it references) with `relativeToChangelogFile: true`, then the seed file the same way. The master is the only place that defines the order. It also holds the property `schema` (`repair_schema`).
    - A table file starts with the changeset that creates the table, then the changeset for its foreign keys and their indexes, then the changesets for unique and check constraints. A later change is a new changeset appended to the file. A changeset that needs a table from a file included later goes into the file of the later table: a fresh database runs the changesets in include order, an existing one runs only the new ones, and the two orders must agree.
    - Changeset ids: `create-<table>-table`, `create-fk-and-index-<table>-<ref>`, `create-check-<table>-<column>`, `create-uk-<table>-<column>`, later `<verb>-<table>-<object>`. Table names keep their underscores.
    - `author` is the name of the agent that wrote the changeset (`db-dev`, as the schema and the seed are its work). Never a person's name or an email. Id, author and file path together identify a changeset: never change them.
- **How (names):** Every constraint and index has an explicit name: `pk_<table>`, `fk_<table>_<ref>`, `uk_<table>_<column>`, `idx_<table>_<column>`, `ck_<table>_<column>`. A unique constraint over several columns is named after the business column (`uk_customer_email` covers `email, delete_token`). The error response is built from these names (see the Exceptions rule).
- **How (columns):**
    - `id` is `uuid` without a default. `version` is `BIGINT NOT NULL` without a default. No `created_at` and no `updated_at` unless the specification asks for them.
    - A soft-deleted entity has `delete_token uuid NOT NULL` without a default. A deactivated entity has `active BOOLEAN NOT NULL`.
    - Strings are `VARCHAR(n)` with an explicit length, long texts too (a generous length, for example 4000), so that the column matches the `@Column(length)` of the entity. Money is `NUMERIC(12,2)` and a fractional quantity `NUMERIC(10,3)` (see the Money and Time rule). Instants are `TIMESTAMP WITH TIME ZONE`, dates are `DATE`.
    - An enum is `VARCHAR(30)` with a check constraint `ck_<table>_<column>` that lists the values.
    - Every foreign key has `onDelete: RESTRICT`, `onUpdate: RESTRICT` and an index on its column.
- **How (portability):** Only generic Liquibase types and plain SQL. A check constraint is a `sql` change with its own `rollback`, and its table is written as `${schema}.<table>`. Structured changes carry no `schemaName`: the schema is set once in the configuration.
- **How (schema):** The environment creates the schema from the one script `db/init/create-schema.sql`: Docker Compose mounts it into the PostgreSQL init directory, Testcontainers runs it with `withInitScript`, and the H2 URL runs it with `INIT=RUNSCRIPT FROM 'classpath:db/init/create-schema.sql'`. `spring.liquibase.default-schema` and `spring.jpa.properties.hibernate.default_schema` are both `repair_schema`.
- **How (seed):**
    - `seed-changelog.yaml` has one changeset per table in dependency order, each with `context: seed`, `runOnChange: true` and `loadUpdateData` with `primaryKey: id`. The columns have explicit types (`UUID`, `STRING`, `NUMERIC`, `BOOLEAN`, `DATE`, `DATETIME`).
    - Ids are fixed UUID v7 literals (see the Entity Identifiers rule). A live soft-delete row holds the constant `00000000-0000-0000-0000-000000000000` in `delete_token`, a deleted row holds its own id.
    - What the seed contains is defined in `docs/product/seed-data.md`.
- **How (contexts):** Every profile sets `spring.liquibase.contexts` explicitly, because without a context Liquibase runs all changesets, the seed included: `dev` → `seed`, `test` → `test` (matches nothing), any other profile → `prod`.
- **How (freeze):** The schema and the seed are built first and shown to the human. Until the human records "Schema frozen" in `docs/decisions.md`, the changelogs may be rewritten, and the development database is recreated (`docker compose down -v`). After the freeze an applied changeset is never edited: a change is a new changeset, on H2 too.

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
- Explicit constraint names make the error responses stable. A misspelled attribute silently loses the name, so a convention test reads the files.
- `context: seed` alone does not keep the seed out of an environment that sets no context.
- The schema is created by the environment because Liquibase needs it before its first changeset, and a script shared by three environments has one source of truth.
- Before the freeze a rewrite gives a clean schema (one `create` per table with its final columns). After it the rule is the usual one and works on every database.

## Exceptions
If the course requires H2 as the main database, switch the profile. Then the whole integration suite must be run on H2 first, and the constraint-name normalization in the exception handler adapted if H2 reports names differently. The changelogs stay as they are.

## Prohibitions
- No `schemaName` in a structured change and no hardcoded schema in raw SQL: use `${schema}`.
- No database-specific SQL: partial indexes, `gen_random_uuid()`, `now()`, `interval`, `ILIKE`, `::` casts, `dbms:` branches.
- No unnamed constraint or index, and no `unique: true` shorthand without a name.
- After the freeze: no edit of an applied changeset. At any time: no change of an id, an author or a file name after it was applied.
- No data in a schema changelog; no seed row outside the seed file; no seed changeset without `context: seed`.
- No profile without an explicit `spring.liquibase.contexts`.
- No default for `id`, `version` or `delete_token`.
- No empty list item in YAML (a lone `-`).

## Special Cases
- A join table of two ids has a composite primary key named `pk_<table>` and no `version` (see the Entity Identifiers rule).
- The seed changesets use `loadUpdateData`, so a changed CSV updates its rows when the changeset re-runs. A row removed from the CSV stays in the database until the development database is recreated.

## Infrastructure
- Spring Boot Liquibase support; `spring.liquibase.change-log=classpath:db/changelog/db.changelog-master.yaml`.
- `testRuntimeOnly 'com.h2database:h2'` for the portability test.
- Docker Compose mounts `db/init/create-schema.sql` into the PostgreSQL image's init directory.

## Verification
- `ChangelogPortabilityTest` in `src/integrationTest`: H2 in memory, context `seed`; every changeset and the seed apply, and every seeded table has rows.
- `SeedConsistencyTest` (Testcontainers, context `seed`): the consistency rules of `docs/product/seed-data.md`.
- `ddl-auto=validate` passes on PostgreSQL.
- Convention test over the YAML files: every `*-changelog.yaml` is included by the master; every constraint and index name starts with `pk_`, `fk_`, `uk_`, `idx_` or `ck_`; no id is repeated.
- Reviewer checklist: file-per-table, the include order, explicit names, a `rollback` on every `sql` change, `context: seed` on every seed changeset, no item from Prohibitions.
