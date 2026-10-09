# Car Repair Station

## Project

Internal web CRM for one car service station. It replaces Excel and paper logs: customers, vehicles, work orders,
services, parts, payments. Users are employees only (`MANAGER`, `MECHANIC`); a customer is a record, not a user. All
work is recorded in the system, including walk-in customers and towed vehicles.

## Current phase: planning only

The project is in the discussion and planning phase. This section overrides every other instruction in this file, in
`backend/CLAUDE.md`, in `frontend/CLAUDE.md`, in the agent definitions and in `.claude/settings.json`. It stays in force
until the human removes it.

Forbidden until then:

- Fetching or installing anything for the application: `./gradlew`, `gradle`, `npm`, `npx`, `npm create`, downloads from
  Spring Initializr or similar services.
- Running, building or testing the application, including the gates `./gradlew check` and `npm run check`.
- Creating or changing anything in `backend/` and `frontend/` except their `CLAUDE.md`: build files, wrappers, configs,
  sources, changelogs, the OpenAPI file, the generated client, any generated code.
- Starting the `planner`, `db-dev`, `backend-dev`, `frontend-dev` and `orchestrator` agents and the `plan` and
  `evaluate-plan` skills. The `reviewer` runs only when the human asks.
- Creating new skills, connecting MCP servers or Context7, adding tools.

Allowed: reading files, answering questions, discussing the plan and the technical questions, and editing the files the
human names or permits.
The rules "a task is done only when the gate is green" and the workflow below apply after this section is removed. Git
(commits, pushes) is done by the human.

## Sources of truth (WHAT)

Read the relevant file before working on a task. Paths are in backticks on purpose: do not import them.

- `docs/product/scope.md` — what is in scope, postponed and out of scope. Read first.
- `docs/domain/entities.md` — entities, fields, types, uniqueness, deletion, validation.
- `docs/domain/work-order-lifecycle.md` — order statuses and who may move between them, with conditions.
- `docs/domain/operations.md` — what each role can do.
- `docs/product/screens.md` — screens, buttons, dialogs, messages.
- `docs/product/ui-style.md` — colors, shapes, status badges.
- `docs/product/seed-data.md` — the data the system starts with.
- `docs/product/original-requirements.md` — the original assignment; where it differs from the files above, they win.
- `TASK.md` (repository root) — the entry description of the product for the planner: flows, acceptance criteria,
  constraints. It summarizes the files above; where it differs from them, they win.
- `docs/decisions.md` — log of decisions and their reasons. Maintained by the human: read for context, do not edit.

## Working with requirements

- The files above are the human's decisions. Do not edit them without explicit permission.
- If a rule is missing or two files conflict, do not guess silently. Stop and report when the question touches the Open
  list in `docs/decisions.md`, anything postponed or out of scope, money, rights and roles, deleting data, or a schema
  change after "Schema frozen". Otherwise take the most conservative reading, continue, and list it as an assumption in
  your report; the orchestrator records it in `context/PLAN.md`.
- Do not implement anything listed as postponed or out of scope.
- If code and docs disagree, the docs win; report the mismatch.

## Invariants (never break; details are in the files above)

- Order statuses and transitions follow `docs/domain/work-order-lifecycle.md` and are checked in exactly one place.
- Orders, payments and status history are never deleted; order lines are removed only while the order is editable (never
  from `READY` on); customers and vehicles are soft-deleted; employees, service items and parts are deactivated.
- Order lines are read-only from `READY` on; line name and price are snapshots.
- A `MECHANIC` sees and changes only own orders; `Part.purchasePrice` is visible to `MANAGER` only.
- The frontend contains no transition rules; it draws the transitions the backend returns, with their `enabled` flag and
  message.
- UI language is English; amounts are shown with `₾`.
- A `CLOSED` or `CANCELLED` order is read-only in every respect (lines, description, mileage, notes, mechanic):
  `docs/domain/operations.md`.

## Stack and conventions (HOW)

### Stack and versions

- Backend: Java 25, Spring Boot 4, Gradle, H2, Liquibase. Details: `backend/CLAUDE.md`.
- Frontend: React, TypeScript, Vite, Ant Design 6. Details: `frontend/CLAUDE.md`.
- Local infrastructure: none. The backend and the frontend run locally; the database is H2 (D-052). PostgreSQL may come
  later.
- Exact versions are pinned in the build files. Change them only on request.

### Build, run and test commands

<!-- Commands become real when the build templates exist. Keep the names stable. -->

- Backend, from `backend/`: `./gradlew check` is the single gate (unit tests, integration tests, ArchUnit, formatting).
  Also `./gradlew test`, `./gradlew integrationTest`, `./gradlew bootRun`.
- Frontend, from `frontend/`: `npm run check` is the single gate (typecheck, lint, tests, build). Also `npm run dev`.
- Local database: none to start; the backend creates the H2 database itself.

- A task is done only when the gate of its area is green.

### Architecture

- Monorepo: `backend/`, `frontend/`, `docs/`. The two areas talk only through the HTTP API.
- The backend OpenAPI specification is the contract. The frontend client is generated from it, never written by hand.
  API changes go backend first, then the client is regenerated.
- Backend: package-by-feature with ports and adapters. Frontend: feature folders that mirror backend features. Details
  are in each area's `CLAUDE.md`.

### Code rules

- Rules live in `.claude/rules/backend/` (ready) and `.claude/rules/frontend/` (ready). Claude Code loads a rule by
  itself only after it reads a file the rule applies to, and a new area has no such files yet. So before writing or
  changing code in an area, read every file in its rules folder.
- Every rule starts with "unless explicitly overridden by the project specification". The specification is the files
  under "Sources of truth". Where it speaks, it wins over the rules.
- If a rule cannot be followed without breaking the specification, stop and report. Do not bend either of them.
- Tests are part of the task, not a follow-up.

### Workflow: plan and progress

- `context/PLAN.md` is the single plan and progress file (the review of the plan is `context/PLAN_REVIEW.md`; the
  product description for the planner is `TASK.md`). The `planner` writes the task list; the orchestrator owns statuses,
  assumptions and the run summary. Workers report their result in the final message and the orchestrator records the
  status. These files in `context/` are the only ones agents edit besides their own area.
- A task belongs to exactly one area, and one worker can finish it in one session. A feature that touches both areas is
  split into tasks, backend first. Fields: id, title, area (`backend` or `frontend`), agent (`db-dev`, `backend-dev` or
  `frontend-dev`), goal, acceptance criteria, WHAT files to read, depends on (task ids), status (`pending`, `doing`,
  `review`, `done`, `blocked`), notes.
- A task states WHAT only. HOW is never copied into tasks: it comes from the area's rules folder
  (`.claude/rules/<area>/`).
- Flow: the `plan` skill starts the planner, which writes the tasks to `context/PLAN.md`; the `evaluate-plan` skill
  checks the plan against `TASK.md` and `docs/` and writes `context/PLAN_REVIEW.md` with a verdict (`READY`,
  `READY WITH MINOR CHANGES`, `REVISE BEFORE IMPLEMENTATION`); the planner in `revise` mode updates the plan from the
  findings → the human confirms the plan → the orchestrator hands one task to the worker of its area → the worker
  implements, runs the gate and reports `review` → the reviewer checks the result against acceptance criteria and
  rules → blocking findings go back to the worker for at most two review rounds; if blocking findings remain, the task
  becomes `blocked`, otherwise it is `done`. After the last task the reviewer reviews the whole run once.
- The schema and the seed come first (`db-dev`). When they have passed review, the orchestrator stops until the human
  records "Schema frozen" in `docs/decisions.md`.
- A worker edits only its own area. If a task needs the other area or a change in `docs/`, it stops and reports, and the
  task becomes `blocked`.

### Agents

Definitions live in `.claude/agents/`; skills in `.claude/skills/` (`plan`, `evaluate-plan`). A run starts with
`claude --agent orchestrator`. Tasks run one at a time, never in parallel.

- `orchestrator` (Sonnet 5.5, the main session): reads the plan, delegates, tracks status and writes the statuses,
  assumptions and run summary in `context/PLAN.md`. It has no shell and does not write application code.
- `planner` (Sonnet 5.5): reads the requirements and writes only `context/PLAN.md`. Mode `plan` turns `TASK.md` and the
  WHAT files into tasks with acceptance criteria; mode `revise` updates the plan from `context/PLAN_REVIEW.md` and lists
  the changes. A subagent cannot ask the human, so it returns missing or contradictory requirements to the orchestrator,
  who asks.
- `db-dev` (Sonnet 5.5): the schema and the seed: Liquibase changelogs, CSV files and their tests. It is the author of
  the changesets.
- `backend-dev`, `frontend-dev` (Sonnet 5.5): implement one task in their area. Start by reading the task, the WHAT
  files it references, the area's `CLAUDE.md` and every file in its rules folder.
- `reviewer` (Sonnet 5.5, high effort): read-only. Runs the gate, checks acceptance criteria and rules, reports each
  finding as `[blocking]`, `[suggestion]` or `[nit]`. In "Plan review" mode it compares the plan with `TASK.md` and
  `docs/` and returns findings and a verdict; the `evaluate-plan` skill saves them.
- Agents never commit or push. `.claude/settings.json` denies edits to the human's files (`docs/domain/`,
  `docs/product/`, `docs/decisions.md`, `.claude/rules/`, `.claude/agents/`). The deny rules cover the file tools, not
  shell commands: never write those files from the shell either.
