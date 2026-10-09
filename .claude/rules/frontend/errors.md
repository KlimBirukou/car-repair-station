---
paths:
  - "frontend/src/**/*.ts"
  - "frontend/src/**/*.tsx"
---

# Rule: Errors and Messages

## Default

Unless explicitly overridden by the project specification:

- **What:** Every backend rejection and every network failure is turned into one of a few fixed outcomes by one pure
  function. The user sees the backend text as it comes.
- **When:** For every failed query or command.
- **Where:** `src/shared/api/` (`ApiProblemError`, `NetworkError`, `errorCodes.ts`, `describeError.ts`),
  `src/shared/dialogs/ConcurrentUpdateNotice.tsx`, `src/shared/layout/OnlineBanner.tsx`, the global handlers in
  `src/app/` (`app/queryErrorHandlers.ts`, `app/AppProviders.tsx`).
- **How (shape):** `ApiProblemError` carries `status`, `code`, `detail`, `errors` (a map field → text). The frontend
  branches on `code` only for the codes in `errorCodes.ts` (`error.unauthorized`, `error.invalid-credentials`,
  `error.account-deactivated`, `error.concurrent-update`, `error.unique-violation`, `error.validation`). It never
  branches on the text of `detail` and never rewrites or translates it.
- **How (`describeError`):** A pure function from an error and the kind of call (query or command) to a result, tested
  as a table. Rows are read from the top; the first row that matches wins (the `page` row matches a query only):

| Situation                                                                 | Result       | What the user sees                                                                                                                        |
|---------------------------------------------------------------------------|--------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| `NetworkError`                                                            | `network`    | toast `strings.errors.noConnection`; the form stays open and filled                                                                       |
| 401 `error.unauthorized`, a user was logged in                            | `session`    | the login screen with "Session expired. Log in again."                                                                                    |
| 401 `error.unauthorized`, nobody was logged in (the first `GET /auth/me`) | `anonymous`  | the login screen, no message                                                                                                              |
| 401 `error.invalid-credentials`                                           | `fields`     | the backend text above the login form                                                                                                     |
| 403 `error.account-deactivated` (login call)                              | `fields`     | the backend text above the login form                                                                                                     |
| 403 or 404 on a page query                                                | `page`       | `NotFoundState` (for 403 with the text "No access"); no toast                                                                             |
| any other error on a page query                                           | `page`       | `ErrorState` with a Retry button; no toast                                                                                                |                                                                 |
| 400 or 409 with `errors` (`error.validation`, `error.unique-violation`)   | `fields`     | each text under its form field                                                                                                            |
| 409 `error.concurrent-update`                                             | `concurrent` | `ConcurrentUpdateNotice` in the dialog or page                                                                                            |
| any other 409 (transition not available, lines locked, a guard)           | `stale`      | toast with `detail`, and the queries of the resource of the call are invalidated (the order, its lists): what the user saw is out of date |
| 403                                                                       | `toast`      | toast with `detail`                                                                                                                       |
| other 4xx                                                                 | `toast`      | toast with `detail`                                                                                                                       |
| 5xx on a command                                                          | `toast`      | toast with `detail`                                                                                                                       |

- **How (401):** Two calls are probes and never trigger the "session expired" outcome: `GET /auth/me` and
  `POST /auth/login`. They are marked with `meta: { authProbe: true }`. For every other call a 401 clears the cache and
  goes to the login screen; the screen the user was on is kept in the `next` query parameter (see the Lists and Routing
  rule for its check).
- **How (where it is handled):**
    - Queries: the result is `page` (the table row above): the page shows `ErrorState` (a message, a Retry button of 48
      px) or, for a 404, `NotFoundState`. There is no toast for a failed page load. A 403 on a query is `NotFoundState`
      with "No access".
    - A `stale` outcome invalidates by the key prefix of the failed call: the mutation declares it in
      `meta: { invalidates: orderKeys.all }`; the handler does not guess a resource.
    - Commands: the caller passes `meta: { handledByForm: true }` when a form shows the result; the global handler then
      does nothing for `fields` and `concurrent`. All other outcomes are handled globally. This prevents a second toast.
    - The global handlers call `describeError` and act on the result. No component contains its own `switch` on a
      status.
    - Where the handlers live: they need the toast (`App.useApp()` works only inside the React tree under antd `App`),
      the router (to go to the login) and the query client. So `app/` builds them inside a React context: a component
      `app/QueryErrorBridge.tsx` (or the provider that creates the client) takes `message` from `App.useApp()` and
      `navigate` from the router, creates the handlers with them, and passes them to
      `createQueryClient({ onQueryError, onMutationError })` (API Client and Queries rule). `shared` never imports
      `app`, and a toast is never shown through the static `message` of antd (it ignores the theme and the `App`
      context).
- **How (toasts):** Antd `App` context (`App.useApp()`), `message.error`, at the top, 6 seconds, closable. Text is
  `detail`; when `detail` is missing, `strings.errors.unexpected`.
- **How (concurrent update):** `ConcurrentUpdateNotice` shows the backend `detail` ("The order was changed by another
  user. Refresh the page.") and has one button, "Refresh". Refresh refetches the order and closes the dialog; the user's
  unsaved input is discarded. The form is not submitted again by itself. The button text is in `strings`.
- **How (offline):** `OnlineBanner` shows a full-width strip "No connection" under the header while `navigator.onLine`
  is false (one hook `useOnline`, events `online` and `offline`). Queries refetch on reconnect.
- **How (double tap):** A command button is disabled and shows its loading state while its mutation is pending, and the
  handler returns at once if the mutation is pending. Hands may be dirty: a second tap must not send a second command.
- **How (render errors):** `app/RootErrorBoundary` shows "Something went wrong" with a Reload button and writes the
  error to `console.error`. No remote logging.

## Why

- One function that decides the outcome keeps every screen consistent and makes the behaviour testable without
  rendering.
- Backend texts are the product texts (the Exceptions rule of the backend): showing them as they come means no
  dictionary on the frontend.
- A 401 from `/auth/me` is the normal state of a fresh visit; treating it as an expiry would greet every new user with
  an error.
- A stale order after a rejected transition is the normal result of two people working on one order; refetching shows
  the new state at once.

## Exceptions

The specification may require a special message for a code. Add the code to `errorCodes.ts` and a row to the table; do
not branch in a component.

## Prohibitions

- No text of `detail` or `errors` rewritten, translated, shortened or compared.
- No branch on `status` or `code` outside `describeError` and the handlers.
- No `try/catch` in a component around a mutation; use the mutation's state and `meta`.
- No `window.alert`, `window.confirm`, `console.log` for the user.
- No retry button that re-sends a command; a retry is for queries.
- No stack trace, status number or `code` shown to the user.

## Special Cases

- A 404 on a command (the order disappeared) is `toast` with `detail`; the page then shows `NotFoundState` after the
  refetch fails.
- The login form shows the text of `error.account-deactivated` and `error.invalid-credentials` above the fields, as it
  comes; `describeError` gives `fields` for both and the form puts the `detail` into its alert.
- An `errors` key that matches no field of the form is shown in the form-level alert (see the Forms and Validation
  rule).

## Infrastructure

- Antd `App` and `message` (through `App.useApp()`); TanStack Query `QueryCache` and `MutationCache` callbacks, set by
  `createQueryClient` from the callbacks that `app/` gives it.

## Verification

- Unit test of `describeError`: one literal case per row of the table, including the two 401 cases and the
  account-deactivated 403.
- Component tests (MSW): a rejected transition shows the backend text as a toast and refetches the order;
  `error.concurrent-update` shows the notice and the Refresh button refetches; offline shows the banner; a double click
  sends one request.
- ESLint: `no-restricted-syntax` for `.status ===` and `.code ===` outside `shared/api` and `app`; `no-console`.
