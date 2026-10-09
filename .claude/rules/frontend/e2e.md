---
paths:
  - "frontend/e2e/**/*.ts"
  - "frontend/playwright.config.ts"
---

# Rule: Browser Tests

## Default

Unless explicitly overridden by the project specification:

- **What:** Playwright tests that run the real frontend against the real backend with the seed. They check the three
  flows of the task, the layout on three screen sizes, and the 48 px touch targets. They are not part of the gate.
- **When:** `npm run e2e` runs when a task covers a user flow or a screen of the key list; the reviewer opens the
  screenshots. Every task also ends with a short note on what was checked in the UI.
- **Where:** `frontend/e2e/` (`flows/*.spec.ts`, `layout/*.spec.ts`, `support/` with `login.ts`, `touchTargets.ts`,
  `screens.ts`), `frontend/playwright.config.ts`, screenshots in `frontend/e2e/screenshots/<project>/` (git-ignored).
- **How (stack):** The tests need the development stack with the seed. `playwright.config.ts` has two `webServer`
  entries: the Vite dev server, and the backend (`./gradlew bootRun`, `cwd: '../backend'`, profile `dev`, H2 with the
  seed), which waits for `/v3/api-docs` with a timeout of about 180 s. Both use `reuseExistingServer`, so a stack that
  is already running is used as it is. The seed makes the data known (`seed-data.md`): logins `manager1`, `mechanic1`
  and so on, one password `Repair-Dev-2026` (the development password of the seed, kept in `e2e/support/login.ts` and
  nowhere else in the application). A test that changes data picks its own record (a new order it creates) and does not
  depend on the state left by another test; the seed is restored by restarting the backend (H2 in memory).
- **How (projects):** Three, defined once in `playwright.config.ts`, all with touch and Chromium:

| Project     | Viewport   | Layout it covers                                   |
|-------------|------------|----------------------------------------------------|
| `phone`     | 390 × 844  | phone: bottom tab bar, rows                        |
| `tablet`    | 820 × 1180 | tablet: icon column, grid                          |
| `landscape` | 1180 × 820 | desktop width of a tablet held sideways: side menu |

- **How (flows):** The three flows of the task run in the `phone` project (the main device of a mechanic) and the
  manager flow also in `landscape`:
    1. A manager takes an order from creation to closing: log in as `manager1`, create an order (a customer and a
       vehicle from the seed), accept the vehicle, assign a mechanic, add a service line and a part line, start work,
       mark ready, record the payment, mark paid, close.
    2. A mechanic sees and changes only own orders: log in as `mechanic1`, the list holds only own orders; an order of
       another mechanic opened by link is not found (the test first logs in as `manager1` and reads the id of such an
       order through `page.request`, so it does not depend on literals of the seed), the next-action button works on an
       own order.
    3. An order is canceled with a reason: the "Cancel" dialog needs a reason, the order shows the banner with the
       reason.
       Flows find controls by role and accessible name, with the English text written in the spec as a literal: the
       browser tests are outside `src/`, they do not import application code, and the ESLint text rules cover `src/`
       only.
- **How (key screens and the 48 px check):** The key screens are listed once in `e2e/support/screens.ts`: login, a list
  (Orders), the order card, the order board, a dialog (cancel), a form sheet (new customer). A spec in `e2e/layout/`
  opens each in every project and, on each:
    - `expectTouchTargets(page)` from `support/touchTargets.ts` runs in the page, takes every visible element that
      matches
      `button, a[href], input, select, textarea, [role=button], [role=tab], [role=switch], [role=checkbox], [role=radio]`
      (breadcrumb items and links inside a text are `a[href]` and so included), reads `getBoundingClientRect()` and
      fails with the list of elements (a selector path and the size) whose width or height is under 48. A hidden element
      (`display: none`, `visibility: hidden`, zero size from `hidden`) is skipped. There is no exemption attribute; an
      element that is too small is fixed;
    - `document.documentElement.scrollWidth` does not exceed `clientWidth`;
    - the screenshot is saved to `e2e/screenshots/<project>/<screen>.png` for the reviewer.
      The other screens are covered by the ESLint and Stylelint rules and the component tests.
- **How (writing a test):** Find elements by role and name (`getByRole`, `getByLabel`); no CSS selectors, no
  `data-testid` unless a role does not exist. Wait with Playwright's auto-waiting and `expect(...).toBeVisible()`, never
  with `waitForTimeout`. The date inputs are filled with a `YYYY-MM-DD` string (`fill`), whatever locale the browser
  draws. A test is independent: it logs in itself (`login(page, 'manager1')`) with a fresh context.
- **How (reporting):** The HTML report goes to `e2e/report/` (git-ignored). On failure: trace, screenshot, video
  retained. One retry on CI, none locally.

## Why

- The three flows are the acceptance of the task; they cannot be proved by component tests with a mocked network.
- jsdom has no layout; sizes and horizontal scroll can be measured only in a browser.
- Three projects cover the three layouts of the application at the cost of three runs of a small set of screens.
- A list of the failing elements with their sizes makes a touch-target failure fixable without opening the screenshot.

## Exceptions

The specification may add a flow. Add it to `flows/`; it runs in `phone` unless the screen is for a manager only on a
large screen.

## Prohibitions

- No `waitForTimeout`, no fixed sleep.
- No exemption from the 48 px check; no `data-touch-exempt`.
- No dependency between tests; no test that needs data created by another.
- No password or login in the application code: they live in `e2e/support/login.ts`.
- No Playwright MCP; the tests are code in the repository.
- No `e2e` script in `npm run check`.
- No test of a business rule: the backend tests it. A flow only proves that the screens carry it through.

## Special Cases

- The first run needs `npx playwright install chromium` (a download); it is done by the human, not by an agent. An agent
  may run `npm run e2e`, which starts the backend through Playwright; it never edits files in `backend/` for it. While
  the planning-only section of the root `CLAUDE.md` is in force, nothing is run.
- A page that needs a viewport narrower than the phone project is not tested: the three projects are the supported
  widths.
- The reviewer opens the screenshots; the files are not compared automatically (no visual regression baseline).

## Infrastructure

- `@playwright/test`, Chromium; scripts `e2e` (`playwright test`) and `e2e:report`.

## Verification

- `npm run e2e` is green on the seeded stack: the three flows and the layout specs in every project.
- The size check of the helper is a pure function `findSmallTargets(rects)` (a list of selector path, width, height,
  visible) in `e2e/support/touchTargets.ts`; it has a Vitest test (a 40 px element is reported with its path, a 48 px
  one and a hidden one are not). `vitest.config.ts` includes `e2e/support/**/*.test.ts` for it.
- Reviewer checklist: the screenshots of the key screens in every project exist and show no blue, no ripple and no
  sideways scroll.
