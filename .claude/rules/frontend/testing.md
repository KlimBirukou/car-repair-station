---
paths:
  - "frontend/src/**/*.test.ts"
  - "frontend/src/**/*.test.tsx"
  - "frontend/src/test/**/*"
  - "frontend/vitest.config.ts"
---

# Rule: Testing

## Default

Unless explicitly overridden by the project specification:

- **What:** Every unit with logic and every screen has a test, written together with the code. Unit and component tests
  run in the gate; browser tests do not (the Browser Tests rule, `e2e.md`).
- **When:** With every task. A task is done only when `npm run check` is green.
- **Where:** a test sits next to its file (`money.ts` → `money.test.ts`, `OrderCard.tsx` → `OrderCard.test.tsx`). Shared
  test code is in `src/test/`: `setup.ts`, `renderWithProviders.tsx`, `server.ts` (MSW), `handlers/<feature>.ts`,
  `factories/<feature>.ts`.
- **How (the gate):** `npm run check` runs, in this order and stopping at the first failure: `typecheck`
  (`tsc --noEmit`), `lint` (ESLint), `lint:css` (Stylelint), `format:check` (Prettier), `api:check` (the API Client and
  Queries rule), `test` (Vitest, one run), `build` (Vite). The single scripts have the same names. `e2e` is not in the
  list.
- **How (tools):** Vitest with `jsdom`, React Testing Library, `@testing-library/user-event`,
  `@testing-library/jest-dom`, MSW (`msw/node`). Exact versions are pinned; the API of each is taken from the installed
  typings and release notes.
- **How (what is tested where):**
    - Pure functions (`shared/format`, `rules.ts`, `describeError`, `toPageParams`, `menu.ts`, the `next` check): unit
      tests with literal cases and no recomputation of the expected value.
    - Components and pages: component tests through `renderWithProviders`, finding elements as a user does (`getByRole`,
      `getByLabelText`), never by a CSS class or a test id unless nothing else works.
    - Hooks with logic (`useListParams`, `useReducedMotion`, `useOnline`): `renderHook` inside the same wrapper.
    - Layout and 48 px sizes are not asserted in jsdom (it has no layout); they belong to the browser tests.
- **How (`renderWithProviders`):** One function that mounts the component in the real providers: a fresh `QueryClient`
  made by `createQueryClient` with no retry and test callbacks, the antd `ConfigProvider` and `App` with the real theme,
  a `MemoryRouter` or a data router with a given initial URL, and optional `capabilities` for the current user. Every
  component test uses it; a test never builds its own provider tree.
- **How (MSW):**
    - The server starts in `setup.ts` with `onUnhandledRequest: 'error'`: a request without a handler fails the test.
      Handlers are reset after each test.
    - Default handlers per feature are in `src/test/handlers/<feature>.ts` and are typed from the generated schema
      (`components['schemas'][...]`, `paths`), so a change of the contract breaks the type check. A test overrides one
      with `server.use(...)`.
    - A response body is built by a factory in `src/test/factories/` (`buildOrder({ status: 'READY' })`) that returns a
      complete valid object of the generated type, with fixed literals (a fixed UUID, a fixed instant), never random or
      the current time.
    - A command test checks the request, not only the screen: the body, the `version` and the path
      (`await request.json()` in the handler, collected in a variable and asserted).
- **How (time):** A test that depends on the current time sets it with `vi.useFakeTimers()` and `vi.setSystemTime(...)`
  and restores real timers after. The debounce of a text filter is tested with fake timers and
  `advanceTimersByTime(300)`.
- **How (texts):** A test finds a control by the text from `strings`, imported, not repeated as a literal (the
  Formatting and Strings rule). A text that comes from the backend is written as a literal in the test handler and found
  by that literal.
- **How (naming):** `describe('<unit>')` with `it('<result> when <condition>')`:
  `it('shows the backend message when the transition is disabled')`. One scenario per `it`. A table of cases is
  `it.each`.
- **How (no sleeping):** A test waits with `findBy…`, `waitFor` or `await user.…`, never with a fixed `setTimeout`.
  `userEvent.setup()` is created in the test.
- **How (a11y smoke):** Page-level component tests run `axe` (`vitest-axe`) once on the rendered page with the real
  theme. A violation fails the test. Color contrast is not checked by axe in jsdom (no layout); it is covered by
  `contrast.test.ts`.
- **How (coverage):** Not measured by a threshold. The reviewer checks that each acceptance criterion of the task has a
  test.

## Why

- A test that renders with the real providers and a mocked network tests what the user sees and what is sent, so it
  survives a refactoring of the inside.
- A request without a handler is a missing test case or a wrong URL; failing loudly shows it at once.
- Handlers typed from the contract make the contract the single source for the tests too.
- Fixed data and fake timers keep tests deterministic: a station-zone date near midnight must not depend on the
  machine's clock.

## Exceptions

The specification may require a test that needs a real browser. Put it in `e2e/`, not in Vitest.

## Prohibitions

- No test that is skipped (`it.skip`, `xit`, `test.todo`) or focused (`it.only`) in a committed file; ESLint
  (`vitest/no-focused-tests`, `vitest/no-disabled-tests`) fails the build.
- No snapshot test of rendered markup or of an antd component.
- No mocking of `shared/api`, of `openapi-fetch`, of a query hook or of the router: the network is mocked, nothing above
  it.
- No `vi.mock` of a module of our own code, except `window.matchMedia` and similar browser APIs that jsdom lacks (set up
  in `setup.ts`).
- No test of a transition rule, a right or a status flow in the frontend: the frontend has none. A test feeds a
  transition with `enabled: false` and checks that it is drawn disabled with its message.
- No real timer wait, no random data, no `Date.now()` in a test body.
- No user-visible text repeated as a literal in a behaviour test (see "How (texts)").
- No test that depends on the order of other tests.

## Special Cases

- jsdom has no `matchMedia`: `setup.ts` defines a controllable stub, and a test that needs a narrow or reduced-motion
  screen sets its value through a helper (`setViewport('phone')`, `setReducedMotion(true)`).
- antd needs `ResizeObserver` and `getComputedStyle` stubs in jsdom; they are in `setup.ts` as well, and nowhere else.
- A page that is lazy-loaded is awaited with `findBy…`.
- A native `<input type="date">` value is set with `fireEvent.change` or `user.type` with a `YYYY-MM-DD` string; its
  locale text is not tested.

## Infrastructure

- Vitest, `jsdom`, React Testing Library, `user-event`, `jest-dom`, `msw`, `vitest-axe`, `eslint-plugin-vitest`. Config
  in `vitest.config.ts` (or the `test` block of `vite.config.ts`), `setupFiles: ['src/test/setup.ts']`.

## Verification

- `npm run check` is green; the number of skipped or focused tests is zero (lint).
- Reviewer checklist: every acceptance criterion has a test; a command test asserts the request; no `vi.mock` of own
  code; handlers are typed from the schema; no literal user text in a behaviour test.
