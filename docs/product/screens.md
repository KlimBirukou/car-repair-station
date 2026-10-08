# Product: Screens

**Status:** agreed. Look and colors: [ui-style.md](ui-style.md). Rights: [operations.md](../domain/operations.md). Transitions: [work-order-lifecycle.md](../domain/work-order-lifecycle.md). Fields: [entities.md](../domain/entities.md).

## Principles
- The frontend does not know the transition rules. For the current user and order the backend returns the transitions the user may use, each with `enabled` and, when it is not enabled, a short message. The UI draws exactly those actions, disables the ones that are not enabled and shows the message as the hint.
- Rights are enforced by the backend. The UI only hides what the user cannot do.
- Interface language: English. Dates: `01.10.2026`; date and time: `01.10.2026 10:30:15`. Amounts: numbers with a thousands separator and the lari sign `₾` after the number (one station, one currency).
- The manager works on a desktop. Mechanic screens must work on a tablet and a phone: one column, buttons at least 44 px high.
- A forbidden page shows "No access".

## Navigation
- Sidebar, `MANAGER`: Today, Orders, Customers, Vehicles, Price list, Employees.
- Sidebar, `MECHANIC`: My orders, Vehicles.
- Top bar (both): global search (customers by full name and phone, vehicles by license plate and VIN, results grouped) and the user menu (name and role, change password, log out).

## Screens

### Login
- Login, password, button "Log in". Errors: "Invalid login or password"; for a deactivated employee who typed the right password: "Your account is deactivated. Ask a manager to activate it."; a user whose session ended (12 hours) lands here with "Session expired. Log in again."
- No registration and no "forgot password" (a manager resets passwords).
- After login: manager goes to Today, mechanic to My orders.

### Today (MANAGER)
- "Today's appointments": orders in `APPOINTMENT` with today's intake date, by time. Row: time, customer, vehicle, problem. Actions: "Accept vehicle", "Cancel".
- "Awaiting pickup": orders in `READY`. Row: vehicle, customer, phone, total. Click opens the order.

### Orders (MANAGER)
- Switch "Table / Board" over the same data and filters. Default: table.
- Filters: status (multiple), intake date range, customer, mechanic, vehicle. Button "New order".
- Table columns: status badge, vehicle (make, model, plate), customer, mechanic, intake date, total.
- Board columns: Appointment, Accepted, In progress, Waiting (`ON_HOLD` and `WAITING_FOR_PARTS`, each with its own badge), Ready, Paid. `CLOSED` and `CANCELLED` appear only in the table. A card shows vehicle, plate, customer, mechanic, total.
- Cards cannot be dragged: a status changes only by the buttons in the order card.

### My orders (MECHANIC)
- Only own orders. Tabs: "Active" (default: `WORK_ORDER`, `IN_PROGRESS`, `ON_HOLD`, `WAITING_FOR_PARTS`, `READY`) and "All".
- Large cards: status badge, vehicle and plate, problem description, intake date.
- One big button for the next action: "Start work" (`WORK_ORDER`), "Mark ready" (`IN_PROGRESS`), "Resume work" (pauses). Other actions are in the order card.

### New order (MANAGER)
- Fields: customer (search by name or phone, or "New customer" in a dialog), vehicle (only the customer's vehicles, or "New vehicle" in a dialog), intake date and time (default now), mileage (optional), problem description, responsible mechanic (optional at creation).
- Button "Create" creates the order in `APPOINTMENT`. For a walk-in customer press "Accept vehicle" right after.
- Every visit goes through the system, including walk-in customers and towed vehicles. Orders are never deleted.

### Order card (both roles)
Header: breadcrumb, title (make, model, plate), status badge, line "intake date · mileage · mechanic".

For a cancelled order a banner under the header shows the cancellation reason, who cancelled the order and when.

Actions (top right). Show the transitions the backend returns for this user and order:

| Transition | Button | Notes |
|---|---|---|
| `APPOINTMENT -> WORK_ORDER` | Accept vehicle | primary |
| `WORK_ORDER -> IN_PROGRESS` | Start work | primary; disabled with the hint "Assign a mechanic" while no mechanic is assigned |
| `IN_PROGRESS -> ON_HOLD` | Waiting for customer | secondary |
| `IN_PROGRESS -> WAITING_FOR_PARTS` | Waiting for part | secondary |
| `ON_HOLD <-> WAITING_FOR_PARTS` | Waiting for customer / Waiting for part | secondary |
| `ON_HOLD`, `WAITING_FOR_PARTS` `-> IN_PROGRESS` | Resume work | primary |
| `IN_PROGRESS -> READY` | Mark ready | primary; confirmation dialog (see Dialogs); disabled with the hint "Add at least one line" while the order has no lines |
| `READY -> PAID` | Mark paid | primary; confirmation dialog; disabled with the hint "Record the payment first" until the balance is zero |
| `PAID -> CLOSED` | Close order | primary; confirmation dialog |
| rollback, one step back | Return to "Appointment" / "Accepted" / "In progress" | in the "More" menu; only the previous status is offered; confirmation dialog with a required reason; disabled with the hint "A payment is already recorded" once a payment exists |
| cancel | Cancel order | in the "More" menu, danger style; offered in every status before Paid; confirmation dialog with a required reason; disabled with the hint "A payment is already recorded" once a payment exists |

One primary action at a time. The "More" menu is for `MANAGER` only.

Each action comes from the backend with `label`, `targetStatus`, `group` (`PRIMARY` or `MORE`), `primary`, `enabled`, `commentRequired`, `confirm` and, when it is not enabled, a short message. The labels in the table are those backend labels. The hints in the table are those backend messages. The consequence texts of the dialogs live in the frontend strings.

A "Print" button next to the actions opens the browser print dialog. A print stylesheet hides the sidebar, the buttons and the history and keeps the header, customer, vehicle, lines, total and payment. The printed card is the invoice (see [scope.md](scope.md)); there is no separate screen.

Sections:
- **Info.** Customer (name, phone, email, link to the card), vehicle (make, model, year, plate, VIN, link to the card), mileage, problem description, diagnostic notes. Inline editing with "Save".
    - Problem description and mileage: `MANAGER`. Diagnostic notes: the responsible mechanic, line performers, `MANAGER`.
- **Work and parts.** Columns: position (with a small "service" / "part" label), quantity, price, performer, sum. Total below.
    - Buttons "Add service" and "Add part": pick from the price list; name and price are copied into the line; quantity 1; performer defaults to the responsible mechanic. Edit and remove per row.
    - From `READY` on, the buttons and row actions are hidden and a note "Lines are locked" is shown.
- **Payment** (from `READY`). Total, paid, balance. Button "Record payment" (`MANAGER`): dialog with amount (prefilled with the total, must equal it), payment method (required: "Cash", "Card", "Transfer") and date (prefilled with today, can be changed, not later than today; error "Date cannot be in the future"). Payments are entered by hand, there is no payment system integration. After saving, the payment is listed (amount, method, date, who recorded it). The dialog warns: "A saved payment cannot be changed or cancelled."
- **History.** Newest first: from-badge → to-badge, who, when, comment.

`MECHANIC` sees the same card without: editing problem description and mileage, "Record payment", the "More" menu, `Part.purchasePrice`. Editing lines and notes works only in own orders.

### Customers
- List: search by full name and phone; columns: full name, phone, email, number of vehicles. Button "New customer" (`MANAGER`).
- Card: details (edit and delete for `MANAGER`), vehicles with "Add vehicle", timeline of orders. Delete is rejected while the customer has a vehicle or an open order (see Messages).
- `MECHANIC` can open the card from an order, read-only.

### Vehicles
- List: search by license plate and VIN; columns: plate, make, model, year, owner, mileage. Button "New vehicle" (`MANAGER`).
- Card: details, owner with "Change owner" (`MANAGER`, dialog with customer search), mileage, table of orders (history). Delete for `MANAGER`, rejected while the vehicle has an open order.
- `MECHANIC`: read-only.

### Price list (MANAGER)
- Tabs "Services" and "Parts". Services: code, name, standard hours, price. Parts: SKU, name, purchase price, sale price.
- Add, edit, deactivate, activate. Switch "Show inactive" (off by default).

### Employees (MANAGER)
- Table: full name, login, role, specialization, status. Add (with initial password), edit, deactivate, activate, "Reset password". A deactivated employee cannot log in until activated. The buttons "Deactivate" and the role field are disabled on the manager's own row.

### Change password (both)
- Current password, new password, repeat. Opened from the user menu. The hint under the new password: "10 to 72 characters with a letter, a digit and a symbol".

## Dialogs
Dangerous or hard-to-undo actions never run on a single click. They open a formal dialog:
- Title: the action ("Order cancellation").
- What is affected: vehicle, plate, customer.
- The consequence in one sentence.
- A required reason field for cancel and rollbacks (error "Enter a reason").
- Buttons: "Back" (closes without changes) and the action button named after the action ("Cancel order", "Return to In progress"), danger style for cancel.

| Action | Consequence text |
|---|---|
| Cancel order | "The order will be cancelled. This cannot be undone." |
| Return to a status | "The order will return to the status “{status}”. This will be recorded in the history." |
| Mark ready | "The order lines will be locked." |
| Mark paid | "The order will be marked as paid. A payment cannot be undone in the system." |
| Close order | "The order will be closed. No changes are possible after that." |
| Delete or deactivate | "The record will be hidden from search; the order history will be kept." |

Reversible actions (pauses, resume work, accept vehicle, start work) have no confirmation. The payment and change-owner dialogs are described in their screens.

## Messages and states
- Validation errors under the field: "Required field", "Invalid email", "Too long, maximum {max} characters", "Year must be between 1900 and {next}", "Value cannot be negative", "Quantity must be greater than 0", "Password must be 10 to 72 characters and contain a letter, a digit and a symbol", "Current password is incorrect".
- Duplicate email, VIN, login, code or SKU: error under the field, e.g. "A customer with this email already exists".
- Another user changed the order meanwhile: "The order was changed by another user. Refresh the page."
- Deleting a customer is rejected with "The customer still has vehicles or open orders. Change the owner or delete the vehicles first." Deleting a vehicle is rejected with "The vehicle has an open order."
- An employee deactivating themselves or changing their own role is rejected with "You cannot deactivate yourself or change your own role."
- Other backend rejections (forbidden transition, unmet condition): short toast with the reason.
- Success: short toast. Saving buttons show a loading state.
- Empty list: "Nothing found"; a customer without vehicles: "This customer has no vehicles yet" and the button "Add vehicle".
- Deleted or inactive records are not selectable but stay visible in history with the mark "(deleted)" / "(inactive)".

## Prohibitions
- Do not hardcode transition rules in the frontend.
- Do not edit this file without human approval.

## Open Questions
- None.
