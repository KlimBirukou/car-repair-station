---
paths:
  - "backend/src/main/java/**/*.java"
---

# Rule: References to Other Entities

## Default

Unless explicitly overridden by the project specification:

- **What:** A response that shows another entity (the customer, the vehicle and the mechanic of an order, the owner of a
  vehicle, the performer of a line, who recorded a payment) carries a small `Ref` record of that entity, never only an
  id and never the whole record. The screens need names and the marks "(deleted)" and "(inactive)".
- **When:** For every response and list row that names an entity of another feature.
- **Where:** The `Ref` record is in the root of the feature that owns the entity: `CustomerRef`, `VehicleRef`,
  `EmployeeRef`. The composite read model is in the root of the feature that builds the response (`WorkOrderView`,
  `WorkOrderListItem`, `VehicleListItem`, `CustomerListItem`).
- **How (Ref):**
    - A `Ref` is a public record with what a screen shows and nothing else:
        - `CustomerRef(id, fullName, phone, email, deleted)` (`email` is nullable);
        - `VehicleRef(id, make, model, year, licensePlate, vin, deleted)`;
        - `EmployeeRef(id, fullName, active)`.
    - The domain record has a method `toRef()`. A `Ref` never holds `passwordHash`, `login`, `purchasePrice` or another
      restricted field. If a role-restricted field is ever needed, the service masks it with `null` (see the Services
      rule).
    - The service interface of the owner has one method: `Map<UUID, XRef> findRefsByIds(Set<UUID> ids)`. It is
      `readOnly`, returns deleted and inactive records too (the old orders refer to them), and leaves a missing id out
      of the map. It uses the port method `findAllByIds` (see the Repositories rule): one query.
- **How (composition):** The service of the consuming feature collects the ids of the whole page, calls `findRefsByIds`
  once for each other feature, and builds the view records. It never calls it in a loop. The web mapper only copies the
  view into the response.
- **How (counts):** A number that cannot come from a `Ref` (the number of vehicles of a customer in the list of
  customers) uses a counter port in the root of the feature that needs it, for example `CustomerVehicleCounter` with
  `Map<UUID, Long> countByCustomerIds(Set<UUID>)`. The feature that owns the data (`vehicle`) implements it in its
  `service` package, as for a deletion guard (see the Package Structure rule). It counts non-deleted records.
- **How (cards):** There is no composite endpoint for a card. The customer card uses `GET /vehicles?customerId=` and
  `GET /work-orders?customerId=`, the vehicle card uses `GET /work-orders?vehicleId=`. The vehicle filter has a
  `customerId`.

Example:

```java
public record EmployeeRef(UUID id, String fullName, boolean active) {

}

// EmployeeService
Map<UUID, EmployeeRef> findRefsByIds(Set<UUID> ids);

// WorkOrderServiceImpl, one call per feature and page
var customers = customerService.findRefsByIds(customerIds(page.getContent()));
var vehicles = vehicleService.findRefsByIds(vehicleIds(page.getContent()));
var employees = employeeService.findRefsByIds(employeeIds(page.getContent()));
```

## Why

- The cost of a page stays at a fixed number of queries, however many rows it has.
- Features stay free of cycles: the owner exposes a small record and a service method, the consumer composes.
- A `Ref` cannot leak a hash or a purchase price because it has no such component.

## Exceptions

The specification may ask for a reference that needs more fields. Add them to the `Ref` of the owner, not to the
consumer.

## Prohibitions

- No call of `findRefsByIds` or of a counter inside a loop.
- No Ref built from another feature's `repository.jpa` or by a web mapper.
- No `Ref` with a restricted field and no entity or JPA type in a `Ref`.
- No second record that duplicates a `Ref` in the consuming feature.

## Special Cases

- A reference to a deleted or inactive record is still returned, with `deleted` or `active` set. The UI draws the mark.
- A `Ref` of the current list row's own feature is not needed: the row is the full record.

## Infrastructure

- Port method `findAllByIds` (Repositories rule), service methods `findRefsByIds`, counter ports in the feature roots.

## Verification

- Unit tests: `findRefsByIds` returns a deleted customer and an inactive employee, leaves an unknown id out, and calls
  the port once.
- Integration test (H2): listing orders, vehicles and customers runs a number of statements that does not grow with the
  number of rows (extends the test of the Aggregates rule).
- ArchUnit: `*Ref` records are in a feature root, are records, and have no component named `passwordHash`, `login` or
  `purchasePrice`; the counter ports are implemented in `..service..`.
- Reviewer checklist: no id-only reference in a response, no query inside a loop.
