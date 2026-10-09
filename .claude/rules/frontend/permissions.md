---
paths:
  - "frontend/src/shared/permissions/**/*.ts"
  - "frontend/src/shared/permissions/**/*.tsx"
  - "frontend/src/shared/session/**/*.ts"
  - "frontend/src/shared/layout/**/*.tsx"
  - "frontend/src/features/**/*.tsx"
---

# Rule: Roles and Rights in the UI

## Default

Unless explicitly overridden by the project specification:

- **What:** The backend enforces every right. The UI only hides what the user cannot do, and it learns what that is from
  data: flags in the responses. The UI never knows which role may do what.
- **When:** For every menu item, route, button and field that depends on who the user is.
- **Where:** `src/shared/session/` (`useCurrentUser.ts`, the login and logout mutations), `src/shared/permissions/`
  (`useCapabilities.ts`, `RequireCapability.tsx`, `menu.ts`).
- **How (flags):** Where a flag comes from:

| The UI needs to know                                                                                        | It reads                                                                                                                                                                                       |
|-------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| which menu items exist, which is the home page                                                              | `capabilities.menu` of `GET /auth/me` (an ordered list; the first item is the home page)                                                                                                       |
| may the user create, edit or delete customers, vehicles; create orders                                      | `capabilities.canManageCustomers`, `canManageVehicles`, `canCreateOrders`                                                                                                                      |
| may the user edit the problem description and mileage, the notes, the mechanic, the lines; record a payment | `order.permissions.canEditInfo`, `canEditNotes`, `canAssignMechanic`, `canEditLines`, `canRecordPayment`                                                                                       |
| may the user deactivate this employee, change this employee's role (the Employees list and card)            | `employee.canDeactivate`, `employee.canChangeRole` (the backend sets both to false for the user's own record; the control is drawn disabled when the flag is false; the client compares no id) |
| which transition buttons exist and which are enabled                                                        | `order.transitions` (and `transitions` of a list row)                                                                                                                                          |
| are the lines locked (the note "Lines are locked")                                                          | `order.linesEditable`                                                                                                                                                                          |
| may the user see a field                                                                                    | the field arrives as `null` when not (`Part.purchasePrice`)                                                                                                                                    |

- **How (menu):** `menu.ts` maps each value of `capabilities.menu` to its label (from `strings`), icon and route. The
  tab bar and the side menu draw the list in the order the backend gave it. After a login the user goes to the first
  item.
- **How (use):** `useCapabilities()` returns the `capabilities` of the current user. A component takes a flag, never the
  role: `{capabilities.canManageCustomers && <NewCustomerButton />}`. A screen that needs more than a button wraps its
  route in `RequireCapability`, which takes either a flag name of `capabilities` (`canManageCustomers`) or a menu item
  (`menu="EMPLOYEES"`, true when `capabilities.menu` contains it). A route under a menu item uses the menu item; a route
  that exists for an action (a "new customer" page) uses the flag. A missing flag or item shows `NotFoundState` with the
  text "No access". The backend answers 403 or 404 anyway. The routes of the customer and vehicle cards
  (`/customers/:id`, `/vehicles/:id`) are open to every logged-in user: a mechanic reads them from an order and from
  search (`operations.md`); their edit and delete buttons depend on `canManageCustomers` and `canManageVehicles`. Only
  the lists and the "new" pages are wrapped in `RequireCapability`.
- **How (data decides):**
    - A transition button is drawn as the backend returns it: disabled when `enabled` is false, with `message` shown
      under it (see the Mobile-First Layout and Touch rule), with a confirmation when `confirm` is true, with a comment
      field when `commentRequired` is true. The frontend knows no status and no rule.
    - A line button is shown when `order.permissions.canEditLines` is true. The note "Lines are locked" is shown when
      `order.linesEditable` is false.
    - The buttons "Deactivate" and the role field of an employee are drawn from `canDeactivate` and `canChangeRole`:
      when a flag is false the control is drawn disabled (`screens.md` asks for it), without a hint text. Whether a
      row is the user's own is the backend's business: the client does not compare the id of the row with the id of
      the current user. If the user reaches the action another way, the backend text for the refusal is shown as it
      comes.
    - A column or a line for a field that arrives as `null` is not drawn. The code never asks whether the user is a
      manager.
    - A list the mechanic sees is already narrowed by the backend.
- **How (current user):** The role changes at once on the backend. `useCurrentUser` refetches on window focus, so a
  changed role or a deactivation reaches the UI the next time the screen is used. The name and the role are shown in the
  user menu as text from the response; they decide nothing.

## Why

- A role comparison spread over components has to be found and changed one by one when a right changes. A flag is
  computed once, by the code that also enforces the right.
- Flags from the backend cannot disagree with the backend. A table of rights on the client can.
- `null` for a hidden field is the backend's way to say "not for you"; reading it is simpler and safer than repeating
  the rule.

## Exceptions

The specification may require another visibility rule. Add the flag to the backend response first (backend, then the
client is regenerated), then read it here.

## Prohibitions

- No comparison with a role anywhere except tests: no `role === 'MANAGER'`, no `'MANAGER'` or `'MECHANIC'` literal, no
  `user.role` in a condition. The role is only displayed.
- No transition rule, status comparison, "who may press" logic or hint text in the frontend.
- No table of rights in the frontend, no derived right ("a manager can, so a mechanic cannot").
- No hidden-by-role field that the backend does not return as `null`.
- No rights stored in the browser.
- No security reasoning in the UI: a hidden button is a convenience, not protection.

## Special Cases

- A user without a session never reaches `useCapabilities`; the router sends them to the login (see the Errors and
  Messages rule).
- Menu items that a role does not have are absent from the tab bar and the side menu, not disabled.
- A screen element that depends on the role but has no flag yet is a backend change (a flag in the response), not a
  frontend one. Stop and report it.
- Own record in the Employees list: the flags `canDeactivate` and `canChangeRole` are the answer (D-056, D-062); a false
  flag gives a disabled control. The list may mark the own row with a "You" label only if the response carries a flag
  for it; otherwise nothing is marked.

## Infrastructure

- ESLint `no-restricted-syntax` with the selectors `Literal[value='MANAGER']`, `Literal[value='MECHANIC']` and
  `MemberExpression[property.name='role']`, switched off for tests. Two files that display a role are also excluded, and
  only they: `UserBadge` in `shared/layout` (the role of the current user in the user menu) and the one file of the
  Employees feature that shows or edits the role field of an employee (for example
  `features/employee/components/RoleField.tsx`: the field shows the values of the role, it decides no right). The role
  as a form value is the data the request carries, not a comparison. No other file is excluded.

## Verification

- Unit tests of `menu.ts`: every value of `capabilities.menu` has a label and a route; the order of the response is
  kept.
- Component test: an employee with `canDeactivate: false` and `canChangeRole: false` shows neither button, and the same
  list with `true` shows both; no id of the current user is read by the Employees feature (the reviewer greps for it).
- Component test: an employee with `canDeactivate: false` and `canChangeRole: false` shows both controls disabled, and
  the same list with `true` shows both enabled; no id of the current user is read by the Employees feature (the reviewer
  greps for it).
- Reviewer checklist: search for the role literals and for status names. Status literals are allowed in exactly three
  places: `shared/theme/StatusBadge`, `shared/strings/status.ts` and `features/workorder/filters.ts` (the status sets of
  the "Active" tab, the board columns and Today, typed `OrderStatus[]`).
