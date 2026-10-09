# Frontend

## Requirements for this area (WHAT)

Read before working on a task here. Paths are in backticks on purpose: do not import them.

- `docs/product/screens.md` — screens, buttons, dialogs, messages.
- `docs/product/ui-style.md` — colors, shapes, status badges.
- `docs/domain/operations.md` — what each role can do.
- `docs/product/scope.md` — what not to build.

## What the frontend must do (WHAT)

- No transition rules here: draw the transitions the backend returns for this user and order, disable those that are not
  enabled and show the backend message as the hint.
- Rights are enforced by the backend; the UI only hides what the user cannot do.
- Dangerous or hard-to-undo actions open the formal dialog described in `docs/product/screens.md`.
- Show backend rejections as messages: the texts of `errors` under the matching form field, `detail` of any other
  rejection as a short toast. Backend texts are English like the UI: do not translate or rewrite them.
- Interface in English; amounts with `₾`; dates as `01.10.2026` and `01.10.2026 10:30:15` (the inside of a native date
  input is drawn by the browser in its own locale).
- Apply the look from `docs/product/ui-style.md`. Never fall back to the default blue theme of a component library.
- Mechanic screens work on a tablet and a phone: one column, touch targets at least 48 px high and wide, the main action
  56 px.

## Stack and conventions (HOW)

Read every file in `.claude/rules/frontend/` before writing frontend code. Where a rule file and this section differ,
the rule file is the detail and the specification files win over both.

Decided:

- Component library: Ant Design 6 (the version is pinned in `package.json`). The look is applied through
  `ConfigProvider` tokens (colors, radius, font, shadow), not by overriding internal CSS class names.
- Library documentation: until Context7 is connected, take the API of a pinned library from its installed typings and
  release notes, not from memory. When Context7 is connected, use it.
- React, TypeScript (strict mode), Vite. Routing: React Router. Local UI state: React state; no global store until a
  real need appears.
- API: `openapi-typescript` generates the types from `backend/openapi/openapi.json` into `src/api/generated`, and
  `openapi-fetch` is the client. Generated files are never edited by hand; `npm run api:generate` regenerates them.
  Every server call goes through this client. Query hooks are written by hand in `src/features/<feature>/queries.ts`.
- Server state: TanStack Query. A command of the work order returns the whole updated order: put it into the cache with
  `setQueryData` and invalidate the lists.
- Requests are relative (`/api/v1/...`): a Vite proxy forwards them in development, a reverse proxy in production. There
  is no CORS and no base URL setting.
- Session: the backend sets an HttpOnly cookie. The frontend has no token code and no token storage. The current user
  and role come from `GET /api/v1/auth/me`. A 401 sends the user to the login screen with "Session expired. Log in
  again."
- Forms: Ant Design `Form`. The texts of the backend `errors` are mapped onto the form fields with `form.setFields`;
  `detail` of any other rejection is a short toast. Client rules check only what is obviously required; the backend
  decides.
- Money is a number from the API and is never calculated here. It is shown as `1,250.00 ₾`. Instants arrive as UTC ISO
  strings and are shown in the station zone `Asia/Tbilisi` as `DD.MM.YYYY` (a date) or `DD.MM.YYYY HH:mm:ss` (a date and
  time), with dayjs and its `utc` and `timezone` plugins. Both live in one module, `src/shared/format`; screens never
  format by hand.
- All user-visible strings are English and live in one module, not scattered in components.
- Structure: `src/features/<feature>/` (pages, components, queries) mirrors the backend features; `src/shared/` holds
  API wiring, layout, theme tokens, formatting and strings; `src/app/` holds providers and the router.
- No `dangerouslySetInnerHTML`.
- Printing: the order card has a Print button that calls `window.print()`; a print stylesheet hides what the invoice
  does not need. There is no separate print screen.
- Gate `npm run check`, in this order: typecheck, ESLint, Stylelint, Prettier check, `api:check` (the generated client
  equals the OpenAPI file), unit and component tests (Vitest + React Testing Library, API mocked with MSW; the handlers
  are typed from the generated schema), production build.
- Browser check: `npm run e2e` runs Playwright tests (not MCP) on the development stack with the seed, in three projects
  (phone, tablet, landscape), and checks the 48 px targets on the key screens. It is not part of the gate
  (`.claude/rules/frontend/e2e.md`). Flows: the manager takes an order from creation to closing; the mechanic sees and
  changes only own orders; an order is cancelled with a reason. Every task also ends with a short note on what was
  checked in the UI.
