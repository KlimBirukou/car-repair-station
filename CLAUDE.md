# Car Repair Station

## Project
Internal web CRM for one car service station. It replaces Excel and paper logs: customers, vehicles, work orders, services, parts, payments. Users are employees only (`MANAGER`, `MECHANIC`); a customer is a record, not a user. All work is recorded in the system, including walk-in customers and towed vehicles.

## Sources of truth (WHAT)
Read the relevant file before working on a task. Paths are in backticks on purpose: do not import them.
- `docs/product/scope.md` — what is in scope, postponed and out of scope. Read first.
- `docs/domain/entities.md` — entities, fields, types, uniqueness, deletion, validation.
- `docs/domain/work-order-lifecycle.md` — order statuses and who may move between them, with conditions.
- `docs/domain/operations.md` — what each role can do.
- `docs/product/screens.md` — screens, buttons, dialogs, messages.
- `docs/product/ui-style.md` — colors, shapes, status badges.
- `docs/product/seed-data.md` — the data the system starts with.
- `docs/product/task.md` — the original assignment; where it differs from the files above, they win.
- `docs/decisions.md` — log of decisions and their reasons. Maintained by the human: read for context, do not edit.

## Working with requirements
- The files above are the human's decisions. Do not edit them without explicit permission.
- If a rule is missing or two files conflict, do not guess silently. Stop and report when the question touches the Open list in `docs/decisions.md`, anything postponed or out of scope, money, rights and roles, deleting data, or a schema change after "Schema frozen". Otherwise take the most conservative reading, continue, and list it as an assumption in your report; the orchestrator records it in `docs/plan.md`.
- Do not implement anything listed as postponed or out of scope.
- If code and docs disagree, the docs win; report the mismatch.

## Invariants (never break; details are in the files above)
- Order statuses and transitions follow `docs/domain/work-order-lifecycle.md` and are checked in exactly one place.
- Orders, payments and status history are never deleted; order lines are removed only while the order is editable (never from `READY` on); customers and vehicles are soft-deleted; employees, service items and parts are deactivated.
- Order lines are read-only from `READY` on; line name and price are snapshots.
- A `MECHANIC` sees and changes only own orders; `Part.purchasePrice` is visible to `MANAGER` only.
- The frontend contains no transition rules; it draws the transitions the backend returns, with their `enabled` flag and message.
- UI language is English; amounts are shown with `₾`.

## Stack and conventions (HOW)

### Stack and versions
- Backend: Java 25, Spring Boot 4, Gradle, PostgreSQL, Liquibase. Details: `backend/CLAUDE.md`.
- Frontend: React, TypeScript, Vite, Ant Design 6. Details: `frontend/CLAUDE.md`.
- Local infrastructure: Docker Compose (PostgreSQL).
- Exact versions are pinned in the build files. Change them only on request.

### Build, run and test commands
<!-- Commands become real when the build templates exist. Keep the names stable. -->
- Backend, from `backend/`: `./gradlew check` is the single gate (unit tests, integration tests, ArchUnit, formatting). Also `./gradlew test`, `./gradlew integrationTest`, `./gradlew bootRun`.
- Frontend, from `frontend/`: `npm run check` is the single gate (typecheck, lint, tests, build). Also `npm run dev`.
- Local database: `docker compose up -d`.
- A task is done only when the gate of its area is green.

### Architecture
- Monorepo: `backend/`, `frontend/`, `docs/`. The two areas talk only through the HTTP API.
- The backend OpenAPI specification is the contract. The frontend client is generated from it, never written by hand. API changes go backend first, then the client is regenerated.
- Backend: package-by-feature with ports and adapters. Frontend: feature folders that mirror backend features. Details are in each area's `CLAUDE.md`.

### Code rules
- Rules live in `.claude/rules/backend/` (ready) and `.claude/rules/frontend/` (not written yet; follow `frontend/CLAUDE.md` until then). Claude Code loads a rule by itself only after it reads a file the rule applies to, and a new area has no such files yet. So before writing or changing code in an area, read every file in its rules folder.
- Every rule starts with "unless explicitly overridden by the project specification". The specification is the files under "Sources of truth". Where it speaks, it wins over the rules.
- If a rule cannot be followed without breaking the specification, stop and report. Do not bend either of them.
- Tests are part of the task, not a follow-up.

### Workflow: plan and progress
- `docs/plan.md` is the single plan and progress file. It is the only file under `docs/` that agents edit, and only the orchestrator writes it: workers report their result in the final message and the orchestrator records the status.
- A task belongs to exactly one area, and one worker can finish it in one session. A feature that touches both areas is split into tasks, backend first. Fields: id, title, area (`backend` or `frontend`), agent (`db-dev`, `backend-dev` or `frontend-dev`), goal, acceptance criteria, WHAT files to read, depends on (task ids), status (`todo`, `doing`, `review`, `done`, `blocked`), notes.
- A task states WHAT only. HOW is never copied into tasks: it comes from the area's rules folder (`.claude/rules/<area>/`).
- Flow: the planner proposes or refines tasks and the orchestrator records them in `docs/plan.md` → the orchestrator hands one task to the worker of its area → the worker implements, runs the gate and reports `review` → the reviewer checks the result against acceptance criteria and rules → blocking findings go back to the worker for at most two review rounds; if blocking findings remain, the task becomes `blocked`, otherwise it is `done`. After the last task the reviewer reviews the whole run once.
- The schema and the seed come first (`db-dev`). When they have passed review, the orchestrator stops until the human records "Schema frozen" in `docs/decisions.md`.
- A worker edits only its own area. If a task needs the other area or a change in `docs/`, it stops and reports, and the task becomes `blocked`.

### Agents
Definitions live in `.claude/agents/`. A run starts with `claude --agent orchestrator`. Tasks run one at a time, never in parallel.
- `orchestrator` (Sonnet 5.5, the main session): reads the plan, delegates, tracks status and writes `docs/plan.md`. It has no shell and does not write application code.
- `planner` (Sonnet 5.5): read-only. Turns the WHAT files into tasks with acceptance criteria. A subagent cannot ask the human, so it returns missing or contradictory requirements to the orchestrator, who asks.
- `db-dev` (Sonnet 5.5): the schema and the seed: Liquibase changelogs, CSV files and their tests. It is the author of the changesets.
- `backend-dev`, `frontend-dev` (Sonnet 5.5): implement one task in their area. Start by reading the task, the WHAT files it references, the area's `CLAUDE.md` and every file in its rules folder.
- `reviewer` (Sonnet 5.5, high effort): read-only. Runs the gate, checks acceptance criteria and rules, reports each finding as `[blocking]`, `[suggestion]` or `[nit]`.
- Agents never commit or push. `.claude/settings.json` denies edits to the human's files (`docs/domain/`, `docs/product/`, `docs/decisions.md`, `.claude/rules/`, `.claude/agents/`). The deny rules cover the file tools, not shell commands: never write those files from the shell either.
