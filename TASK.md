# TASK: Car Repair Station

The entry description of the product for the planner and for anyone new to the project. It summarizes and points to the detailed files under `docs/`. **Where this file differs from `docs/`, the files in `docs/` win.** Do not copy rules from here into code: read the file that owns the rule.

## 1. Application
An internal web CRM for one car service station. It replaces Excel and paper logs: customers, vehicles, work orders, services, parts and payments. It keeps the history of every vehicle and gives a transparent order lifecycle. Users are employees only (`MANAGER`, `MECHANIC`); a customer is a record, not a user. Every visit is recorded, including walk-in customers and towed vehicles.

Details: `docs/product/scope.md` (read first), `docs/domain/entities.md`.

## 2. Roles
- `MANAGER`: works on a desktop; manages customers, vehicles, employees, price list; creates orders, assigns mechanics, records payments, moves orders through every status, rolls back and cancels. Can do everything a mechanic can.
- `MECHANIC`: works on a tablet or a phone; sees and changes only own orders (responsible mechanic, or performer of at least one line); edits lines and diagnostic notes; moves own orders between working statuses.

Details: `docs/domain/operations.md`.

## 3. Main user flows
1. **Login.** An employee logs in by login and password (session 12 hours). A deactivated employee cannot log in. A manager lands on Today, a mechanic on My orders.
2. **Appointment to closed order (manager).** Create an order for a customer and a vehicle (new customer and vehicle can be created on the way) → Accept vehicle → assign a mechanic → Start work → add service and part lines → Mark ready → Record payment → Mark paid → Close order.
3. **Walk-in customer.** Create the order and press "Accept vehicle" right away.
4. **Mechanic's day.** My orders → open an own order → start work, add lines and diagnostic notes, put the order on hold ("Waiting for customer" / "Waiting for part"), resume, mark ready.
5. **Cancellation and rollback.** A manager cancels an order before payment, or returns it one step back, with a required reason. A recorded payment blocks both.
6. **Price list and employees.** A manager adds, edits, deactivates and activates services, parts and employees; resets passwords.
7. **Search and history.** Global search of customers (name, phone) and vehicles (plate, VIN); a vehicle card shows its order history; a customer card shows vehicles and an order timeline.
8. **Concurrent change.** If someone else changed the order, the stale change is rejected with a clear message.
9. **Print.** The order card can be printed; the printed card serves as the invoice.

Details: `docs/product/screens.md`, `docs/domain/work-order-lifecycle.md`.

## 4. Business rules (summary)
- Nine statuses and eleven transition rules, checked in exactly one place on the backend. The frontend draws the transitions the backend returns, with `enabled` and a message. (`docs/domain/work-order-lifecycle.md`)
- Order lines are editable only before `READY`; the name and price of a line are snapshots; totals are derived, never entered.
- One full payment per order, only in `READY`; it never changes the status; it cannot be changed or cancelled. The payment date is prefilled with today and cannot be in the future.
- Every successful transition is written to the status history.
- Orders, payments and history are never deleted; customers and vehicles are soft-deleted; employees, services and parts are deactivated.
- A customer with a non-deleted vehicle or an open order cannot be deleted; a vehicle with an open order cannot be deleted. An employee cannot deactivate themselves or change their own role. (`docs/domain/entities.md`, `docs/domain/operations.md`)
- Unique among non-deleted records: customer email (optional), vehicle VIN (free format), employee login, service code, part SKU.
- `Part.purchasePrice` is visible to `MANAGER` only.
- A password has 10 to 72 characters with a letter, a digit and a symbol, and is stored only as a salted hash.
- Amounts are in lari (`₾`); times are in the station zone `Asia/Tbilisi`; the interface is English.

## 5. Technology constraints
- Backend: Java 25, Spring Boot 4, Gradle, H2, Liquibase (agnostic YAML, so PostgreSQL can replace H2 later). Package-by-feature with ports and adapters. See `backend/CLAUDE.md` and `.claude/rules/backend/`.
- Frontend: React, TypeScript, Vite, Ant Design 6, a client generated from the backend OpenAPI contract. See `frontend/CLAUDE.md`.
- Monorepo: `backend/`, `frontend/`, `docs/`. The areas talk only through the HTTP API under `/api/v1`. The OpenAPI file is the contract.
- Local infrastructure: none. The backend and the frontend run locally; the database is H2 (D-052).
- Look and feel: `docs/product/ui-style.md`.
- Development is done by agents (`.claude/agents/`) under the rules in `CLAUDE.md`; no agent commits or pushes.

## 6. Data the system starts with
A large living development seed (about 60 orders in every status, employees, price list, customers, vehicles), loaded in development only. See `docs/product/seed-data.md`.

## 7. Acceptance criteria
The product is accepted when:
1. Both gates are green: `./gradlew check` (backend) and `npm run check` (frontend).
2. A fresh database starts with the schema and the seed; the seed passes its consistency test.
3. Every status transition of `docs/domain/work-order-lifecycle.md` is available exactly to the roles and under the conditions listed there, and no other transition is possible; each is covered by a test.
4. A mechanic cannot see or change an order that is not own, and never receives `Part.purchasePrice`; a test proves it.
5. A stale order change is rejected and nothing is overwritten.
6. Validation, uniqueness and soft-delete rules of `docs/domain/entities.md` hold for every entity.
7. Every screen of `docs/product/screens.md` exists with its buttons, dialogs and messages; the frontend contains no transition rules.
8. The Playwright flows pass on the seeded stack: a manager takes an order from creation to closing; a mechanic sees only own orders; an order is cancelled with a reason.

## 8. Out of scope and postponed
Out of scope: customer as a user, a separate invoice entity, warehouse and stock accounting, employee rate, per-job time stamps, audit of amount changes, partial payments and refunds, payment system integration, a team of mechanics per order, history of vehicle owners, a second database.
Postponed: photos of vehicles and orders; the customer cabinet.
Full list: `docs/product/scope.md`. Nothing from it is planned or built.

## 9. Open points
Listed in `docs/decisions.md`, section "Open". The planner reports a task that depends on one of them and does not guess.
