# Domain: Work Order Lifecycle

**Status:** agreed on 2026-10-05.
from [screens.md](../product/screens.md), [operations.md](operations.md), [entities.md](entities.md)
and [task.md](../product/original-requirements.md), and completed with the human's decisions (see `docs/decisions.md`).

Who may do what in general: [operations.md](operations.md). Fields: [entities.md](entities.md). Buttons and
dialogs: [screens.md](../product/screens.md).

## Statuses

| Status              | UI label             | Order lines | Notes                                                                    |
|---------------------|----------------------|-------------|--------------------------------------------------------------------------|
| `APPOINTMENT`       | Appointment          | editable    | initial; intakeDate is the planned time; a manager can move it           |
| `WORK_ORDER`        | Accepted             | editable    | the vehicle is accepted                                                  |
| `IN_PROGRESS`       | In progress          | editable    |                                                                          |
| `ON_HOLD`           | Waiting for customer | editable    | pause: waiting for the customer's decision, for example about extra work |
| `WAITING_FOR_PARTS` | Waiting for part     | editable    | pause: waiting for a part                                                |
| `READY`             | Ready                | read-only   | waiting for pickup; the payment is recorded here                         |
| `PAID`              | Paid                 | read-only   | goes only forward, to `CLOSED`                                           |
| `CLOSED`            | Closed               | read-only   | final                                                                    |
| `CANCELLED`         | Cancelled            | read-only   | final; the lines stay as they were                                       |

On the board both pauses share one column and keep their own badges (see screens.md). The pause labels are taken from
the buttons.

## Transitions

| #  | Transition                                                                                                 | Button                                  | Who                       | Condition                                                                 | Comment  |
|----|------------------------------------------------------------------------------------------------------------|-----------------------------------------|---------------------------|---------------------------------------------------------------------------|----------|
| 1  | `APPOINTMENT -> WORK_ORDER`                                                                                | Accept vehicle                          | `MANAGER`                 | none                                                                      | no       |
| 2  | `WORK_ORDER -> IN_PROGRESS`                                                                                | Start work                              | `MANAGER`, own `MECHANIC` | a responsible mechanic is assigned                                        | no       |
| 3  | `IN_PROGRESS -> ON_HOLD`                                                                                   | Waiting for customer                    | `MANAGER`, own `MECHANIC` | none                                                                      | no       |
| 4  | `IN_PROGRESS -> WAITING_FOR_PARTS`                                                                         | Waiting for part                        | `MANAGER`, own `MECHANIC` | none                                                                      | no       |
| 5  | `ON_HOLD -> WAITING_FOR_PARTS` and `WAITING_FOR_PARTS -> ON_HOLD`                                          | Waiting for part / Waiting for customer | `MANAGER`, own `MECHANIC` | none                                                                      | no       |
| 6  | `ON_HOLD`, `WAITING_FOR_PARTS` `-> IN_PROGRESS`                                                            | Resume work                             | `MANAGER`, own `MECHANIC` | none                                                                      | no       |
| 7  | `IN_PROGRESS -> READY`                                                                                     | Mark ready                              | `MANAGER`, own `MECHANIC` | the order has at least one line; confirmation, the lines become read-only | no       |
| 8  | `READY -> PAID`                                                                                            | Mark paid                               | `MANAGER`                 | the balance is zero (the payment is recorded); confirmation               | no       |
| 9  | `PAID -> CLOSED`                                                                                           | Close order                             | `MANAGER`                 | confirmation                                                              | no       |
| 10 | rollback one step: `WORK_ORDER -> APPOINTMENT`, `IN_PROGRESS -> WORK_ORDER`, `READY -> IN_PROGRESS`        | Return to the previous status           | `MANAGER` only            | from `READY`: no payment is recorded; confirmation                        | required |
| 11 | cancel: `APPOINTMENT`, `WORK_ORDER`, `IN_PROGRESS`, `ON_HOLD`, `WAITING_FOR_PARTS`, `READY` `-> CANCELLED` | Cancel order                            | `MANAGER` only            | no payment is recorded; confirmation                                      | required |

Rows 3 to 7 for `MECHANIC` follow the mechanic's screens. `MANAGER` in rows 8 and 9 is inferred from the Rules in
operations.md. Row 5 is two transitions and row 10 is three. A mechanic cannot accept the vehicle, mark the order paid,
close it, roll it back or cancel it.

## Rules

- Transition rules are checked in exactly one place. For a given order and user the backend returns the transitions the
  user may use, each with `enabled` and a reason; the frontend draws its buttons from them.
- Every successful transition writes a history record: from, to, who, when, comment.
- Order lines are read-only from `READY` on, including `PAID`, `CLOSED` and `CANCELLED`. A rollback
  `READY -> IN_PROGRESS` makes them editable again (entities.md).
- A payment is recorded only in `READY`, once, for the full total. It does not change the status (operations.md). A
  recorded payment cannot be changed or cancelled, and while it exists the order can be neither rolled back nor
  cancelled: it can only go `READY -> PAID -> CLOSED`. Record a payment only when the money is received.
- A free visit (for example a consultation) is an order with a line whose price is zero. With a zero total the balance
  is zero, so no payment is needed to mark the order paid.
- A rollback goes one step back along the main chain. From a pause use "Resume work" first.
- Cancel is for a customer who changes their mind at any point before payment. The reason is required and is shown on
  the order card. What the customer owes for work done or parts used is settled outside the system. If the customer pays
  for the work done, remove the lines that do not apply and complete the order normally instead of cancelling it.
- Forward moves follow the main chain. `CLOSED` and `CANCELLED` are final.
- A mechanic changes the status only of own orders. A line performer has the same status rights as the responsible
  mechanic (operations.md).
- Creating an order is not a transition, but it writes the first history record: from empty to `APPOINTMENT`, by the
  employee who created the order.
- A customer who did not come: the manager cancels the order (row 11) with a reason such as "No show". The system does
  not cancel or move appointments by itself.
- In `CLOSED` and `CANCELLED` nothing in the order changes any more (operations.md).

## Prohibitions

- Do not edit this file without human approval. If a rule is missing, ask instead of guessing.

## Open Questions

- None.
