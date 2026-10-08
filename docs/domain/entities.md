# Domain: Entities

**Status:** agreed (v1). Amended: aggregates, removal of order lines, `ServiceItem`, optional email, free-format VIN, `active` (see `docs/decisions.md`).

Business view only. Technical fields (`id`, `version`, the soft-delete token) and storage details are defined in the "how" rules, not here. A timestamp with business meaning (for example `intakeDate`, `changedAt`) is a domain field and is listed below.

## Types
General types, not tied to any language or database:
- `string` — short text; `text` — long free-form text
- `integer` — whole number; `decimal` — number with a fractional part
- `money` — amount in the station's single currency (lari, shown with `₾` on screens)
- `date`; `datetime` — date with time
- `enum` — one value from a fixed list
- `reference` — link to another entity

All fields are required unless marked `(optional)`.

## Entities

### Customer
- `fullName` — string
- `phone` — string
- `email` — string (optional)

### Vehicle
- `vin` — string. Free format: it does not have to be a standard 17-character VIN
- `licensePlate` — string
- `make` — string
- `model` — string
- `year` — integer
- `color` — string (optional)
- `mileage` — integer, kilometres (optional). Latest known value, updated from the order's `mileage`
- `customer` — reference to Customer, the current owner

### Employee
- `fullName` — string
- `role` — enum `MECHANIC` | `MANAGER`
- `login` — string
- `passwordHash` — string. Only employees log in, by password
- `specialization` — string (optional)
- `active` — boolean. A deactivated employee cannot log in

### ServiceItem (price list)
Shown on screens as "Services". Named `ServiceItem` so that it does not clash with the `service` layer in code.
- `code` — string
- `name` — string
- `standardHours` — decimal. Reference only: estimated duration of the work, not used in calculations
- `price` — money
- `active` — boolean

### Part (price list)
- `sku` — string
- `name` — string
- `purchasePrice` — money
- `salePrice` — money
- `active` — boolean

### WorkOrder
- `intakeDate` — datetime. When the customer brings the vehicle (planned time while the status is `APPOINTMENT`)
- `mileage` — integer, kilometres (optional). Odometer reading at intake; may be empty while the status is `APPOINTMENT`
- `status` — enum, see [work-order-lifecycle.md](work-order-lifecycle.md); initial `APPOINTMENT`
- `vehicle` — reference to Vehicle
- `customer` — reference to Customer. Owner at the moment the order was created; never changes, even if the vehicle later changes owner
- `problemDescription` — text. The problem as described by the customer (for example "knocking noise at the front on bumps")
- `diagnosticNotes` — text (optional)
- `manager` — reference to Employee, the responsible service advisor
- `mechanic` — reference to Employee, the responsible mechanic (optional until assigned). Several mechanics can work on one order: each line may have its own `performer`
- total — money, derived: sum of line totals, not entered by hand

### WorkOrderLine
- `workOrder` — reference to WorkOrder
- `serviceItem` or `part` — reference to ServiceItem or Part, exactly one of them
- `name` — string. Snapshot of the service/part name at the time of adding
- `quantity` — decimal, greater than 0. May be fractional (for example litres of oil)
- `price` — money. Snapshot of the unit price at the time of adding; later price list changes do not affect it
- `performer` — reference to Employee (optional)
- line total — money, derived: `quantity` × `price`

### Payment
- `workOrder` — reference to WorkOrder
- `amount` — money, equal to the order total (no partial payments or refunds)
- `date` — date
- `method` — enum `CASH` | `CARD` | `TRANSFER`
- `recordedBy` — reference to Employee, who recorded the payment

No payment system integration: the system does not verify who pays. It stores the employee who recorded the payment, the method, and the order (and so its customer).

### WorkOrderStatusHistory
- `workOrder` — reference to WorkOrder
- `fromStatus` — enum
- `toStatus` — enum
- `employee` — reference to Employee
- `changedAt` — datetime
- `comment` — text (optional)

## Relations
- Customer 1 — N Vehicle (current owner)
- Customer 1 — N WorkOrder
- Vehicle 1 — N WorkOrder
- Employee 1 — N WorkOrder (as manager and as mechanic)
- Employee 1 — N WorkOrderLine (as performer)
- Employee 1 — N Payment (as the one who recorded it)
- WorkOrder 1 — N WorkOrderLine, Payment, WorkOrderStatusHistory
- WorkOrderLine N — 1 ServiceItem or Part

## Aggregates
- WorkOrder is an aggregate root. WorkOrderLine is part of it: it exists only inside its order and is changed only through the order.
- Payment and WorkOrderStatusHistory depend on the order: they are only added, never changed or deleted, and refer to the order by id. One order has at most one payment and a short status history, so both are small collections.
- The work order is changed by several users (manager, mechanics), so it is version-controlled: a change made on a stale copy is rejected (see the message in `docs/product/screens.md`).
- Every other entity is standalone.

## Uniqueness
- Unique: `Customer.email`, `Vehicle.vin`, `Employee.login`, `ServiceItem.code`, `Part.sku`.
- A customer without an email does not take part in the email uniqueness.
- Emails and logins are stored trimmed and in lower case, VINs trimmed and in upper case, so that the comparison ignores case.
- Not unique: `Customer.phone` (a family may share a number), `Vehicle.licensePlate` (plates get re-registered).
- Uniqueness applies to non-deleted records only.

## Deletion
- Customer, Vehicle: soft delete. Deleted records are hidden from search and selection but stay linked from old orders.
- Employee, ServiceItem, Part: deactivated instead of deleted. Inactive ones cannot be chosen for new orders but stay linked from old orders.
- WorkOrder, Payment, WorkOrderStatusHistory: never deleted. An order is cancelled, not removed.
- WorkOrderLine: can be removed while the order is editable (before `READY`). From `READY` on lines are read-only and are not removed. After a rollback to `IN_PROGRESS` they are editable and removable again.

## Rules
- Changing a vehicle's owner is an explicit operation on the existing vehicle. It does not touch existing orders. A duplicate VIN is rejected.
- When an order's `mileage` is set, the vehicle's `mileage` is updated to the same value.
- Order lines (and therefore the total) can be changed only while the order status is `APPOINTMENT`, `WORK_ORDER`, `IN_PROGRESS`, `ON_HOLD` or `WAITING_FOR_PARTS`. From `READY` on (`READY`, `PAID`, `CLOSED`, `CANCELLED`) they are read-only. A manager rollback `READY -> IN_PROGRESS` makes them editable again.
- Search: customers by full name and phone; vehicles by license plate and VIN.
- Order list filters: status, intake date range, customer, mechanic, vehicle.

## Validation
- Required string and text fields must not be blank.
- `Customer.email`, when present, must be a valid email address.
- `Vehicle.vin` has no fixed length or format; it must not be blank.
- `Vehicle.year` must be between 1900 and next calendar year.
- `Vehicle.mileage` and `WorkOrder.mileage` must not be negative.
- All prices (`price`, `purchasePrice`, `salePrice`) must not be negative.
- `WorkOrderLine.quantity` and `Payment.amount` must be greater than 0.

## Prohibitions
- Do not edit this file without human approval. If a rule is missing, ask instead of guessing.

## Open Questions
- None.
