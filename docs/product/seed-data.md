# Product: Seed Data

**Status:** agreed on 2026-10-05. How the seed files are built: `.claude/rules/backend/liquibase.md`.

The system starts with data, so that every screen shows something and the product can be checked without typing. The
seed is loaded in the development environment only. It is data for a test project: names, emails, phone numbers and
license plates are invented but look plausible for a local station (the currency is lari). Names are written in Latin
script.

## Content

| Data        | Amount                                              | Notes                                                                                                                                                                                                                                  |
|-------------|-----------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Employees   | 2 `MANAGER`, 5 `MECHANIC`, 1 deactivated `MECHANIC` | logins `manager1`, `manager2`, `mechanic1` to `mechanic6`; `mechanic6` is the deactivated one                                                                                                                                          |
| Services    | 25                                                  | code, name, standard hours, price; 2 of them inactive                                                                                                                                                                                  |
| Parts       | 50                                                  | SKU, name, purchase price lower than the sale price; 3 inactive                                                                                                                                                                        |
| Customers   | 30                                                  | every customer has a phone; 10 have no email; 2 are deleted (they have no live vehicle); 3 live customers have no vehicle (former owners: they gave the vehicle away after a transfer); 25 live customers have vehicles, 5 of them two |
| Vehicles    | 31                                                  | 30 live and 1 deleted (it belonged to a deleted customer); 28 have a 17-character VIN and 3 a non-standard one (an old or imported vehicle); years from 1995 to the current year                                                       |
| Work orders | about 60                                            | see below                                                                                                                                                                                                                              |

## Work orders

At least this many in each status:

| Status              | Orders | Notes                                                                                         |
|---------------------|--------|-----------------------------------------------------------------------------------------------|
| `APPOINTMENT`       | 4      | 3 of them for the generation day, at different times                                          |
| `WORK_ORDER`        | 3      | one has no responsible mechanic yet                                                           |
| `IN_PROGRESS`       | 6      |                                                                                               |
| `ON_HOLD`           | 3      |                                                                                               |
| `WAITING_FOR_PARTS` | 3      |                                                                                               |
| `READY`             | 5      | one of them already has its payment recorded                                                  |
| `PAID`              | 4      |                                                                                               |
| `CLOSED`            | 25     | spread over the previous six months                                                           |
| `CANCELLED`         | 5      | cancelled at different stages, each with a reason; one is a no-show with the reason "No show" |

Every order has a customer, a vehicle of that customer, a problem description in plain words, an intake date and a
responsible manager. Every order has a unique number, from 1001 up, in the order of creation. From `IN_PROGRESS` on it
has a responsible mechanic. Lines:

- `APPOINTMENT` and `WORK_ORDER` orders may have none; `READY`, `PAID` and `CLOSED` orders have at least one.
- A mix of service and part lines; some quantities are fractional (litres); the performer varies.
- Some line prices differ from the current price list, to show that lines keep a snapshot.
- Two orders belong to two of the three former owners: the vehicle was transferred to a new owner after their visit.

## Consistency rules

A test checks them.

1. The status of an order equals the target of its newest history record. The oldest record of every order is the
   creation record (from empty, to `APPOINTMENT`, made by a manager). Every later step is a transition allowed by
   `docs/domain/work-order-lifecycle.md`, made by an employee who may do it.
2. A payment exists only for `READY`, `PAID` and `CLOSED` orders. `PAID` and `CLOSED` orders have exactly one, equal to
   the order total, recorded by a manager; the methods vary. A cancelled order has none.
3. A rollback or a cancellation history record has a comment.
4. A vehicle's mileage equals the mileage of its order with the latest intake date that has one, and the order mileages
   of a vehicle never decrease over time.
5. An open order (neither `CLOSED` nor `CANCELLED`) never refers to a deleted customer, a deleted vehicle or a
   deactivated employee. The deleted and inactive records appear only in older orders, to show the "(deleted)" and "
   (inactive)" marks.
6. Every line refers to exactly one service or part; the quantity is above 0; prices are not negative; every validation
   and uniqueness rule of `docs/domain/entities.md` holds.
7. Responsible mechanics and line performers have the role `MECHANIC`.
8. Emails and logins are stored in lower case, VINs in upper case, all trimmed.
9. Order numbers are unique and ascend with the creation record. The next number the system assigns is above the highest
   seeded one.

## Dates

Dates are fixed in the files, placed around the day the seed was generated: orders over the previous six months,
appointments for that day and the next days. The Today screen empties as time passes. To refresh it, regenerate the
dates: the seed changesets re-run when a file changes.

## Accounts

All employees share one development password, `Repair-Dev-2026`. The seed stores only its BCrypt hash. It follows the
password policy. The deactivated mechanic `mechanic6` cannot log in. The password must never be used outside
development.

## Prohibitions

- Do not edit this file without human approval. If a rule is missing, ask instead of guessing.

## Open Questions

- None.
