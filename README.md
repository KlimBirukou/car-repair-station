# Car Repair Station

An internal web CRM for one car service station. It replaces Excel and paper logs. It keeps customers, vehicles, work orders, services, parts and payments in one place, and it keeps the full history of every vehicle.

The users are employees only: managers and mechanics. A customer is a record in the system, not a user.

This is a learning project. The application is built by AI agents from written requirements. A human makes the decisions and reviews the results.

## Current status

The project is in the **planning phase**. There is no application code yet.

| Area | State |
|---|---|
| Product requirements (`docs/`) | Written and agreed |
| Backend code rules (`.claude/rules/backend/`) | Written (15 files) |
| Frontend code rules (`.claude/rules/frontend/`) | Not written. The folder is empty; `frontend/CLAUDE.md` is the rule set for now |
| Agents (`.claude/agents/`) | 6 agents defined |
| Skills (`.claude/skills/`) | 2 skills: `plan` and `evaluate-plan` |
| MCP servers, other skills, extra tools | Not added yet |
| Task plan (`context/PLAN.md`) | First draft with 37 tasks, **out of date** (see below) |
| `backend/` and `frontend/` | Only a `CLAUDE.md` file each |

While the project is in this phase, agents are not allowed to install anything, build, run, or create files in `backend/` or `frontend/`. The rule is at the top of [CLAUDE.md](CLAUDE.md).

**Known issue: the plan is out of date.** `context/PLAN.md` was written before the last decisions (D-052 to D-059). It still uses PostgreSQL, Docker Compose and Testcontainers, and it misses several new rules. The review in [context/PLAN_REVIEW.md](context/PLAN_REVIEW.md) gave the verdict `REVISE BEFORE IMPLEMENTATION`. The plan must be revised before any code is generated. The list of needed changes is at the end of the "Questions" section of the plan.

## The product in short

### Roles
- **Manager** works on a desktop. Manages customers, vehicles, employees and the price list. Creates orders, assigns mechanics, records payments, moves orders through every status, rolls back and cancels. Can do everything a mechanic can.
- **Mechanic** works on a tablet or a phone. Sees and changes only own orders. Edits order lines and diagnostic notes. Moves own orders between working statuses.

A mechanic never sees the purchase price of a part.

### Main flows
1. Log in (a session lasts 12 hours).
2. A manager takes an order from appointment to closing: accept the vehicle, assign a mechanic, start work, add services and parts, mark ready, record the payment, mark paid, close.
3. A walk-in customer gets an order that is accepted right away.
4. A mechanic opens an own order, adds lines and notes, puts the order on hold, resumes and marks it ready.
5. A manager cancels an order or returns it one step back. A reason is required. A recorded payment blocks both.
6. A manager maintains the price list and the employees.
7. Search customers and vehicles. Customer and vehicle cards show the order history.
8. If two people change the same order, the stale change is rejected with a clear message.
9. An order card can be printed. The printed card is the invoice.

### Order lifecycle

```
APPOINTMENT -> WORK_ORDER -> IN_PROGRESS -> READY -> PAID -> CLOSED
                                 |  ^
                                 v  |
                      ON_HOLD <-> WAITING_FOR_PARTS

Cancel: from any status before PAID, if no payment exists.
Rollback: one step back, manager only, reason required.
```

There are 9 statuses and 11 transition rules. The backend checks them in exactly one place. The frontend has no transition rules: it draws the buttons that the backend returns. Order lines are editable only before `READY`.

Details: [work-order-lifecycle.md](docs/domain/work-order-lifecycle.md).

### Not in scope
Customer accounts, a separate invoice entity, stock accounting, employee rates, partial payments and refunds, payment system integration, audit of amount changes. Photos and a customer cabinet are postponed. Full list: [scope.md](docs/product/scope.md).

### Technology
- Backend: Java 25, Spring Boot 4, Gradle, H2, Liquibase.
- Frontend: React, TypeScript, Vite, Ant Design 6.
- The backend publishes an OpenAPI file. The frontend client is generated from it. The two parts talk only through the HTTP API under `/api/v1`.
- The interface is in English. Amounts are shown with `₾`.

## Repository structure

```
car-repair-station/
├── CLAUDE.md          Main instructions for the agents
├── TASK.md            Entry description of the product for the planner
├── docs/
│   ├── decisions.md   Log of the human's decisions with reasons
│   ├── domain/        Entities, order lifecycle, roles and rights
│   └── product/       Scope, screens, UI style, seed data, original assignment
├── .claude/
│   ├── agents/        The 6 agent definitions
│   ├── rules/         Code rules (backend ready, frontend empty)
│   ├── skills/        plan, evaluate-plan
│   └── settings.json  Permissions for agents
├── context/
│   ├── PLAN.md        Task list and progress
│   └── PLAN_REVIEW.md Review of the plan
├── backend/           Only CLAUDE.md so far
└── frontend/          Only CLAUDE.md so far
```

| File | What it is for |
|---|---|
| [TASK.md](TASK.md) | Short description of the product, flows and acceptance criteria |
| [docs/product/scope.md](docs/product/scope.md) | What is in scope, postponed and out of scope. Read first |
| [docs/domain/entities.md](docs/domain/entities.md) | Entities, fields, uniqueness, deletion, validation |
| [docs/domain/work-order-lifecycle.md](docs/domain/work-order-lifecycle.md) | Statuses and transitions |
| [docs/domain/operations.md](docs/domain/operations.md) | What each role can do |
| [docs/product/screens.md](docs/product/screens.md) | Screens, buttons, dialogs, messages |
| [docs/product/ui-style.md](docs/product/ui-style.md) | Colours, shapes, status badges |
| [docs/product/seed-data.md](docs/product/seed-data.md) | The data the system starts with (about 60 orders) |
| [docs/product/task.md](docs/product/task.md) | The original assignment. Where it differs from the files above, they win |
| [docs/decisions.md](docs/decisions.md) | All decisions and the list of open questions |
| [CLAUDE.md](CLAUDE.md), [backend/CLAUDE.md](backend/CLAUDE.md), [frontend/CLAUDE.md](frontend/CLAUDE.md) | Stack, architecture and working rules |

**Rule of thumb:** `docs/` says WHAT to build. `.claude/rules/` says HOW to build it. A task in the plan contains only the WHAT.

## How the agents work

### The agents

| Agent | Job | Limits |
|---|---|---|
| `orchestrator` | Runs the build. Gives one task at a time to a worker and records the status | No shell. Edits only the status parts of `context/PLAN.md` |
| `planner` | Turns `TASK.md` and `docs/` into small ordered tasks. Can also revise the plan after a review | Writes only `context/PLAN.md` |
| `db-dev` | Database schema and seed data (Liquibase) | Backend area only |
| `backend-dev` | Backend tasks | Backend area only |
| `frontend-dev` | Frontend tasks | Frontend area only |
| `reviewer` | Checks a finished task, the whole run, or the plan | Read-only |

All agents use the same model (Sonnet 5.5). Tasks run one at a time, never in parallel.

### The flow

```
TASK.md + docs/
     |
     v   skill "plan"
planner  ->  context/PLAN.md
     |
     v   skill "evaluate-plan"
reviewer ->  context/PLAN_REVIEW.md   (READY / READY WITH MINOR CHANGES / REVISE BEFORE IMPLEMENTATION)
     |
     v   planner in "revise" mode, then evaluate again
the human confirms the plan
     |
     v
orchestrator takes the next task
     -> worker implements it and runs the gate
     -> reviewer checks it
     -> blocking findings go back to the worker (at most 2 rounds)
     -> task is "done" or "blocked"
     |
     v
one final review of the whole run
```

### Safety rules
- **One gate per area.** A task is done only when its gate is green: `./gradlew check` for the backend, `npm run check` for the frontend. (These commands do not exist yet.)
- **Schema first.** The database schema and seed are built first. Then the orchestrator stops until the human records "Schema frozen" in `docs/decisions.md`.
- **Stop, do not guess.** An agent stops and reports when a question touches an open decision, anything out of scope, money, rights and roles, deleting data, or a schema change after the freeze. For other gaps it takes the most careful reading and lists it as an assumption.
- **The human's files are protected.** Agents must not edit `docs/domain/`, `docs/product/`, `docs/decisions.md`, `.claude/rules/` and `.claude/agents/`.
- **No commits by agents.** The human commits and pushes after reviewing the diff.
- **Docs win.** If code and docs disagree, the docs win and the mismatch is reported.

## Key decisions

All decisions are in [docs/decisions.md](docs/decisions.md) (59 entries). The main ones:

| Decision | Why |
|---|---|
| **H2 database, no Docker** (D-052) | Nothing to install. The changelogs stay database-agnostic, so PostgreSQL can replace H2 later |
| **All transition rules in one table on the backend** (D-015, D-059) | Easy to read and to test row by row. The frontend only draws what the backend returns |
| **The backend returns `enabled` and a message for each transition** (D-010) | The UI can show a disabled button with a reason, with no rules in the UI |
| **Session in an HttpOnly cookie** (D-033) | JavaScript cannot read the token. The frontend has no token code |
| **Money is `BigDecimal`, sent as a plain number** (D-029) | No rounding errors. The frontend never calculates money |
| **Soft delete with a delete token** (D-021) | Unique values stay unique among live records, on any database |
| **Version check on every order change** (D-006) | A page open for ten minutes cannot overwrite newer changes |
| **Order, lines and history form one unit; payments are never changed** (D-012, D-017) | One version for the whole order; no mismatch between payments and totals |
| **Schema and seed first, then a freeze** (D-023) | The schema can be rewritten freely until the human approves it |
| **Planner and orchestrator are separate agents** (D-051) | Long reading of documents stays out of the orchestrator; each agent has narrow rights |
| **OpenAPI file is the contract** (D-032) | The frontend client is generated, never written by hand |

## Open points

Not decided yet (from [docs/decisions.md](docs/decisions.md), section "Open"). A run that needs one of them must stop.

1. Who writes work items and tasks, and whether the human approves the split before a run.
2. MCP servers (Context7, Playwright) are not connected, and no other skills exist yet.
3. The frontend code rules and the domain records rule are not written yet.
