---
paths:
  - "frontend/src/api/**/*"
  - "frontend/src/shared/api/**/*.ts"
  - "frontend/src/shared/session/**/*.ts"
  - "frontend/src/features/**/queries.ts"
  - "frontend/src/features/**/keys.ts"
  - "frontend/src/features/**/types.ts"
---

# Rule: API Client and Queries

## Default

Unless explicitly overridden by the project specification:

- **What:** All server calls go through one typed client generated from the backend OpenAPI document. Server data lives
  in the TanStack Query cache and nowhere else. Query and command hooks are written by hand, one per endpoint.
- **When:** For every call to the backend.
- **Where:** `src/api/generated/` (read-only), `src/shared/api/` (client, `unwrap`, errors, query client),
  `src/shared/session/` (the current user and the login and logout commands: the one server data that is not a
  feature's), `src/features/<f>/queries.ts`, `keys.ts`, `types.ts`.
- **How (generation):**
    - `npm run api:generate` reads `backend/openapi/openapi.json` and writes `src/api/generated/schema.d.ts`
      (`openapi-typescript`) and `src/api/generated/limits.ts` (the `maxLength` of every request property, from a small
      script `scripts/generate-limits.mjs`; see the Forms and Validation rule). Generated files are never edited by
      hand.
    - `npm run api:check` generates into a temporary folder and compares it with `src/api/generated`; any difference
      fails. It does not use git. It is part of the gate `npm run check`.
    - Order of work for an API change: the backend changes, the OpenAPI file is committed, the client is regenerated,
      then the frontend changes.
- **How (client):** `src/shared/api/client.ts` creates one `openapi-fetch` client from the generated `paths`, with no
  `baseUrl` (requests are relative, `/api/v1/...`, same origin, cookies are sent by the browser). It is the only file
  that imports `openapi-fetch`.
- **How (`unwrap`):** Every call is wrapped: `unwrap(api.GET(...))` returns the data or throws.
    - an error body that is a `ProblemDetail` (has a numeric `status`) → `ApiProblemError` with `status`, `code`,
      `detail`, `errors`;
    - an error body that is not a `ProblemDetail` (HTML from a proxy, plain text) → `ApiProblemError` with the response
      status, no code, and the text `strings.errors.unexpected`;
    - a rejected request (no network) → `NetworkError`;
    - a response without a body (204) → `unwrapVoid`;
    - `unwrap` never returns `undefined` for a call that has a body.
- **How (types):** `features/<f>/types.ts` gives short aliases of generated types
  (`export type Order = components['schemas']['...']`). Components import the alias, never the long path.
- **How (keys):** `keys.ts` is a factory; no key is written inline anywhere else.

```ts
export const orderKeys = {
    all: ['orders'] as const,
    lists: () => [...orderKeys.all, 'list'] as const,
    list: (params: OrderListParams) => [...orderKeys.lists(), params] as const,
    detail: (id: string) => [...orderKeys.all, 'detail', id] as const,
    payments: (id: string) => [...orderKeys.all, 'payments', id] as const,
    history: (id: string) => [...orderKeys.all, 'history', id] as const,
};
```

- **How (queries):** One hook per endpoint, named `use<Thing>`. The `queryFn` passes `signal`. No `select` that holds
  business logic. A list hook takes the list parameters of the Lists and Routing rule and keeps the previous page while
  the next one loads (`placeholderData: keepPreviousData`).
- **How (client defaults):** Set once in `shared/api/queryClient.ts`, a factory
  `createQueryClient({ onQueryError, onMutationError })`. The two callbacks are parameters, so that `shared` imports
  nothing from `app`; `app/` creates the client with the handlers of the Errors and Messages rule (they need the React
  context of antd `App`, which `shared` does not have). The factory puts them into `QueryCache` and `MutationCache`.
  Tests call the same factory with their own callbacks. Defaults:
    - queries: `staleTime` 10 s; `refetchOnWindowFocus` and `refetchOnReconnect` on (a mechanic glances at a tablet that
      was lying on a bench: the data must be fresh when the screen wakes); retry up to 2 times for network errors and
      5xx, never for a `ProblemDetail` below 500;
    - mutations: never retried (a command carries a version, a second try is a conflict).
- **How (commands):** One mutation hook per command. The variables carry the expected `version` and the body. The hook
  declares `meta: { invalidates: <feature>Keys.all }` (see the Errors and Messages rule) and, on success, calls the
  feature's one function that applies the response:

```ts
export function applyOrderResponse(queryClient: QueryClient, order: Order) {
    queryClient.setQueryData(orderKeys.detail(order.id), order);
    void queryClient.invalidateQueries({queryKey: orderKeys.lists()});
    void queryClient.invalidateQueries({queryKey: orderKeys.payments(order.id)});
    void queryClient.invalidateQueries({queryKey: orderKeys.history(order.id)});
}
```

- **How (version):** The `version` of a command is the one the user saw when the form or dialog opened. A command hook
  never reads the version itself: it is a field of the variables, and the caller passes the one it kept.
    - A form or dialog that sends a command is mounted only while it is open and keeps `useState(() => order.version)`
      from its first render. The submit handler sends that value.
    - A section that stays on the page (the inline editing of the order card) is a form that opens on an "Edit" press
      and closes after a save or a cancel: it is mounted only while it edits, so the rule above applies. After a
      successful save the cache holds the returned order and the section closes; the next "Edit" takes the new version.
    - A command sent from a list row ("Accept vehicle" on Today) or from the buttons of the order card sends the
      `version` of the props the button was rendered with: the button gets the order or the row as a prop and passes
      `props.version` on a press. It does not read the query cache. If a refetch redrew the row with a newer version
      before the press, the user saw that newer row, and its version is the right one; if the press happened before the
      redraw, the old version is sent and the backend answers `error.concurrent-update`.
    - The submit handler never reads `useOrder().data.version`: a background refetch may have replaced it, and sending
      the fresh value would hide a change made by someone else.
    - A rejected command with `error.concurrent-update` is handled by the Errors and Messages rule. A successful command
      replaces the cache with the returned order, whose `version` is the next one.
- **How (session):** `useCurrentUser` (in `shared/session`) reads `GET /api/v1/auth/me` (`retry: false`, refetch on
  window focus, `meta: { authProbe: true }`); the response holds the user and `capabilities` (see the Roles and Rights
  in the UI rule). Login and logout mutations clear the whole cache on success. There is no token code (see the Errors
  and Messages rule for 401).

## Why

- One client and one `unwrap` give one error type for the whole application.
- The generated types follow the backend contract by construction; a hand-written copy would drift silently.
- The cache is the only copy of server data, so two screens cannot disagree.
- The version snapshot keeps the backend's optimistic lock effective: the user's save is judged against what the user
  looked at.

## Exceptions

The specification may ask for polling or push updates of a screen. Follow it for that screen.

## Prohibitions

- No `fetch`, `axios`, `XMLHttpRequest` or another HTTP client; no `openapi-fetch` import outside
  `shared/api/client.ts`.
- No hand-written type that repeats a generated one; no edit of `src/api/generated`.
- No server data copied into `useState`, a context or a global store (form initial values are the only copy).
- No `useEffect` that fetches or that copies query data to state.
- No query key written outside `keys.ts`; no `setQueryData` outside `queries.ts`.
- No `refetch()` as the way to update after a command: use the returned order and `invalidateQueries`.
- No `version` read from the cache inside a submit handler.
- No token, cookie or credential handling in the code.

## Special Cases

- A delete command (a line) returns the whole updated order with 200: it goes through `applyOrderResponse` like every
  other command.
- A mutation that changes no order (login, change own password) does not touch the order keys.
- A command of a standalone entity (a customer, a vehicle, a price item) has a `version`-less `PUT`: on success the hook
  calls `setQueryData` for the detail and invalidates the lists of that feature, the same shape as `applyOrderResponse`.

## Infrastructure

- `openapi-typescript`, `openapi-fetch`, `@tanstack/react-query`. Exact versions are pinned; take the API of each from
  the installed typings and the release notes of the pinned version, not from memory. When Context7 is connected (it is
  not at present), it may be used for the same purpose.
- Vite proxy of `/api` to the backend in development (no CORS, no base URL setting).

## Verification

- Unit tests (MSW) of `unwrap`: a `ProblemDetail`, a non-JSON error, a network failure, a 204.
- A test for every command hook: the request carries the version that was passed in; the detail cache holds the returned
  order; the lists are invalidated.
- A test of the snapshot rule: a form opened at version 5, a background refetch changes the cache to 6, the submit still
  sends 5; a command from a list row sends the row's version.
- `npm run api:check` is green; ESLint `no-restricted-globals` (`fetch`) and `no-restricted-imports` (`openapi-fetch`,
  `axios`) pass.
