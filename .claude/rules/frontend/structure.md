---
paths:
  - "frontend/src/**/*.ts"
  - "frontend/src/**/*.tsx"
---

# Rule: Frontend Structure

## Default

Unless explicitly overridden by the project specification:

- **What:** Feature folders that mirror the backend features, a `shared` layer for what several features use, an `app`
  layer that wires everything together. Dependencies go one way and ESLint checks them.
- **When:** For every new screen, component, hook, style or module.
- **Where:** `frontend/src/`.

```text
src/
├── app/                    # providers, router, root error boundary, theme variables
├── api/generated/          # openapi-typescript output; read-only
├── shared/
│   ├── api/                # client, unwrap, ApiProblemError, error codes, query client
│   ├── dialogs/            # ConfirmDialog, FormSheet, ConcurrentUpdateNotice
│   ├── forms/              # rules, fields (MoneyInput, QuantityInput, IntegerInput, HoursInput, DateField, DateTimeField, EntityPicker, ...), applyProblem
│   ├── format/             # money, dates, zone: the only place that formats
│   ├── layout/             # breakpoints, useLayout, useReducedMotion, AppShell, PageHeader, ActionBar, BottomTabBar, SideNav, OnlineBanner, ErrorState, NotFoundState, UserBadge
│   ├── list/               # EntityList, EntityListItem, PagerBar, ViewToggle, useListParams, useViewMode
│   ├── permissions/        # useCapabilities, RequireCapability, menu.ts
│   ├── session/            # useCurrentUser, login and logout commands
│   ├── storage/            # the only access to localStorage
│   ├── strings/            # one file per feature, plus index.ts
│   └── theme/              # tokens, antd theme, StatusBadge, global.css, print.css
├── features/<feature>/     # same name as the backend package: customer, vehicle, workorder, ...
│   ├── index.ts            # the public surface for other features (may be empty)
│   ├── routes.tsx          # exports <feature>Routes: RouteObject[]
│   ├── queries.ts          # hooks, one per endpoint
│   ├── filters.ts          # list parameters of the feature (lists only)
│   ├── keys.ts             # query key factory
│   ├── types.ts            # aliases of generated schema types
│   ├── pages/              # route elements
│   └── components/         # used by this feature only
└── test/                   # setup, renderWithProviders, MSW server and handlers
```

- **How (placement):**
    - A route element goes to `features/<f>/pages/`. A component used by one feature goes to `features/<f>/components/`.
    - A component, hook or function used by two or more features and without business meaning goes to the matching
      `shared/` folder. Copying it into a second feature is not allowed.
    - A component with business meaning that another feature needs (a customer picker, a status badge of an order) stays
      in its feature and is exported from its `index.ts`. A generic component in `shared` that needs feature data takes
      it through props: `EntityPicker` gets a `useSearch` hook and a function that maps a record to an option; each
      feature wraps it (`CustomerPicker`) and exports the wrapper.
    - A screen that belongs to no single backend feature gets a feature folder named for the screen: `pricelist` (it
      composes the service items and the parts through their `index.ts`), `today`, `search`. Its queries live in the
      feature that owns the data.
    - A user-visible text goes to `shared/strings/<f>.ts`. A color, size or duration goes to `shared/theme/tokens.ts`.
    - Server calls go to `queries.ts` of the feature. Nothing else calls the API client.
- **How (dependencies):**

| From            | May import                                                                                             |
|-----------------|--------------------------------------------------------------------------------------------------------|
| `app`           | everything                                                                                             |
| `features/<f>`  | `shared`, `api`, its own files, and another feature only through `@/features/<other>` (its `index.ts`) |
| `shared`        | `shared`, `api`. Never `features` or `app`                                                             |
| `api/generated` | nothing                                                                                                |

- **How (app wiring):** `shared/layout/AppShell` does not know the search or the user menu, because they use features
  and `shared` may not import `features`. `AppShell` takes them as slots (props of type `ReactNode`): `search` (the
  global search input and its results) and `userMenu` (the name, the role through `UserBadge`, change password, log
  out). `app/` builds both from the `search` feature and `shared/session` and passes them to `AppShell`. The menu items
  come from `shared/permissions/menu.ts`, which `AppShell` may import.
- **How (routes):** Each feature exports its routes from `routes.tsx`; `app/router.tsx` assembles them. Pages are loaded
  lazily per feature (`lazy` of React Router), so a phone loads only what it opens. Route paths are plural kebab-case
  and name the screen; they usually follow the API resource (`/work-orders`, `/work-orders/:id`) but need not (`/today`,
  `/my-orders`, `/price-list`). The mapping of a path to a feature is the route tree, not a convention.
- **How (ESLint config):** One `eslint.config.js` that is assembled from parts in one folder (`eslint/`:
  `boundaries.js`, `restricted-imports.js`, `restricted-syntax.js`, `tests.js`, ...). `no-restricted-syntax` is a
  flat-config rule whose option arrays do not merge across blocks: the last block that sets it replaces the earlier
  ones. Six of the rule files of `.claude/rules/frontend/` each ask for selectors (color literals in `theme.md`,
  `size="small"` in `touch.md`, role literals in `permissions.md`, `.status ===` and `.code ===` in `errors.md`, date
  and number calls and literal texts in `formats.md`, a numeric `max` in `forms.md`). So the selectors are collected in
  `restricted-syntax.js` as named lists, each with the folders where it is on or off, and one function builds the
  `no-restricted-syntax` option for each group of files from them. No rule file declares the rule itself. A test
  (`eslint-config.test.ts`) runs ESLint on small sample files and checks that each selector still fires where it should
  and is off where it is excluded.
- **How (imports):** The alias `@/` points to `src/`. Inside one folder a relative `./x` is fine; `../` that leaves the
  folder is not.
- **How (exports):** Named exports only. The configuration files that a tool requires to export a default
  (`vite.config.ts`, `eslint.config.js`, `playwright.config.ts`) are the only exception. A feature's `index.ts` exports
  only what another feature really needs, and only leaf components and hooks (`CustomerPicker`, `useCustomer`): not a
  page, not a container that composes the feature's own components, not a route, a key factory, a query function or a
  type that is not a prop of an exported component. Another feature reaches a type through the generated schema.

## Why

- A new file has exactly one place, so generated code looks the same in every feature and a reviewer who does not know
  React can still find things.
- The boundaries keep a feature changeable without breaking another one. `shared` knows nothing about features, so it
  can be reused and tested alone.
- One owner for each cross-cutting concern (formatting, strings, errors, storage) means a change is made once.

## Exceptions

The specification may define a module used by several features. Put it in `shared/` and follow the specification.

## Prohibitions

- No `utils`, `helpers`, `common` or `misc` folders and no barrel files except a feature's `index.ts` and
  `shared/strings/index.ts`.
- No default exports (except the tool configuration files named above).
- No import of another feature's `pages`, `components`, `queries` or `keys` directly.
- No import from `app` outside `app`; no import of `features` from `shared`.
- No edit of `src/api/generated`; no hand-written copy of a generated type.
- No import cycles.
- No `../` imports that cross folders.

## Special Cases

- A page that needs data of two features composes their public hooks from `index.ts` in the page of the feature that
  owns the screen.
- `shared` may import `src/api/generated` and so knows some domain words of the generated types. This is limited to
  presentation and plumbing: `shared/theme/StatusBadge` and `shared/strings/status.ts` (a `Record<OrderStatus, ...>`),
  `shared/permissions/menu.ts` (the menu values), `shared/list` (the shape of a page), `shared/forms/limits` (`LIMITS`),
  `shared/api`. A function in `shared` that decides something from a domain value (a rule, a condition, a transition)
  does not belong there.

## Infrastructure

- ESLint: `eslint-plugin-boundaries` (element types `app`, `feature`, `shared`, `api`; the table above is the policy;
  take the exact configuration from the plugin documentation), `import/no-cycle`, `no-restricted-imports` for `../*`
  patterns that leave a folder, `import/no-default-export` with the configuration files switched off.
- Stylelint for the `.css` files (color literals, media queries, `!important`; see the Theme, Font, Motion and Print
  rule and the Mobile-First Layout and Touch rule).

## Verification

- `npm run lint` fails on every item of Prohibitions that is an import.
- Reviewer checklist: each new file is in the folder the placement list names; each feature that has screens has
  `routes.tsx`, `queries.ts`, `keys.ts`; no logic copied between features.
