# Domain: Operations and Access

What each role can do in the system. Status changes are defined in [work-order-lifecycle.md](work-order-lifecycle.md)
and are not repeated here. Fields and deletion rules are in [entities.md](entities.md).

## Roles

- `MECHANIC`
- `MANAGER` — can do everything `MECHANIC` can.

**Own order** (for a mechanic): an order where the mechanic is the responsible mechanic or the performer of at least one
line. This lets several mechanics work on one order.

## Access

| Operation                                                                      | MECHANIC                  | MANAGER       |
|--------------------------------------------------------------------------------|---------------------------|---------------|
| Log in                                                                         | yes                       | yes           |
| Search (customers, vehicles)                                                   | yes                       | yes           |
| Filter the order list (status, intake date range, customer, mechanic, vehicle) | own orders                | all orders    |
| View customers and vehicles                                                    | yes                       | yes           |
| Create, edit, delete customers and vehicles; change vehicle owner              | no                        | yes           |
| Manage employees (create, edit, deactivate, activate)                          | no                        | yes           |
| List active mechanics (id and name only, to choose a line performer)           | yes                       | yes           |
| Change own password                                                            | yes                       | yes           |
| Reset another employee's password                                              | no                        | yes           |
| View price list (services and parts)                                           | yes                       | yes           |
| Manage price list (create, edit, deactivate, activate)                         | no                        | yes           |
| Create an order                                                                | no                        | yes           |
| Assign the responsible mechanic                                                | no                        | yes           |
| Move the appointment (change `intakeDate`, only in `APPOINTMENT`)              | no                        | yes           |
| View orders (all fields)                                                       | own orders                | all orders    |
| View status history                                                            | own orders                | all orders    |
| Change order status                                                            | per lifecycle, own orders | per lifecycle |
| Edit problem description                                                       | no                        | yes           |
| Edit diagnostic notes                                                          | own orders                | all orders    |
| Add, edit, remove order lines (only before `READY`)                            | own orders                | all orders    |
| Record a payment                                                               | no                        | yes           |

## Rules

- A payment does not change the order status. The manager records the payment, then moves the order `READY -> PAID` as a
  separate action. The transition checks that the balance is zero.
- A mechanic changes the status only of own orders. A line performer has the same status rights as the responsible
  mechanic.
- A responsible mechanic must be assigned before `WORK_ORDER -> IN_PROGRESS`. The manager can reassign the responsible
  mechanic at any time while the order is open, that is, not `CLOSED` or `CANCELLED` (for example, when a mechanic falls
  ill).
- Order lines are read-only from `READY` on (see [entities.md](entities.md)).
- A payment can be recorded only for an order in `READY` status, once, for the full order total. Partial payments and
  refunds are not supported.
- `Part.purchasePrice` is visible to `MANAGER` only. A mechanic sees everything else in own orders, including prices,
  totals and payments.
- A manager creates an employee with an initial password. Any employee can change their own password; only a manager can
  reset another employee's password.
- A deactivated employee cannot log in until a manager activates the employee again.
- An employee cannot deactivate themselves and cannot change their own role. The system always keeps at least one active
  manager: deactivating a manager, or taking the manager role from one, is rejected when no other active manager would
  remain. Two managers who try to deactivate or demote each other at the same moment must not both succeed: the second
  request is rejected.
- Deactivating a mechanic who has open orders is allowed. The orders stay; the manager reassigns the responsible
  mechanic.
- The responsible mechanic and a line performer must be active employees with the role `MECHANIC`. A mechanic chooses a
  performer from the list of active mechanics, which shows only id and name.
- A password has 10 to 72 characters and contains a letter, a digit and a symbol. It is stored only as a salted hash. A
  session lasts 12 hours; after that the employee logs in again.
- An order in `CLOSED` or `CANCELLED` is read-only in every respect: problem description, mileage, diagnostic notes, the
  responsible mechanic and lines cannot be changed. In `READY` and `PAID` the lines are locked, but the problem
  description, mileage, notes and the mechanic can still be changed.

## Prohibitions

- Do not edit this file without human approval. If a rule is missing, ask instead of guessing.

## Open Questions

- None.
