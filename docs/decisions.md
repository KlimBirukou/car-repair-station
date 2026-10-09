# Decisions

The log of decisions made by the human, with the reasons. Newest first. Agents read it and never edit it. A decision
that changes a requirement is also written into the matching file under `docs/domain/` or `docs/product/`.

## Authority

This file is the highest authority of the project.

- Order of authority: the Log below; then `docs/domain/` and `docs/product/`; then `TASK.md`; then the rules in
  `.claude/rules/`, the `CLAUDE.md` files and the agent definitions.
- A concrete directive in the Log beats any other file. A disagreement means that the other file was not updated yet.
  Until the human corrects it, the Log is the truth.
- If two entries disagree, the newest wins. An entry marked "replaced" does not count. The reason and the rejected
  alternatives of an entry are not directives.
- A topic on the Open list is not decided: a run that needs it stops and reports, it does not guess.

## Open

Not decided yet. A run that needs one of these must stop and report it, not guess.

- Rules not written yet: the domain records rule.
- MCP servers (Context7, Playwright MCP) are not connected and no other skills are created (D-051 declared `plan` and
  `evaluate-plan`). The browser tests are Playwright code, not MCP (D-034).
- Library documentation (Context7) is not connected. Until it is, a worker takes the exact names and versions of a
  pinned library from the pinned dependencies (backend: the dependency management of Spring Boot 4.0.5 and the
  classes of the resolved jars; frontend: the installed typings and release notes), and reports what it could not
  confirm.
- Finding an order by its number: the order list filters (`entities.md`, `screens.md`) and the global search do not
  include the number (D-063). Whether to add a filter and a group of orders to the search is not decided.
- Process points to settle before the run:
    - how the `reviewer` sees the diff of one task while the human commits only after the run (without a commit between
      tasks, `git diff` is cumulative);
    - when "Schema frozen" is recorded: after the schema stage as now, or after the first vertical slice that proves
      the mapping with `ddl-auto=validate`;
    - step 5 of the orchestrator loop says "start no backend task before the freeze", but the skeleton of the backend
      is needed earlier; the wording must say that the skeleton is the exception.

## Format

```
### D-001 Title (YYYY-MM-DD)
- **Decision:**
- **Reason:**
- **Alternatives rejected:**
- **Affects:** files or areas
```

## Log

### D-074 The lifecycle document is a reconstruction (2026-10-09)

- **Decision:** The original of `docs/domain/work-order-lifecycle.md` was lost (the uploaded copy contained the
  Operations document), and the text was reconstructed from the other documents. The human searched the git history
  and did not find the original. A final consistency pass over the lifecycle, the operations, the entities, the screens
  and the state-machine rule is done after all edits and before the plan is built.
- **Reason:** The lifecycle is the core document; a distortion in it would spread into the table of transitions, the
  tests and the screens.
- **Alternatives rejected:** trusting the reconstruction without a check.
- **Affects:** `docs/domain/work-order-lifecycle.md`, `state-machine.md`.

### D-073 The plan files are reset; `task.md` is renamed (2026-10-09)

- **Decision:** `context/PLAN.md` is an empty skeleton and `context/PLAN_REVIEW.md` is deleted: the old plan and its
  review were written before the changes of 2026-10-09 (order number, creation record, read-only closed orders and the
  rules below). The plan is built again. `docs/product/task.md` is renamed `docs/product/original-requirements.md`, so
  that it is not confused with `TASK.md`.
- **Reason:** A review of an old plan would send the planner to fix findings that no longer apply.
- **Alternatives rejected:** revising the old plan.
- **Affects:** `context/`, root `CLAUDE.md`, `TASK.md`.

### D-072 The Log is the highest authority (2026-10-09)

- **Decision:** A concrete directive in the Log of this file beats `docs/`, `TASK.md`, the rules, the `CLAUDE.md` files
  and the agent definitions. When a worker meets a contradiction, it looks for the topic in the Log first. The
  orchestrator applies the same rule to what the workers report: it passes the directive to the worker in the new
  brief, notes "Resolved by D-0xx" in the task and lists the file that disagrees under "Files to fix" in the run
  summary, so that the human corrects it. Without a directive, the old rule holds: a topic on the Open list or in one of
  the five stop areas (D-043) stops the task; anything else is a conservative assumption. Agents never edit this file;
  the orchestrator proposes the text of an entry when an answer of the human should become a rule.
- **Reason:** The decisions are made in conversation and reach the files with a delay or not at all. One place has to be
  true at any moment.
- **Alternatives rejected:** the files of `docs/` as the only truth (a forgotten edit stops a run for a settled
  question); the worker deciding alone which of two files is right.
- **Affects:** this file, root `CLAUDE.md`, `.claude/agents/orchestrator.md`, `planner.md`, `reviewer.md`, `TASK.md`.

### D-071 The orchestrator is the main session; the planner is its subagent (2026-10-09)

- **Decision:** A run is one long session, `claude --agent orchestrator`. The orchestrator starts the `planner` (modes
  `plan` and `revise`) and the `reviewer` in plan review mode, saves `context/PLAN_REVIEW.md`, shows the plan to the
  human and, after the confirmation, hands the tasks to the workers one at a time. The planner, the workers and the
  reviewer are short-lived: each starts with a clean context, does one job and ends. A subagent cannot ask the human, so
  the orchestrator asks, in the chat, one message per question. The state of the run lives in `context/PLAN.md`, so a
  new session can continue where the old one stopped. The tool `Write` is added to the orchestrator for `context/`
  only. The skills `plan` and `evaluate-plan` stay as a manual way to do the same steps. This amends D-042 and D-051.
  The human approves the plan before the run, and the planner writes the tasks; this closes the old open question about
  who writes the tasks.
- **Reason:** One agent that keeps the whole picture, asks the human and hands out the work; the short-lived agents keep
  the long reading of documents and code out of its context.
- **Alternatives rejected:** a long-lived planner that also runs the workers (mixed rights, a long context, and the
  planner would need the Agent tool); planning only through the human's skills.
- **Affects:** `.claude/agents/orchestrator.md`, root `CLAUDE.md`, `.claude/skills/`.

### D-070 The browser tests start the backend (2026-10-09)

- **Decision:** `playwright.config.ts` has two `webServer` entries: the Vite dev server and the backend
  (`./gradlew bootRun`, profile `dev`, waits for `/v3/api-docs`, about 180 s), both with `reuseExistingServer`. An agent
  may run `npm run e2e`; it never edits files in `backend/` for it. `npx playwright install chromium` is done by the
  human. The "other mechanic's order by link" flow reads the id of such an order through the API as a manager, so it
  does
  not depend on literals of the seed.
- **Reason:** `frontend-dev` has no other way to run the flows, and the seed makes the stack known.
- **Alternatives rejected:** the human starts the backend by hand before every run.
- **Affects:** `e2e.md`, `.claude/agents/frontend-dev.md`.

### D-069 Backend rules: references, field errors, status predicates, batch ports (2026-10-09)

- **Decision:**
    - A response names another entity through a small `Ref` record of the owning feature and the service method
      `findRefsByIds` (new rule `references.md`). Deleted and inactive records are returned, with their marks. A count
      that a `Ref` cannot carry uses a counter port, for example `CustomerVehicleCounter`. Cards have no composite
      endpoint: the vehicle filter has `customerId`, the order filter has `customerId` and `vehicleId`.
    - `GET /employees/mechanics` returns the active mechanics as `EmployeeRef` (D-058), unpaged.
    - A check that annotations cannot express (the year limit, the payment date, the current password, a blank reason)
      throws `FieldErrorException` and returns the same `errors` map as Bean Validation.
    - `WorkOrderStatus` owns the predicates `linesEditable()`, `isOpen()`, `acceptsPayment()`,
      `allowsIntakeDateChange()` and the set `open()`. The 14 rows of the transition table have literal ids in
      `state-machine.md`.
    - Ports have `findAllByIds`; a dependent record has `findAllBy<Parent>Ids`, so a page of orders costs a fixed number
      of queries.
    - `TextNormalizer` trims and changes the case; a blank optional email becomes `null`.
    - The order number comes from a database sequence through the dialect of the session factory, never a statement for
      one database (D-063).
    - Types and checks of `standardHours`, `year`, `mileage` and prices are fixed in `liquibase.md`.
    - Until Context7 is connected, the exact artifacts and versions come from the dependency management of Spring Boot
      4.0.5 and the resolved jars. The first backend task must prove that `OpenApiExportTest` writes
      `backend/openapi/openapi.json` on Spring Boot 4, Jackson 3 and springdoc, before anything is built on it.
- **Reason:** Closes the gaps found in the consistency check: the cost of a page, field errors, status checks outside
  the
  table and the lack of library documentation.
- **Alternatives rejected:** ids only in responses (the screens need names and marks); a query per row.
- **Affects:** `references.md`, `exception.md`, `state-machine.md`, `repository.md`, `service.md`, `web.md`,
  `pagination.md`, `liquibase.md`, `aggregate.md`, `structure.md`, `security.md`, `backend/CLAUDE.md`.

### D-068 Frontend rules: details accepted in the review (2026-10-09)

- **Decision:**
    - Native date inputs draw their text in the browser's locale (an accepted deviation from `DD.MM.YYYY`); everywhere
      else a date is `DD.MM.YYYY`. A row of Today shows the time as `HH:mm`.
    - Georgian text is drawn by the `system-ui` fallback; no second font.
    - Status names appear in the code only in `StatusBadge`, `strings/status.ts` and `features/workorder/filters.ts`.
    - The cards of a customer and a vehicle are open to every logged-in user; only the lists and the "new" pages are
      tied
      to menu items.
    - The conflict button is "Refresh"; a 403 or a 404 on a page query gives "No access" or "Not found".
    - Assumptions: a board column shows 10 cards; the global search starts from one character, 300 ms after the last
      keystroke.
- **Reason:** Closes the gaps found in the consistency check of the frontend rules.
- **Alternatives rejected:** a Georgian font (extra weight for names that may never appear).
- **Affects:** `formats.md`, `errors.md`, `permissions.md`, `routing.md`, `theme.md`, `forms.md`.

### D-067 A customer who did not come: the manager cancels the order (2026-10-09)

- **Decision:** For a no-show the manager cancels the order with the reason "No show". The system never cancels or moves
  an appointment by itself. Appointments of earlier days that were not accepted leave the Today screen and stay in
  Orders in the status "Appointment".
- **Reason:** Simple, and consistent with cancel in `APPOINTMENT` (D-018).
- **Alternatives rejected:** an automatic cancellation; a separate "no show" status.
- **Affects:** `docs/domain/work-order-lifecycle.md`, `docs/product/screens.md`, `docs/product/seed-data.md`, `TASK.md`.

### D-066 The seed: customers without a vehicle are former owners (2026-10-09)

- **Decision:** A station registers a customer when the first vehicle arrives, so a customer without a vehicle is a
  former owner after a transfer. The seed has 30 customers (2 deleted, without live vehicles; 3 former owners; 25 with
  vehicles, 5 of them with two) and 31 vehicles (30 live, 1 deleted). One cancelled order is a no-show. Two orders
  belong to two of the former owners.
- **Reason:** The old counts (45 vehicles for 30 customers) did not add up.
- **Alternatives rejected:** customers registered ahead of any visit.
- **Affects:** `docs/product/seed-data.md`.

### D-065 The last active manager is protected (2026-10-09)

- **Decision:** At least one active manager always remains. Deactivating a manager, or taking the manager role from one,
  is rejected when no other active manager would remain, with the text "At least one active manager must remain.". The
  service locks the target and every active manager in id order, then checks the rule again (D-056). This covers two
  managers acting on each other at the same moment.
- **Reason:** D-056 protected only the own record; one manager could still demote the other.
- **Alternatives rejected:** self-protection only.
- **Affects:** `docs/domain/operations.md`, `docs/domain/entities.md`, `docs/product/screens.md`, `TASK.md`,
  `service.md`, `exception.md`.

### D-064 A vehicle's mileage comes from its latest order (2026-10-09)

- **Decision:** The mileage of an order updates the vehicle only if no other order of that vehicle with a later
  `intakeDate` has a mileage. A correction of an older order does not change the vehicle. A cleared mileage never
  changes it.
- **Reason:** Editing an old order must not break "the mileage of a vehicle equals the mileage of its newest order"
  (seed rule 4).
- **Alternatives rejected:** an update on every change; an update only when the value grows.
- **Affects:** `docs/domain/entities.md`, `docs/product/seed-data.md`, `aggregate.md`.

### D-063 Order number, creation record, read-only closed orders, movable appointment (2026-10-09)

- **Decision:**
    - `WorkOrder.number` is an integer assigned by the service from a database sequence: unique, never changed, never
      reused. It is shown in the header, the lists and the printed card. Seeded numbers start at 1001, and the sequence
      is restarted above them after the seed.
    - Creating an order writes the first history record: `fromStatus` empty, `toStatus` `APPOINTMENT`, by the creator.
      `WorkOrderStatusHistory.fromStatus` is optional.
    - An order in `CLOSED` or `CANCELLED` is read-only in every respect: lines, description, mileage, notes and the
      responsible mechanic. While the order is open, a manager can edit the description, mileage and the mechanic, and a
      mechanic of the order the notes. In `READY` and `PAID` only the lines are locked.
    - A manager can change `intakeDate` (move the appointment) while the order is in `APPOINTMENT`.
- **Reason:** The dialog "Close order" promises that nothing changes afterwards. The printed card serves as the invoice
  and needs a number that people can say aloud. The seed rule "the status equals the newest history record" needs a
  creation record. Appointments get moved.
- **Alternatives rejected:** showing a UUID; no creation record (the rule would need an exception); a fixed appointment
  time.
- **Affects:** `docs/domain/entities.md`, `operations.md`, `work-order-lifecycle.md`, `docs/product/screens.md`,
  `seed-data.md`, `TASK.md`, root `CLAUDE.md`, `liquibase.md`, `aggregate.md`, `state-machine.md`.

### D-062 The employee response carries the flags for its own record (2026-10-09)

- **Decision:** The employee response carries `canDeactivate` and `canChangeRole`, computed in the service
  (`EmployeePermissions`) from the current user and the record; both are false for the user's own record. The UI draws
  the controls disabled when a flag is false (as `screens.md` asks), with no hint text, and never compares an id. This
  entry was referred to by `permissions.md` before it existed in the file; it replaces the wording "the control is not
  drawn".
- **Reason:** The UI must not know whose record is whose; the backend already does (D-056, D-061).
- **Alternatives rejected:** the client compares the id of the row with the id of the user; not drawing the controls.
- **Affects:** `permissions.md`, `web.md`, `docs/product/screens.md`.

### D-061 The backend returns the rights flags and the version of every row it lets the UI act on (2026-10-08)

- **Decision:** The UI never compares a role. Rights reach it as data:
    - `GET /auth/me` returns the user (`id`, `fullName`, `role` as data to show) and `capabilities`: `menu` (the ordered
      list of menu items the user has, values `TODAY`, `ORDERS`, `MY_ORDERS`, `CUSTOMERS`, `VEHICLES`, `PRICE_LIST`,
      `EMPLOYEES`; the first one is the home page after login), `canManageCustomers`, `canManageVehicles` (create, edit,
      delete, change owner), `canCreateOrders`. Each is computed by the backend from the role in one place.
    - The order response carries `permissions`: `canEditInfo` (problem description, mileage), `canEditIntakeDate`,
      `canEditNotes`, `canAssignMechanic`, `canEditLines` (rights and status together), `canRecordPayment` (role,
      status, no payment yet and a total above zero). `canEditInfo`, `canEditNotes` and `canAssignMechanic` are false
      for `CLOSED` and `CANCELLED` (D-063). `linesEditable` (D-059) stays: it is the status rule alone and drives the
      note "Lines are locked".
    - A list row of orders carries `version` and `transitions`, so a command can be sent from a row (Today, My orders).
    - The text of `error.concurrent-update` is "The order was changed by another user. Refresh the page." (the text of
      `screens.md`); the UI shows `detail` as it comes.
- **Reason:** A role check on the client can disagree with the backend, and the frontend rules forbid it. Without a flag
  a button for a manager-only action would need a role literal. A command from a list row needs the version the user
  saw. A payment of zero is invalid, so a free order needs no payment button.
- **Alternatives rejected:** a table of rights in the frontend (`canEditOrderSection`); `usePermissions` comparing
  roles; a second request for the version before every command.
- **Affects:** `web.md`, `aggregate.md`, `state-machine.md`, `security.md`, `exception.md`,
  `.claude/rules/frontend/permissions.md`, `api.md`.

### D-060 The frontend rules are accepted; the screens are lists of rows and cards (2026-10-08)

- **Decision:** The files in `.claude/rules/frontend/` are the frontend code rules. One adaptive application, written
  for a phone first: breakpoints 768 and 1024 px, controls at least 48 px (the main action 56 px), body text 16 px,
  nothing below 14 px, a visible focus ring, no hover-only behavior. Lists are rows or cards (`EntityList`), not tables;
  the board wraps into a grid; the menu is a bottom tab bar, a column of icons or a sidebar by width. `screens.md` and
  `ui-style.md` were updated to match (44 px → 48 px, font sizes, the control border color `#8A817B` with 3:1 contrast,
  "List / Board", "No access"). The browser checks of the touch rule cover the key screens listed in `e2e.md` in three
  Playwright projects.
- **Reason:** Mechanics work with dirty hands on a phone; a table does not fit a phone and a second layout means a
  second set of screens and tests. The old control border `#E4DCD6` has a contrast of 1.35:1, too low for a control.
- **Alternatives rejected:** a table on the desktop and a list on the phone (two sets of components); keeping 44 px
  (below the common touch guideline); every route in every project (needs the whole stack for a layout check).
- **Affects:** `.claude/rules/frontend/`, `frontend/CLAUDE.md`, `docs/product/screens.md`, `docs/product/ui-style.md`,
  `context/PLAN.md`.

### D-059 Transitions carry label, target and group; the order carries `linesEditable` (2026-10-08)

- **Decision:** Each transition in the order response has `label`, `targetStatus` and `group` (`PRIMARY` or `MORE`) next
  to the existing fields. The order response has a boolean `linesEditable` from `WorkOrderStatus.linesEditable()`. The
  consequence texts of the confirmation dialogs stay in the frontend strings.
- **Reason:** The frontend must not map transition ids to statuses or repeat the status rule; it draws what the backend
  returns.
- **Alternatives rejected:** a map keyed by transition id in the frontend (status logic leaks); the frontend deriving
  editable lines from the status.
- **Affects:** `state-machine.md`, `docs/product/screens.md`, `frontend/CLAUDE.md`.

### D-058 A mechanic can list active mechanics (id and name) (2026-10-08)

- **Decision:** A read for both roles returns active employees with the role `MECHANIC`, with id and name only
  (`GET /employees/mechanics`, unpaged). A mechanic uses it to choose a line performer. The responsible mechanic and a
  line performer must be active `MECHANIC` employees.
- **Reason:** A mechanic edits lines of own orders but cannot read the employee list (managers only). The read exposes
  no other field.
- **Alternatives rejected:** only the manager assigns performers (narrows the mechanic's rights); the performer is
  always the mechanic who edits.
- **Affects:** `docs/domain/operations.md`, `docs/domain/entities.md`, `web.md`, `pagination.md`.

### D-057 The payment date is prefilled and not in the future (2026-10-08)

- **Decision:** The payment date is prefilled with today in the station zone, may be changed, and cannot be later than
  today.
- **Reason:** The payment is entered by hand after the money is received; a future date is always a mistake. A past date
  is allowed for a payment entered late.
- **Alternatives rejected:** the system sets the date and it cannot be changed; no limit.
- **Affects:** `docs/domain/entities.md`, `docs/product/screens.md`.

### D-056 Employee rules: no self-deactivation, no role change of oneself, row locks (2026-10-08)

- **Decision:** An employee cannot deactivate themselves or change their own role. Two managers deactivating each other
  at the same moment are handled in the service: it locks the rows it checks with a pessimistic write lock in id order,
  then checks the rule again. Deactivating a mechanic with open orders is allowed; the manager reassigns the
  responsible mechanic. The rule "at least one active manager always remains" was first meant to follow from the
  self-protection; it is stated and extended to the demotion of another manager in D-065.
- **Reason:** A rule over several rows is not protected by `@Version` of single rows (write skew). A short row lock
  works on H2 and PostgreSQL alike.
- **Alternatives rejected:** `SERIALIZABLE` isolation (differs between databases); accepting the risk; forbidding to
  deactivate a mechanic with open orders.
- **Affects:** `docs/domain/operations.md`, `docs/domain/entities.md`, `service.md`, `docs/product/screens.md`.

### D-055 Deleting a customer or a vehicle is guarded by a port (2026-10-08)

- **Decision:** A customer cannot be deleted while they have a non-deleted vehicle or an open order. A vehicle cannot be
  deleted while it has an open order. An open order is any order except `CLOSED` and `CANCELLED`. The features that own
  the data implement a guard port declared by the guarded feature.
- **Reason:** A deleted customer must not stay the owner of a live vehicle, and an open order must not refer to a
  deleted record (`seed-data.md`, rule 5). A sold vehicle goes through "Change owner", so its history stays with one
  record. The port avoids a cycle between features.
- **Alternatives rejected:** deleting the vehicles together with the customer (splits the history of a vehicle that gets
  a new owner); allowing deletion and leaving a deleted owner.
- **Affects:** `docs/domain/entities.md`, `docs/product/screens.md`, `structure.md`.

### D-054 `screens.md` is agreed; "Mark ready" has one text (2026-10-08)

- **Decision:** `docs/product/screens.md` has the status agreed. The confirmation of "Mark ready" is the dialogs-table
  text "The order lines will be locked." and the actions table points to it.
- **Reason:** The two texts differed; the dialogs table is where consequence texts live.
- **Alternatives rejected:** keeping both.
- **Affects:** `docs/product/screens.md`.

### D-053 The order list customer filter exists for both roles (2026-10-08)

- **Decision:** The filter by customer is in `operations.md`. For a mechanic it narrows only own orders.
- **Reason:** `entities.md` already listed it; the files disagreed.
- **Alternatives rejected:** removing it.
- **Affects:** `docs/domain/operations.md`.

### D-052 The database is H2; there is no Docker (2026-10-08)

- **Decision:** The backend and the frontend run locally and the database is H2 (in memory), for the application and for
  the tests. Docker Compose and Testcontainers are not used. The changelogs stay database-agnostic, so PostgreSQL may
  replace H2 later; then the integration suite runs on it first (see `liquibase.md`, Exceptions). This replaces D-022
  and the Docker parts of D-024.
- **Reason:** The human does not know yet what the course requires and wants no Docker for now. H2 needs no
  infrastructure.
- **Alternatives rejected:** PostgreSQL with Docker Compose; H2 only for one portability test.
- **Affects:** root `CLAUDE.md`, `TASK.md`, `backend/CLAUDE.md`, `liquibase.md`, `testing.md`, `db-dev.md`,
  `.claude/settings.json`.

### D-051 The plan lives in `context/`; the planner writes it; two skills drive planning (2026-10-08)

- **Decision:** The assignment's file names are used. `TASK.md` (repository root) is the entry description of the
  product and points to `docs/`. `context/PLAN.md` replaces `docs/plan.md`; `context/PLAN_REVIEW.md` holds the review of
  the plan. The `planner` writes `context/PLAN.md` itself, in two modes: `plan` (build it) and `revise` (read
  `PLAN_REVIEW.md`, update the plan, list the changes). The orchestrator still owns task statuses, assumptions and the
  run summary. The `reviewer` gets a "Plan review" mode that compares the plan with `TASK.md` and `docs/`, and returns a
  verdict. Two skills: `plan` (checks that `TASK.md` exists, then starts the planner) and `evaluate-plan` (starts the
  reviewer in plan review mode and saves `context/PLAN_REVIEW.md` with the verdict `READY`, `READY WITH MINOR CHANGES`
  or `REVISE BEFORE IMPLEMENTATION`). The initial task status is `pending`. The orchestrator and the planner stay two
  agents. The skills are the only skills; MCP servers are still not connected. D-071 lets the orchestrator do the
  steps of the two skills itself.
- **Reason:** The learning assignment names these files and asks for a planner with a revision loop and an evaluator.
  Keeping the planner separate keeps the long reading of all documents out of the orchestrator's context and gives each
  agent narrow rights. This changes D-008 ("only the orchestrator writes the plan") and D-042 (the orchestrator edits
  only `docs/plan.md`).
- **Alternatives rejected:** merging the planner into the orchestrator (mixed rights, long context, no separate planner
  as the assignment asks); keeping `docs/plan.md` next to `context/PLAN.md` (two plan files).
- **Affects:** root `CLAUDE.md`, `.claude/agents/`, `.claude/settings.json`, `.claude/skills/`, `TASK.md`, `context/`.

### D-050 Status badge colours (2026-10-08)

- **Decision:** Badge colours for the six remaining statuses are in `docs/product/ui-style.md`: sand (`APPOINTMENT`),
  khaki (`WORK_ORDER`), plum (`ON_HOLD`), orange (`WAITING_FOR_PARTS`), light green (`READY`), deeper green (`PAID`).
  The three already chosen colours do not change. No badge is red. Every pair has a contrast ratio of at least 4.5:1.
- **Reason:** The colours follow the lifecycle and the warm palette. The two pauses share a board column, so they get
  clearly different hues. Green reads as "done on our side", and red stays reserved for actions.
- **Alternatives rejected:** blue or cold tones (they break the warm palette); red for any status.
- **Affects:** `docs/product/ui-style.md`, `docs/domain/work-order-lifecycle.md`.

### D-049 Every agent runs on Sonnet 5.5 (2026-10-08)

- **Decision:** All six agents use `claude-sonnet-5-5`, the planner included.
- **Reason:** Chosen by the human. Replaces the Opus planner of D-040.
- **Alternatives rejected:** Opus for the planner.
- **Affects:** `.claude/agents/planner.md`, root `CLAUDE.md`.

### D-048 Web layer defaults (2026-10-05)

- **Decision:** Create is 201 with a body and no `Location` header; `PUT` and commands are 200 with the resource;
  deleting a customer or a vehicle is 204. Activate and deactivate are `POST /{id}/activate` and `/deactivate`; the
  owner of a vehicle is `PUT /vehicles/{id}/owner`. Resource names are plural kebab-case. A day in a filter becomes a
  range of instants in the station zone. Search is its own feature `search`, at most 5 results per group, unpaged. The
  board is one list request per column. Swagger UI and the API document exist only in `dev` and `test`. Every response
  field is required or explicitly nullable.
- **Reason:** Defaults chosen to keep controllers uniform; they match the screens.
- **Alternatives rejected:** `Location` headers (the frontend does not use them); a status flag inside `PUT` (the
  screens have separate actions).
- **Affects:** `web.md`, `money-time.md`, `pagination.md`.

### D-047 Base package `com.carrepair.station` (2026-10-05)

- **Decision:** The base package is `com.carrepair.station`, the Gradle group is `com.carrepair`.
- **Reason:** Replaces the placeholder `com.example.app`.
- **Alternatives rejected:** none.
- **Affects:** `structure.md`, `identifier.md`, `backend/CLAUDE.md`.

### D-046 The API is versioned: `/api/v1` (2026-10-05)

- **Decision:** Every endpoint is under `/api/v1`, defined once in `ApiPaths.V1`.
- **Reason:** Chosen by the human to show how the API is shared in a mature architecture. The cost is one prefix.
- **Alternatives rejected:** `/api` without a version.
- **Affects:** `web.md`, `security.md`, `frontend/CLAUDE.md`.

### D-045 OpenAPI documentation is in a separate interface; errors come from the `ErrorKind` enum (2026-10-05)

- **Decision:** `<Feature>ControllerApi` holds the OpenAPI annotations without JSON examples; the controller implements
  it. `ErrorKind` holds the status code and a description. `@ApiErrors({...})` lists the errors of an operation, and a
  customizer turns them into responses. 401 and 400 are added automatically.
- **Reason:** The human asked for response descriptions without examples and for the errors to be generalized and taken
  from an enum, not written by hand.
- **Alternatives rejected:** documentation on the controller itself; `@ApiResponse` for every error by hand; examples in
  the annotations (they go stale).
- **Affects:** `web.md`, `exception.md`, `structure.md`.

### D-044 Review is at most two rounds; the schema stage ends with a stop (2026-10-05)

- **Decision:** Blocking findings go back to the worker at most twice. Then the task is `blocked` with the findings in
  its notes, and the run goes on with independent tasks. One final review covers the whole run. When the schema stage
  has passed review, the orchestrator stops until the human records "Schema frozen".
- **Reason:** The loop cannot run forever, whatever is left is visible in `context/PLAN.md` (it was `docs/plan.md`, see
  D-051), and the schema gets the human's attention first.
- **Alternatives rejected:** no limit (it may loop); one round (weaker).
- **Affects:** root `CLAUDE.md`, `orchestrator.md`.

### D-043 A missing requirement is an assumption, except in five areas (2026-10-05)

- **Decision:** The worker takes the most conservative reading and reports it, and the orchestrator records it under
  "Assumptions" in `context/PLAN.md` (it was `docs/plan.md`, see D-051). The agent stops instead when the question
  touches the Open list in this file, anything postponed or out of scope, money, rights and roles, deleting data, or a
  schema change after the freeze. Before it assumes or stops, it looks for a concrete directive in the Log (D-072).
- **Reason:** A run can reach its end without the human, who reviews the assumptions afterwards (run, remarks, second
  run). The five areas are where a wrong guess costs most.
- **Alternatives rejected:** always stop (the run may stall); always assume (a guess can drag code with it).
- **Affects:** root `CLAUDE.md`, all agents, `context/PLAN.md`.

### D-042 The orchestrator is an agent, and tasks run one at a time (2026-10-05)

- **Decision:** A run starts with `claude --agent orchestrator`. Its tools are the Agent tool limited to the five other
  agents, Read, Grep, Glob and Edit (Write for `context/` is added by D-071). It has no shell and, by instruction,
  edits only the plan (`docs/plan.md`, now `context/PLAN.md`, see D-051). Tasks run sequentially without worktrees: the
  schema and the seed first, then backend, then frontend.
- **Reason:** An explicit list of agents it may call and no way to run the gates itself. Sequential runs avoid conflicts
  over ports, the database and merging.
- **Alternatives rejected:** a plain main session; parallel workers in worktrees (ports and a database per worktree, a
  separate `node_modules`, merging).
- **Affects:** `.claude/agents/orchestrator.md`, root `CLAUDE.md`.

### D-041 Agents may not edit the human's files and may not commit or push (2026-10-05)

- **Decision:** `.claude/settings.json` denies edits to `docs/domain`, `docs/product`, `docs/decisions.md`,
  `.claude/rules`, `.claude/agents` and the settings file, and denies `git commit` and `git push`. It allows the build
  commands (`./gradlew`, `npm run`, read-only git). The human commits after a review. Status (2026-10-09): the deny
  rules are postponed until the planning phase ends and the file has only `allow` entries for now; `docker compose` is
  no longer allowed (D-052).
- **Reason:** A deny rule is enforced, a "never" in a text is not. The deny rules cover the file tools only: a shell
  command can still write a file, so the instructions forbid that too. Without commits a run leaves a diff for the human
  to read.
- **Alternatives rejected:** instructions only; a sandbox (heavier).
- **Affects:** `.claude/settings.json`, root `CLAUDE.md`.

### D-040 Six agents; Opus only for the planner (2026-10-05)

- **Decision:** `orchestrator`, `planner`, `db-dev`, `backend-dev`, `frontend-dev`, `reviewer`. The planner runs on Opus
  5.5, the others on Sonnet 5.5 (replaced by D-049: all agents run on Sonnet 5.5). The planner and the reviewer use high
  effort. `db-dev` is the author of the changesets.
- **Reason:** The schema and the seed come first and need a clean context. The planner runs rarely, so a stronger model
  is affordable there, while the reviewer runs on every task.
- **Alternatives rejected:** four roles (the schema work bloats `backend-dev`); a separate tester and security reviewer
  (add them if the first run shows gaps); Opus for the reviewer (cost).
- **Affects:** `.claude/agents/`, root `CLAUDE.md`.

### D-039 The lifecycle and the seed data are approved (2026-10-05)

- **Decision:** `docs/domain/work-order-lifecycle.md` and `docs/product/seed-data.md` are agreed. (The lifecycle text is
  a reconstruction, see D-074.)
- **Reason:** Approved by the human.
- **Alternatives rejected:** none.
- **Affects:** both files (status line).

### D-038 The printed order is the browser print of the order card (2026-10-05)

- **Decision:** A "Print" button on the order card opens the browser print dialog. A print stylesheet keeps the header,
  customer, vehicle, lines, total and payment. No separate screen.
- **Reason:** The simplest way to give the printed view that replaces the invoice. The human said it is not important.
- **Alternatives rejected:** a separate print screen; dropping the printed view.
- **Affects:** `docs/product/screens.md`, `frontend/CLAUDE.md`.

### D-037 Dates show day, month and year; times show seconds (2026-10-05)

- **Decision:** A date is `01.10.2026`, a date with time is `01.10.2026 10:30:15`, in the station zone `Asia/Tbilisi`.
- **Reason:** Chosen by the human. The zone was not disputed.
- **Alternatives rejected:** a time without seconds.
- **Affects:** `docs/product/screens.md`, `frontend/CLAUDE.md`.

### D-036 No login hardening (2026-10-05)

- **Decision:** No limit on login attempts and no revoking of a token before it expires.
- **Reason:** Kept simple for a test project. A deactivation still stops a token at once.
- **Alternatives rejected:** rate limiting and lockout; a token blacklist.
- **Affects:** `security.md`.

### D-035 `active` is a field of Employee, ServiceItem and Part (2026-10-05)

- **Decision:** Added to `docs/domain/entities.md`. A manager can deactivate and activate these records again. A
  deactivated employee cannot log in.
- **Reason:** Deactivation was described everywhere but had no field; the seed and the changelogs need it.
- **Alternatives rejected:** none.
- **Affects:** `docs/domain/entities.md`, `docs/domain/operations.md`, `docs/product/screens.md`.

### D-034 The frontend stack is confirmed; the browser check is a small Playwright suite (2026-10-05)

- **Decision:** React, TypeScript (strict), Vite, Ant Design 6, React Router, TanStack Query for server state, Ant
  Design `Form` with backend errors mapped onto the fields, dayjs with its timezone plugin, all strings in one module,
  no `dangerouslySetInnerHTML`. The gate `npm run check` stays as it is. A separate `npm run e2e` runs Playwright tests
  (not MCP) on the seeded development stack for three flows: the manager takes an order from creation to closing, the
  mechanic sees only own orders, an order is cancelled with a reason. It is not part of the gate.
- **Reason:** These are the current defaults for such an application and the simplest set that fits it. The seed gives
  the tests ready accounts.
- **Alternatives rejected:** a global store; e2e inside the gate (it needs a running backend); a Playwright MCP session
  as the only check (it costs tokens and leaves no tests).
- **Affects:** `frontend/CLAUDE.md`.

### D-033 The session is a cookie; the frontend holds no token (2026-10-05)

- **Decision:** The backend sets the JWT in an HttpOnly, SameSite=Strict cookie. The frontend calls the relative
  `/api/v1` (a Vite proxy in development, a reverse proxy in production), has no token code and no CORS. A 401 sends the
  user to the login screen with "Session expired. Log in again."
- **Reason:** Current guidance prefers an HttpOnly cookie to browser storage, because any injected script can read
  storage. Same-site and same-origin cover CSRF, and the frontend gets simpler.
- **Alternatives rejected:** the token in `localStorage` (simple, but readable by any script); the token in memory only
  (lost on reload).
- **Affects:** `security.md`, `frontend/CLAUDE.md`, `docs/product/screens.md`.

### D-032 The API client is generated types plus a typed fetch client; the contract is a committed file (2026-10-05)

- **Decision:** `openapi-typescript` generates the types and `openapi-fetch` is the client. Query hooks are written by
  hand in each feature. A backend integration test writes the OpenAPI document to `backend/openapi/openapi.json`
  (committed); `npm run api:generate` reads that file.
- **Reason:** Types-only output is small and easy to review. The commands of the work order return the whole updated
  order, and caching that needs hand-written logic. A committed file needs no running server.
- **Alternatives rejected:** Orval with generated hooks (less hand-written code, but the generated hooks do not know our
  caching); generating from a running backend.
- **Affects:** `frontend/CLAUDE.md`, `backend/CLAUDE.md`.

### D-031 Passwords and sessions (2026-10-05)

- **Decision:** A password has 10 to 72 characters with a letter, a digit and a symbol. It is hashed with BCrypt (a
  random salt inside the hash), only the hash is stored, and login compares with `matches`. The session is a JWT valid
  for 12 hours, without refresh. A deactivated employee cannot log in until a manager activates the employee; the token
  of a deactivated employee stops working at once, because every request loads the employee.
- **Reason:** The human chose a standard policy and a salted hash. The per-request check makes deactivation immediate.
- **Alternatives rejected:** refresh tokens; a pure JWT without a lookup.
- **Affects:** `security.md`, `docs/domain/operations.md`, `docs/product/screens.md`, `docs/product/seed-data.md`.

### D-030 Time is zone-aware (2026-10-05)

- **Decision:** Instants are stored and sent in UTC (`TIMESTAMP WITH TIME ZONE`, ISO-8601 with `Z`). The station zone
  `Asia/Tbilisi` (assumed from the currency) decides what "today" is, on the backend and in the frontend.
- **Reason:** The human asked for zone-aware times; UTC avoids zone bugs.
- **Alternatives rejected:** local date-times without a zone.
- **Affects:** `money-time.md`, `frontend/CLAUDE.md`.

### D-029 Money is an exact decimal that travels as a plain number (2026-10-05)

- **Decision:** `BigDecimal` with scale 2 and `NUMERIC(12,2)` on the backend, a plain number in JSON, no calculation in
  the frontend. A line total is `quantity × price` rounded half up to 2 decimals.
- **Reason:** The human wanted the simplest format, a plain number: that is kept in JSON. The human's tentative `double`
  is not used, because sums of binary floats drift by cents.
- **Alternatives rejected:** `double`; integer minor units (exact, but awkward for the frontend); money as a string.
- **Affects:** `money-time.md`, `liquibase.md`.

### D-028 A customer needs a phone, not an email; a VIN can be any text (2026-10-05)

- **Decision:** `Customer.phone` is required and `Customer.email` is optional (valid when present, unique among
  customers who have one). `Vehicle.vin` is required and unique but has no fixed length or format. Emails and logins are
  stored in lower case, VINs in upper case, all trimmed.
- **Reason:** Walk-in customers and towed, old or imported vehicles must be accepted.
- **Alternatives rejected:** keeping both required; a VIN that may be empty (a vehicle could not be identified).
- **Affects:** `docs/domain/entities.md`, `docs/product/screens.md`, `docs/product/seed-data.md`.

### D-027 Seed data is one large, living dataset (2026-10-05)

- **Decision:** One seed, loaded in development only: employees, price list, customers, vehicles and about 60 orders in
  every status with lines, payments and history, so the system looks alive at the first start. It is specified in
  `docs/product/seed-data.md` and built as the last task of the schema stage. The counts of customers and vehicles were
  corrected by D-066.
- **Reason:** A learning project; a living system is the fastest check of every screen. One dataset needs no extra
  context. It also gives the first manager account.
- **Alternatives rejected:** reference data only; a separate `demo` context (more files and contexts for little gain).
- **Affects:** `docs/product/seed-data.md`, `liquibase.md`.

### D-026 The changeset author is the agent that wrote it (2026-10-05)

- **Decision:** `author` is the name of the agent that wrote the changeset (`db-dev` writes the schema and the seed).
  Never a person's name or email.
- **Reason:** Shows which agent made which change. Author is part of the changeset identity, so it is never changed
  afterwards.
- **Alternatives rejected:** a neutral project name; the owner's name and email (personal data in the repository).
- **Affects:** `liquibase.md`.

### D-025 No created_at and updated_at (2026-10-05)

- **Decision:** No audit timestamp columns. The technical fields are `id`, `version` and the soft-delete token.
- **Reason:** History records cover the status audit and audit of amounts is out of scope; less code and no mapper
  exceptions. `entities.md` and `jpa-entity.md` contradicted each other; now they agree.
- **Alternatives rejected:** audit columns on every table (`updated_at` does not update itself and needs code).
- **Affects:** `docs/domain/entities.md`, `jpa-entity.md`, `liquibase.md`.

### D-024 Own schema `repair_schema`, set once in the configuration (2026-10-05; the Docker parts replaced by D-052)

- **Decision:** Tables live in `repair_schema`. Structured changes carry no `schemaName`: the default schema is set in
  the Liquibase and Hibernate configuration. The environment creates the schema from one script that the H2 URL runs
  (formerly also Docker Compose and Testcontainers, see D-052). Raw SQL uses the `${schema}` property.
- **Reason:** A `schemaName` in every change gets forgotten by agents. The cost is three places that hold the name (the
  script, the configuration, the master property); tests fail if they differ.
- **Alternatives rejected:** the `public` schema; `schemaName` in every change.
- **Affects:** `liquibase.md`, `application.yaml`.

### D-023 The schema is built first and then frozen (2026-10-05)

- **Decision:** The schema and the seed are built first and shown to the human. Until "Schema frozen" is recorded here,
  changelogs may be rewritten and the development database recreated. After the freeze an applied changeset is never
  edited: a fix is a new changeset, also on H2. Seed changesets have `runOnChange`.
- **Reason:** A clean final schema, and the schema gets the special attention the human wants. The rule after the freeze
  works on every database.
- **Alternatives rejected:** immutable from day one (a pile of `alter` changesets after the first mistake).
- **Affects:** `liquibase.md`, `backend/CLAUDE.md`.

### D-022 Changelogs are agnostic YAML, one file per table; PostgreSQL is main, H2 is checked (2026-10-05, replaced by D-052)

- **Decision:** Liquibase in YAML, one file per table, one changeset per change. PostgreSQL is the main database. One
  portability test applies all changelogs and the seed to H2 in memory.
- **Reason:** The course may require H2 and the human does not choose the database yet. A one-test check keeps the
  switch cheap. If H2 becomes the main database, the integration suite is re-run on it first.
- **Alternatives rejected:** PostgreSQL only without a check; the whole suite on both databases (costly).
- **Affects:** `liquibase.md`, `testing.md`, `backend/CLAUDE.md`.

### D-021 Soft delete uses a delete token (2026-10-05)

- **Decision:** Customers and vehicles have `delete_token` (UUID, not null). A live row holds a constant, a deleted row
  holds its own id. Uniqueness among non-deleted rows is a plain unique constraint over the value and the token. The
  domain record keeps `boolean deleted`; the persistence mapper converts. This replaces the flag and the partial index
  of D-004.
- **Reason:** It works on every database, and the database itself catches duplicates. As far as I know H2 has no partial
  indexes.
- **Alternatives rejected:** a partial unique index (PostgreSQL only); a check in the service (a race); separate
  changesets per database.
- **Affects:** `jpa-entity.md`, `repository.md`, `structure.md`, `backend/CLAUDE.md`.

### D-020 Closed and Cancelled badges are two greys; a cancelled order shows its reason (2026-10-05)

- **Decision:** Labels "Closed" and "Cancelled". Closed is the lighter, neutral grey; Cancelled is the darker grey. The
  order card of a cancelled order shows the reason, who cancelled and when.
- **Reason:** Both are final and quiet states, so they stay inside the warm grey palette and leave red for actions. The
  reason is already stored in the history.
- **Alternatives rejected:** red for Cancelled (red is reserved for actions).
- **Affects:** `docs/product/ui-style.md`, `docs/product/screens.md`, `aggregate.md`.

### D-019 An order needs at least one line to become Ready (2026-10-05)

- **Decision:** `Mark ready` requires a line. A free visit is a line with a zero price; with a zero total no payment is
  needed to mark the order paid.
- **Reason:** No "paid" orders without work and money; a single simple guard.
- **Alternatives rejected:** allowing empty orders up to `PAID`.
- **Affects:** `docs/domain/work-order-lifecycle.md`, `state-machine.md`.

### D-018 Cancel is allowed in every status before Paid, by the manager, with a reason (2026-10-05)

- **Decision:** Cancel from `APPOINTMENT`, `WORK_ORDER`, `IN_PROGRESS`, both pauses and `READY`, only while no payment
  is recorded. The lines stay as they were. What the customer owes is settled outside the system; if the customer pays
  for the work done, the manager removes the lines that do not apply and completes the order normally.
- **Reason:** Covers a customer who changes their mind at any point and one simple transition row; money flows through
  the system when the customer pays.
- **Alternatives rejected:** cancel only before the work starts (the order can get stuck when the customer refuses to
  pay).
- **Affects:** `docs/domain/work-order-lifecycle.md`, `screens.md`, `state-machine.md`.

### D-017 A payment cannot be voided; it blocks rollback and cancel (2026-10-05)

- **Decision:** A recorded payment is never changed or cancelled. While it exists the order can only go
  `READY -> PAID -> CLOSED`.
- **Reason:** No payment status, no void operation, no payment/total mismatch. Refunds are out of scope.
- **Alternatives rejected:** voiding a payment with a reason (as shop systems do); rolling back and keeping the payment.
- **Affects:** `docs/domain/work-order-lifecycle.md`, `screens.md`.

### D-016 Rollback goes one step back; final states and mechanic limits (2026-10-05)

- **Decision:** `WORK_ORDER -> APPOINTMENT`, `IN_PROGRESS -> WORK_ORDER`, `READY -> IN_PROGRESS`, manager only, with a
  reason. No rollback from the pauses (resume first), `PAID` or `CLOSED`. `PAID` goes only to `CLOSED`; `CLOSED` and
  `CANCELLED` are final. A mechanic cannot accept the vehicle, mark paid, close, roll back or cancel.
- **Reason:** A small matrix that is easy to test; every step is in the history.
- **Alternatives rejected:** rollback to any earlier status.
- **Affects:** `docs/domain/work-order-lifecycle.md`, `state-machine.md`.

### D-015 Status transitions are an own declarative table (2026-10-05)

- **Decision:** One class holds one row per transition: source statuses, target, roles, own-orders-only, primary,
  comment required, confirm, guards. Guards return a code, not an exception.
- **Reason:** The assignment asks for explicit rules in one place; a table is readable by humans and agents and testable
  row by row.
- **Alternatives rejected:** Spring State Machine (heavy for nine statuses, harder for agents to read and test).
- **Affects:** `.claude/rules/backend/state-machine.md`, `docs/domain/work-order-lifecycle.md`.

### D-014 The order total is computed, not stored (2026-10-05)

- **Decision:** The total is a method on the domain record, computed from the lines. Lists load lines in batches.
- **Reason:** One source of truth; no column that can disagree with the lines. The screens do not sort by total.
- **Alternatives rejected:** a stored `total` column recomputed on every line change (cheaper lists, but a derived value
  to keep in sync).
- **Affects:** `.claude/rules/backend/aggregate.md`.

### D-013 Order lines are removed physically while the order is editable (2026-10-05)

- **Decision:** A line can be removed before `READY`. From `READY` on lines are read-only and are not removed.
- **Reason:** Simple, and audit of amount changes is out of scope.
- **Alternatives rejected:** a `removed` flag on the line (keeps a trace, but every query and the total need a filter).
- **Affects:** `docs/domain/entities.md`, root `CLAUDE.md`, `aggregate.md`.

### D-012 The work order is an aggregate; `Service` is renamed `ServiceItem` (2026-10-05)

- **Decision:** The order with its lines is one aggregate. Payment and status history are dependent records in the
  `workorder` package: own port and adapter, no service or web package, reference the order by id. The entity `Service`
  becomes `ServiceItem`.
- **Reason:** One version and one total cover the lines; no dependency cycle between payments and orders;
  `service/service/ServiceService` is avoided.
- **Alternatives rejected:** everything by id (invariants spread over several repositories); everything inside the
  aggregate (append-only records inside an editable object); separate packages for payment and history (a cycle with the
  order, or empty packages).
- **Affects:** `docs/domain/entities.md`, `structure.md`, `aggregate.md`, `jpa-entity.md`.

### D-011 One error shape for validation and uniqueness (2026-10-05)

- **Decision:** Validation (400) and unique violations (409) both return `errors: {field: text}`. The field and the text
  of a unique violation come from `messages.properties` by constraint name. Texts are English, like the UI, and are
  shown as they come.
- **Reason:** The frontend maps `errors` onto form fields once; no message dictionary on the frontend.
- **Alternatives rejected:** a pre-check in the service (still needs the constraint because of races); a bare 409 shown
  as a toast (contradicts `screens.md`).
- **Affects:** `exception.md`, `frontend/CLAUDE.md`.

### D-010 The transition API returns `enabled` and a reason (2026-10-05)

- **Decision:** For a user and an order the backend returns the transitions the user may ever use, each with `primary`,
  `enabled`, `commentRequired`, `confirm` and, when disabled, a reason code and message. Transitions the user can never
  use are not returned. (D-059 adds `label`, `targetStatus` and `group`.)
- **Reason:** The screens show disabled buttons with hints; this keeps all transition knowledge on the backend.
- **Alternatives rejected:** only allowed transitions with hints derived in the frontend (rules leak); hiding
  unavailable buttons (the user cannot see why).
- **Affects:** `screens.md`, `state-machine.md`, root and area `CLAUDE.md`.

### D-009 A line performer has the status rights of the responsible mechanic (2026-10-05)

- **Decision:** One "own order" criterion: responsible mechanic or performer of at least one line. Both may do every
  status change that `MECHANIC` may do.
- **Reason:** Several mechanics work on one order.
- **Alternatives rejected:** only the responsible mechanic changes the status; line-level rights.
- **Affects:** `docs/domain/operations.md`.

### D-008 Tasks belong to one area (2026-10-05)

- **Decision:** A task has one area, may depend on other tasks and may be `blocked`. A feature touching both areas is
  split, backend first. Only the orchestrator writes the plan. (Changed by D-051: the planner writes the task list in
  `context/PLAN.md`; the orchestrator owns the statuses.)
- **Reason:** Matches "a worker edits only its own area" and contract-first; no write conflicts in the plan.
- **Alternatives rejected:** one agent for a whole vertical slice; one plan file written by every worker.
- **Affects:** root `CLAUDE.md`, `context/PLAN.md`.

### D-007 `PUT /{id}` for standalone entities, one operation per section for the order (2026-10-05)

- **Decision:** Customers, vehicles, employees and price items are replaced by `PUT /{id}`. The order has no single
  `PUT`.
- **Reason:** Different roles may change different fields of an order.
- **Alternatives rejected:** one `PUT` with field checks in the service; `PATCH`.
- **Affects:** `aggregate.md`, `backend/CLAUDE.md`.

### D-006 Optimistic locking with an expected version, for the order only (2026-10-05)

- **Decision:** The work order exposes `version`; every command carries the expected version; the service compares it
  first. JPA `@Version` stays as the second line of defence.
- **Reason:** A page open for ten minutes must not overwrite newer changes ("The order was changed by another user").
- **Alternatives rejected:** `ETag` / `If-Match` (more plumbing); `@Version` alone (does not protect a stale page).
- **Affects:** `aggregate.md`, `jpa-entity.md`, `exception.md`.

### D-005 Field visibility by role is applied in the service (2026-10-05)

- **Decision:** For a user without the right the service returns the record with the field set to `null`
  (`Part.purchasePrice`). Mappers do not check roles.
- **Reason:** All other rights already live in the service through `CurrentUser`; one mechanism, unit-testable, no way
  to bypass it with a new endpoint.
- **Alternatives rejected:** role flag passed to the web mapper; two response types.
- **Affects:** `service.md`, `mapper.md`, `backend/CLAUDE.md`.

### D-004 Soft delete is a flag; the specification hides deleted records (2026-10-05)

- **Decision:** Customers and vehicles are marked deleted (a delete token since D-021). `byFilter` always excludes
  deleted rows; `findById` still returns them. The uniqueness part was replaced by D-021.
- **Reason:** Old orders must read deleted records; the filter cannot be forgotten because every list goes through
  `byFilter`.
- **Alternatives rejected:** Hibernate `@SoftDelete`.
- **Affects:** `jpa-entity.md`, `repository.md`, `backend/CLAUDE.md`.

### D-003 `@NullSource` is the one exception to "no one-case parameterized test" (2026-10-05)

- **Decision:** Null-contract tests are always `@ParameterizedTest` with `@NullSource`.
- **Reason:** One uniform shape for the null contract.
- **Alternatives rejected:** a plain `@Test` for one parameter.
- **Affects:** `testing.md`.

### D-002 Service unit tests mock `IdGenerator` (2026-10-05)

- **Decision:** `doReturn(ID).when(idGenerator).generateId()` and an exact id in the assertion.
- **Reason:** Fits strict stubs; an extra call fails `verifyNoMoreInteractions`.
- **Alternatives rejected:** `SimpleIdGenerator`.
- **Affects:** `identifier.md`, `service.md`, `testing.md`.

### D-001 Project files and the interface are English (2026-10-04)

- **Decision:** All files are in English. The UI is English.
- **Reason:** Decided by the human.
- **Alternatives rejected:** Russian interface.
- **Affects:** all files, `docs/product/screens.md`, `ui-style.md`.
