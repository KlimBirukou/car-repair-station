# Plan Review
Verdict: REVISE BEFORE IMPLEMENTATION
Reviewed: 2026-10-08

## Summary
The plan has 37 tasks (T-001 to T-037; the reviewer's text said 38, the plan has 37). All have the nine required fields and status `pending`. No stray marker lines. The schema and seed come first (T-003 to T-008) and are followed by the human gate. After that the backend runs to the contract file (T-022), then the client (T-023), then the screens, then Playwright. Postponed and out-of-scope items are not built. Q-numbering and the references inside tasks (Q-2, Q-3, Q-6, Q-8 to Q-13) match their definitions.

Four problems must be fixed before work starts:
- A frontend task depends on an API field that no backend task delivers.
- The Q-3 default cannot be built in the place the plan puts it.
- An invented rights rule is treated as a non-stopping assumption.
- The last browser tests are missing two dependencies.

The rest are suggestions and nits.

## Coverage (requirement -> tasks; gaps)
**TASK.md flows**
1. Login: T-009, T-023 (401 message), T-024.
2. Appointment to closed order: T-015 to T-019 and T-031 to T-036.
3. Walk-in customer: T-015, T-031, T-032, T-036. Nothing covers it separately, and none is needed.
4. Mechanic's day: T-016, T-017, T-018, T-033, T-035, T-037.
5. Cancellation and rollback with a reason, blocked by a payment: T-017, T-018, T-019, T-032, T-037.
6. Price list and employees, including password reset: T-010, T-011, T-025, T-026.
7. Search and history:
   - Search: T-021, T-029.
   - Vehicle card with order history: T-028.
   - Customer card with timeline: T-027.
   - Order filters by customer and vehicle: T-014.
8. Concurrent change: T-015, T-016, T-018 (backend) and T-032 (message).
9. Print: T-034.

**TASK.md acceptance criteria**
1. Gates: every task ends with its gate green.
2. Seed passes its consistency test: T-008.
3. Transitions and roles:
   - Availability: T-017.
   - Perform and failures: T-018.
   - Gap: no task performs the pause rows (3, 4, 5, 6); see finding 6.
4. Mechanic sees only own orders and never gets `purchasePrice`: T-011, T-014 (two-mechanic test), T-018, T-022 (matrix).
5. Stale change rejected: T-015, T-016, T-018.
6. Entity validation, uniqueness and soft delete: T-010 to T-016, T-019.
   - Gap: "Too long, maximum {max} characters" is not a criterion anywhere; see finding 9.
7. Every screen exists and the frontend has no transition rules: T-024 to T-035.
8. Playwright flows: T-036 (manager) and T-037 (mechanic, cancellation).

**Screens** (all covered)
- Login: T-024. Today: T-035. Orders, table and board: T-030. My orders: T-035. New order: T-031.
- Order card: header, actions, info and history T-032; lines T-033; payment and print T-034.
- Customers: T-027. Vehicles: T-028. Price list: T-026. Employees: T-025. Change password: T-024.
- Dialogs: T-025, T-027, T-028, T-032. Messages and states: T-023 and the individual screens. "No access" page: T-024.
- Gap: the formal deactivate dialog is missing from T-026 (finding 10).

**The 11 lifecycle rows** (T-017 table and availability, T-018 perform)
- Rows 1, 2, 3, 4, 6, 7, 8, 9: one transition each. Row 5: two transitions. Row 10: three rollback steps. Row 11: cancel from six statuses.
- Tests that perform the transition: main chain rows 1, 2, 7, 8, 9; rollbacks and cancel rows 10 and 11.
- Gap: rows 3, 4, 5 (both directions) and 6 are not performed in any test (finding 6). The count of table rows is ambiguous in T-017 (finding 5).

**operations.md rights** (all mapped)
- Login, change own password, reset another's password: T-009, T-010. Search: T-021. Order list filter: T-014. Customers and vehicles: T-012, T-013. Employees: T-010. Price list: T-011.
- Create order, assign mechanic, problem description: T-015. View orders and history: T-014, T-018. Change status: T-018. Diagnostic notes and lines: T-015, T-016. Record payment: T-019.
- Gaps: payment list and history for a non-own order are not stated for a mechanic in T-019 (finding 12). A mechanic cannot list mechanics to choose a performer (Q-C).

**Seed**
- Employees and price list: T-005. Customers and vehicles: T-006. Orders and history: T-007. Lines, payments and the eight consistency rules: T-008.
- Gap: nothing proves the seeded BCrypt hash matches `Repair-Dev-2026` before T-036 (finding 11).

**CLAUDE.md invariants**
- One place for transitions: T-017, T-018 (ArchUnit).
- Never delete orders, payments or history; physical line removal only while editable; soft delete and deactivate: T-012, T-013, T-016, T-018, T-019. No task states that the order port has no delete method (finding 12).
- Lines read-only from `READY`, name and price snapshots: T-016.
- Mechanic scope and `purchasePrice`: T-011, T-014.
- Frontend has no transition rules: T-032, T-033.
- English UI and `₾`: T-023.

## Findings

1. **[blocking] T-033, T-014, T-016, Q-13: the `linesEditable` flag has no owner.**
   - T-033 must hide the line buttons using a flag "from the response, not the status". No backend task has that field as a criterion. Q-13 only says T-014 and T-016 "should" return it, and admits T-033 would then be blocked.
   - The frontend must not duplicate the `linesEditable()` rule (`state-machine.md`).
   - Fix: add to T-014 a criterion that the order response carries a boolean from `WorkOrderStatus.linesEditable()`, with a test per status. Change Q-13 to a note. Change the T-033 note to "the flag comes from T-014".

2. **[blocking] T-012, T-013, T-014, Q-3: the default deletion rule cannot be built where the plan puts it.**
   - The Q-3 default is "reject while the customer has open orders / the vehicle has open orders". T-012 and T-013 run before any work order exists (T-014). Their criteria include a vehicle count and a "has vehicles" check that need the vehicle feature.
   - Vehicle depends on customer (T-013 after T-012), and ArchUnit forbids feature cycles. The plan does not say how the customer feature learns about vehicles.
   - Fix: resolve Q-3 first. Limit T-012 and T-013 to what exists at that point; say how the vehicle count is obtained without a cycle (a count in the customer adapter's own query, or a read model in the vehicle feature not used by customer code). Add the "open orders" check to the delete operations as explicit criteria and tests in T-014 (or T-015) for both customers and vehicles.

3. **[blocking] T-010 and Q-8 (also Q-14): an invented rights rule is not a stop.**
   - Q-8 adds "deactivating the last active manager is rejected". That is a new requirement on rights and deactivation. The documents say a manager can deactivate and activate employees. `CLAUDE.md` and D-043 require a stop for rights and roles.
   - Q-14 limits the responsible mechanic and performers to role `MECHANIC` in the application. `operations.md` says a manager "can do everything a mechanic can", and the seed rule 7 covers seed data only.
   - Fix: move Q-8 to the "needs the human" group, or drop the guard from T-010 (the document-conformant reading). Do the same for Q-14, or state it as a seed rule only.

4. **[blocking] T-036 (and T-037): missing dependencies.**
   - T-036's flow creates an order (T-031) and adds a service and a part (T-033). Its dependencies are T-034 and T-035, and neither depends on T-031 or T-033. T-037 adds a line and uses My orders, so it also needs T-033.
   - Fix: T-036 depends on T-031, T-033, T-034, T-035. T-037 depends on T-036 (as now), which makes the transitive chain complete.

5. **[suggestion] T-017: the row count is ambiguous.**
   - The text says "exactly one row per transition (the eleven rows, with row 5 as two and row 10 as three)", and the test compares "the literal list from the lifecycle document". The document has no ids, and the rule has resume and cancel as one row each.
   - The result is 14 table rows: 4 + 2 + 1 + 3 + 3 + 1 for rows 1-4, 5, 6, 7-9, 10, 11. Without the list, two workers could read it differently.
   - Fix: list the 14 ids and their source and target statuses in the criteria.

6. **[suggestion] T-018: no test performs the pause rows.**
   - Rows 3, 4, 5 (both directions) and 6 (from both pauses) are never performed.
   - Fix: add a T-018 test that performs all 14 rows once and checks the history record. Add negative tests with statuses outside the table, for example `PAID -> READY` and `CLOSED -> *`.

7. **[suggestion] T-032: where do button labels and the "More" grouping come from?**
   - The `transitions` object has `id`, `primary`, `enabled`, `commentRequired`, `confirm`, `reasonCode`, `message`. It has no label, no target status and no group.
   - T-032 must draw "Return to «In progress»", the consequence text with `{status}`, and put rollback and cancel in "More". Switching on the transition id risks becoming status logic.
   - Fix: state in T-032 that labels and the "More" group are a map keyed by transition id in `src/shared/strings`, or add `label`/`target`/`group` to the T-017 response. Needs the human's choice (Q-B).

8. **[suggestion] Size: T-001, T-014, T-032.**
   - T-001 combines the build setup, all the shared types, the profiles, Docker and about six test groups. T-014 combines the aggregate, two entities, the filtered list, batch loading with a statement-count test and the visibility rule. T-032 combines the header, the transition dialogs, the cache and conflict handling, inline editing, mechanic assignment and history.
   - Fix: split each into two tasks. T-007 and T-008 are also long but they are data work, so they can stay.

9. **[suggestion] "Too long, maximum {max} characters" has no criterion.**
   - Q-6 says lengths are chosen by `db-dev` and mirrored in validation, but no backend task has a size criterion or test, and the message is not in any frontend task.
   - Fix: add to T-010 to T-016 that text fields are bounded by the column length, with an over-limit test that returns the message. Mention the message in the frontend form tasks.

10. **[suggestion] T-026: formal dialog is missing.**
    - `screens.md` requires the "Delete or deactivate" dialog. T-025, T-027 and T-028 mention it, but T-026 does not.

11. **[suggestion] T-005 / T-009: the seeded password hash is not tested.**
    - The first test that could show a wrong hash is the Playwright flow in T-036.
    - Fix: add a test (T-009 integration against the `seed` context) that `manager1` and `mechanic1` log in with the documented password and `mechanic6` gets 403.

12. **[suggestion] T-019, T-014, T-018: visibility and "never delete" checks should be explicit.**
    - T-019 does not require a not-own order to be hidden for a mechanic. T-018 states no status code for a non-own mechanic, T-014 says 404, T-016 says "403/404".
    - Fix: unify on "not found" (as `aggregate.md` says) and add the not-own test to T-018 and T-019. Add to T-014 that the order port has no delete method (ArchUnit).

13. **[suggestion] HOW inside tasks.**
    - The task format says WHAT only. Examples: T-001 (Spotless, UUID v7, `ApiProblem`), T-003 and T-005 (`relativeToChangelogFile`, `loadUpdateData`, `runOnChange`), T-009 (BCrypt strength 10, `PasswordHasher`), T-004 (`NUMERIC(12,2)`), several tasks (`@WebMvcTest`, `@ApiErrors`).
    - Fix: keep the observable outcome and point to the rule file.

14. **[suggestion] T-003: the PostgreSQL criterion is vague.**
    - "a `ddl-auto=validate`-style check is deferred" names no test. The only PostgreSQL application of the full schema is in T-008.
    - Fix: name an integration test that applies the whole changelog on Testcontainers PostgreSQL in T-003, or say it is first tested in T-008.

15. **[nit] Smaller points.**
    - T-005 criteria: "the CSV files and the throwaway generator are not committed apart from the CSVs" is garbled.
    - T-016 note: "the status enum is introduced here if T-014 did not" is moot, because T-014 filters by status.
    - T-014 depends on T-011 without needing it.
    - T-020: "Both `MANAGER` only through their filters" is unclear.
    - T-024: "after login goes to Today / My orders" needs a placeholder route, because both screens come in T-035.
    - T-027: "Add vehicle" needs the vehicle form that is built in T-028. Say it links to it, or reorder.
    - Q-14 wording is garbled.
    - Q-1, Q-4, Q-5, Q-7 and Q-14 are not referenced from any task.
    - Success toasts and loading states from `screens.md` are not criteria anywhere. Add one line to T-023.

## Questions for the human
- **Q-3 (T-012, T-013).** What happens when a customer or a vehicle with non-deleted vehicles or open orders is deleted? The plan's default is a 409 rejection. It also needs a decision on where the open-order check is built (finding 2).
- **Q-12 (T-019).** May the payment date be in the future or far in the past? The default is required and not in the future.
- **Q-A (T-010, ex Q-8).** Do you want the last active manager protected from deactivation, or should it stay as the documents say (a manager may deactivate anyone, including themselves)? Same for Q-14: may a `MANAGER` be a responsible mechanic or line performer?
- **Q-B (T-032, T-017).** Should the transition response also carry a label, the target status and a group for the "More" menu, or does the frontend keep a map keyed by transition id?
- **Q-C (T-033, T-010).** A `MECHANIC` edits line performers but cannot list employees (employees are `MANAGER` only). Which read, if any, may a mechanic use to pick a performer?

CHANGES REQUESTED.
