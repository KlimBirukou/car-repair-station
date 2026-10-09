---
paths:
  - "backend/src/**/workorder/**/*.java"
---
# Rule: Status Transitions

## Default
Unless explicitly overridden by the project specification:

- **What:** The status changes of an order are a declarative table in one class. The table is the only place that says which status can follow which, who may do it, under which conditions and whether a comment is needed. The lifecycle document is its specification: one row for each transition defined there.
- **When:** For every status change of the work order.
- **Where:** `workorder/service/`. `WorkOrderStatus` (enum) is in the feature root. It is the only owner of the status predicates: `linesEditable()` (`APPOINTMENT`, `WORK_ORDER`, `IN_PROGRESS`, `ON_HOLD`, `WAITING_FOR_PARTS`), `isOpen()` (everything except `CLOSED` and `CANCELLED`), `acceptsPayment()` (`READY` only) and the static `open()` (the set of open statuses, used by the deletion guards).
    - `WorkOrderTransition` is a row. `WorkOrderTransitions` holds the rows, lists the options and checks a requested transition.
    - Supporting types: `TransitionGuard`, `GuardResult`, `TransitionContext`, `TransitionOption`.
- **How (row):** A row has: `id` (the API name, `UPPER_SNAKE`), the set of source statuses, the target status, `label` (the button text), `group` (`PRIMARY` or `MORE`), the roles, `ownOrdersOnly` for `MECHANIC`, `primary`, `commentRequired`, `confirm` and a list of guards. `label`, `group`, `primary` and `confirm` come from `docs/product/screens.md`, the rest from `docs/domain/work-order-lifecycle.md` and `docs/domain/operations.md`. A transition with several source statuses and one target (resume work, cancel) is one row; a rollback is one row per step. Rows are built with a small builder so that each row reads on its own lines.
- **How (guard):** A guard is a pure function of `TransitionContext` (the order, the paid amount, the current user). It returns `GuardResult.ok()` or `GuardResult.fail(code)`. The code is the key `transition.<code>` in `messages.properties` and holds the short hint for the user. A guard does not throw, does not touch a repository and has no side effects: the service loads the data into the context first. Guards today: `MECHANIC_ASSIGNED`, `LINES_PRESENT`, `BALANCE_ZERO`, `NO_PAYMENT_RECORDED`.
- **How (options):** `optionsFor(context)` returns the rows that start from the order's current status and that the current user may ever use on this order (role and own order). A row the user can never use is not returned (a mechanic never gets a rollback). The guards run for every returned row: `enabled` is true when all pass, otherwise `reasonCode` is the first failing code and `message` is its text. The order response carries the options as `transitions`: `id`, `label`, `targetStatus`, `group`, `primary`, `enabled`, `commentRequired`, `confirm`, `reasonCode`, `message`. It also carries `linesEditable`, the value of `WorkOrderStatus.linesEditable()`, so that the frontend does not repeat the status rule, and `permissions` (see the Aggregates rule). A list row carries `transitions` and `version` too.
- **How (perform):** `POST /{id}/transitions` with `transition`, `version` and `comment`. The service loads the order, compares the version (see the Aggregates rule), builds the context and finds the row:
    - unknown id → `INVALID`, `error.unknown-transition`
    - the row does not start from the current status → `CONFLICT`, `error.transition-not-available`
    - the user may never use the row → `FORBIDDEN`
    - a guard fails → `CONFLICT` with the guard's code and message
    - a required comment is blank → `INVALID` with `errors.comment`

  Otherwise it sets the new status, writes the history record (from, to, user, `changedAt` from the injected `Clock`, comment) through the history port, saves the order and logs. All in one transaction.
- **Lines and commands:** `WorkOrderStatus.linesEditable()` is the only definition of "lines are editable". A line command in a read-only status throws `LinesLockedException` (`CONFLICT`, `error.lines-locked`). `isOpen()` is the only definition of "the order may still be edited" (info, diagnostic notes, mechanic): such a command in a closed or cancelled order throws `OrderClosedException` (`CONFLICT`, `error.order-closed`). `acceptsPayment()` is the only definition of "a payment may be recorded".
Example (rows and a guard):

```java
static final List<WorkOrderTransition> ALL = List.of(
        row("ACCEPT_VEHICLE", Set.of(APPOINTMENT), WORK_ORDER)
                .roles(MANAGER).primary().build(),
        row("START_WORK", Set.of(WORK_ORDER), IN_PROGRESS)
                .roles(MANAGER, MECHANIC).ownOrdersOnly().primary()
                .guard(MECHANIC_ASSIGNED).build(),
        row("MARK_PAID", Set.of(READY), PAID)
                .roles(MANAGER).primary().confirm()
                .guard(BALANCE_ZERO).build());

static final TransitionGuard MECHANIC_ASSIGNED = context ->
        Objects.nonNull(context.order().mechanicId())
                ? GuardResult.ok()
                : GuardResult.fail("mechanic-required");
```

```properties
transition.mechanic-required=Assign a mechanic
transition.payment-required=Record the payment first
transition.lines-required=Add at least one line
transition.payment-recorded=A payment is already recorded
```

## Why
- The assignment asks for transition logic in one place, as explicit rules for each edge of the diagram. A table can be read, tested row by row and compared with the lifecycle document.
- The frontend draws its buttons from the options, so it needs no transition knowledge: not which action is primary, not which one needs a confirmation, not the hint text.
- A guard that only returns a code keeps the reason and its text in one place and is trivial to unit-test.
- Spring State Machine is heavy for nine statuses and harder for agents to read and test.

## Exceptions
The specification may require another mechanism. Follow it.

## Prohibitions
- No comparison or assignment of the order status outside `WorkOrderStatus`, the table and `transition(...)` of `WorkOrderServiceImpl`: no `if` or `switch` on the status in controllers, mappers, other services or guards. Everyone else asks the predicates `linesEditable()`, `isOpen()`, `acceptsPayment()` or the set `open()`.
- No second table, enum or map that decides transitions.
- No change of the status through `toBuilder()` anywhere but `transition(...)`.
- No guard with a repository, a side effect or a thrown exception.
- No row that is absent from the lifecycle document, and no row for a transition marked "not defined" there: ask.
- No transition rule, flag or hint text in the frontend.

## Special Cases
- Rollbacks and cancel need a comment, a confirmation and `MANAGER`. The rows that start from `READY` (rollback, cancel) have the guard `NO_PAYMENT_RECORDED`. Source statuses come from the lifecycle document.
- Data outside the order (the balance) reaches a guard through `TransitionContext`. The service loads it before it calls the table.
- A list that shows actions (the mechanic's "My orders", Today) carries `transitions` too. Every guard must work with data the adapter loads in batch: the paid amount of a page comes from one call of the payment port (`findAllByOrderIds`, see the Repositories rule) and goes into `TransitionContext`.

## Infrastructure
- `messages.properties`: `transition.<code>` keys for the guard hints.
- Injected `Clock`.

## Verification
- Unit test of the table: the set of row ids equals this literal list (the lifecycle document has no ids), and each row has the literal sources and target:
```text
ACCEPT_VEHICLE                  APPOINTMENT -> WORK_ORDER
START_WORK                      WORK_ORDER -> IN_PROGRESS
WAIT_FOR_CUSTOMER               IN_PROGRESS -> ON_HOLD
WAIT_FOR_PART                   IN_PROGRESS -> WAITING_FOR_PARTS
SWITCH_TO_WAITING_FOR_PART      ON_HOLD -> WAITING_FOR_PARTS
SWITCH_TO_WAITING_FOR_CUSTOMER  WAITING_FOR_PARTS -> ON_HOLD
RESUME_WORK                     ON_HOLD, WAITING_FOR_PARTS -> IN_PROGRESS
MARK_READY                      IN_PROGRESS -> READY
MARK_PAID                       READY -> PAID
CLOSE_ORDER                     PAID -> CLOSED
ROLLBACK_TO_APPOINTMENT         WORK_ORDER -> APPOINTMENT
ROLLBACK_TO_ACCEPTED            IN_PROGRESS -> WORK_ORDER
ROLLBACK_TO_IN_PROGRESS         READY -> IN_PROGRESS
CANCEL                          APPOINTMENT, WORK_ORDER, IN_PROGRESS, ON_HOLD, WAITING_FOR_PARTS, READY -> CANCELLED
```
- Integration test: every one of the 14 rows is performed once by an allowed user, and the status and the history record are checked. Negative cases: `PAID -> READY`, every move from `CLOSED` and from `CANCELLED`, a skipped step (`APPOINTMENT -> IN_PROGRESS`).
- Unit tests of the predicates: `linesEditable()`, `isOpen()` and `acceptsPayment()` for every status, written out as literals.
- Unit test for every status × role (manager, own mechanic, other mechanic): the expected options are written out as literals.
- Unit test for every guard: pass and fail.
- Unit tests of perform: success writes exactly one history record and sets the status; every failure listed above throws the right exception and writes nothing; a stale version writes nothing.
- ArchUnit: `WorkOrderTransitions` is used only by `WorkOrderServiceImpl`; guards do not depend on `..repository..`.
- Reviewer checklist: search for `WorkOrderStatus.` and `.status(` outside the allowed classes; every row is in the lifecycle document and has a test.
