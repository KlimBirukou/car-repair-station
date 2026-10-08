# Car Repair Station — application concept - the student is free to add or remove functionality, since the main goal is to learn AI SDLC; this description is only a starting point for further development by the student

## 1. Purpose and context

A web application for managing the operational activities of a car service station: customers, vehicles, requests, jobs, spare parts, payments. The goal is to replace Excel and paper logs with a single system that keeps a history for each vehicle and provides a transparent order lifecycle.

## 2. User roles

- **Administrator / service advisor** — creates customers and vehicles, opens orders, issues invoices.
- **Mechanic** — sees assigned tasks, records completed jobs, spare parts consumption, time stamps.
- **Customer** — vehicle owner, linked to orders.

## 3. Main domains and entities

**Customer:** full name, phone, email, visit history, list of vehicles.

**Vehicle:** make, model, year, VIN, license plate, mileage, color, photo, link to customer (1 customer → N vehicles).

**Visit / WorkOrder:** the key object. Contains: intake date, vehicle, description of the customer's complaint, set of jobs (LineItems: service/spare part, quantity, price, performer), total, status, responsible service advisor, assigned mechanic, diagnostic notes, attached photos. (the list can be simplified for learning purposes)

**Service / price list (Service):** code, name, standard hours, price.

**Part:** SKU, name, purchase/sale price.

**Payment:** amount, date, link to order.

**Employee:** role, rate, specialization.

## 4. Visit lifecycle (state machine)

As part of the task, it is worth explicitly drawing a state diagram. Proposed model:

```
Appointment (booking)
   → WorkOrder (work order opened)
       → InProgress (in progress)
           → Ready (ready, waiting for customer)
               → Paid (paid)
                   → Closed (closed)
```

Additionally, it is worth providing for:

- **Cancelled** — cancellation from any stage before InProgress (with a reason specified).
- **OnHold / WaitingForParts** — pause from InProgress (waiting for a spare part or the customer's decision).

Transition rules: forward only along the main chain; rollbacks are allowed only to the administrator with an entry in the audit log; it is not possible to move to Paid with a non-zero balance; Closed is a terminal state.

## 5. Functional requirements by block

**Frontend (for example React/Next.js):**

- List and card of a customer with their vehicles and visit timeline.
- Vehicle card with full job history, mileage, photos.
- Table of work orders by status, filters by date, mechanic, vehicle.
- Work order form: adding services from the price list, spare parts, total calculation.
- Search (by full name, phone, license plate, VIN).

**Backend (REST):**

- CRUD for all entities with validation.
- State machine service with explicit guards on transitions. (transition logic is not scattered across the code in random ifs, but gathered in one place as explicit, documented rules for each edge of the state diagram)
- Order total calculation (jobs + spare parts).
- Authentication (JWT/sessions) and role-based authorization (RBAC).
- Audit log: who changed the status/amount and when.

**Database:**

- Relational schema, indexes on VIN, license plate, phone.
- Soft-delete for customers/vehicles (historical orders must not be lost).
