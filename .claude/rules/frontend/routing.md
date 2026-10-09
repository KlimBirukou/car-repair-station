---
paths:
  - "frontend/src/shared/list/**/*.ts"
  - "frontend/src/shared/list/**/*.tsx"
  - "frontend/src/app/**/*.tsx"
  - "frontend/src/features/**/pages/**/*.tsx"
  - "frontend/src/features/**/routes.tsx"
---

# Rule: Lists and Routing

## Default

Unless explicitly overridden by the project specification:

- **What:** Every list is a paginated, filtered, sorted view of a backend collection. Its state lives in the URL. It is
  shown as a list of rows or a grid of cards, from one component.
- **When:** For every screen that shows a collection, and for every route.
- **Where:** `src/shared/list/` (`EntityList`, `EntityListItem`, `PagerBar`, `ViewToggle`, `SortSelect`,
  `useListParams`, `useViewMode`), `features/<f>/pages/` (the list page), `features/<f>/filters.ts` (the filter of that
  feature).
- **How (URL state):**
    - Page, size, sort and filters are search parameters: `?page=2&sort=fullName,asc&status=READY`. A parameter equal to
      its default is left out. A link to a list therefore opens the same list, and the Back button works.
    - `useListParams(config)` reads and writes them. The config of a feature (`filters.ts`) declares the defaults, the
      sort whitelist and, for each filter, how to read and write it. An unknown or broken parameter falls back to its
      default.
    - `page` in the URL and in the UI starts at 1; the request is zero-based. The conversion is in one function,
      `toPageParams`, with a test.
    - A change of a filter or a sort resets the page to 1. A text filter is typed into local state and written to the
      URL after 300 ms.
    - A day filter is a `YYYY-MM-DD` string and is sent as it is (see the Formatting and Strings rule).
    - The sort whitelist of a list equals the backend's whitelist for that endpoint; the `SortSelect` offers only these.
      The last sort key `id` is added by the backend.
- **How (pager):** `PagerBar` has Previous and Next buttons of 48 px and the text "Page 2 of 7". It is hidden when there
  is one page. There is no numbered pagination of antd and no infinite scroll.
- **How (list or grid):**
    - A feature gives `EntityList` its items and a function that maps one record to the props of `EntityListItem`:
      `title`, `subtitle`, `badge`, `meta` (up to 4 short labelled values, wrapped on a phone), `trailing` (the key
      amount or date), `to` (the link) and an optional `actions` (up to two 48 px buttons, see below). `EntityList`
      draws them as rows or as cards. A feature never draws the two layouts itself.
    - `EntityList` has a `density` prop: `"normal"` (default) or `"large"`. `"large"` draws the large cards of "My
      orders" (`screens.md`): more of the text is shown (the problem description wraps over several lines), the
      `actions` button is 56 px, and it applies to rows and to cards alike, on a phone too. Only the "My orders" page
      uses it.
    - The default view comes from the layout: phone → rows, tablet and desktop → a grid (2 columns on a tablet, 3 and
      more on a desktop; a card is never narrower than 280 px).
    - On tablet and desktop `ViewToggle` (two buttons, list and grid) is shown. The choice is stored per device in
      `localStorage` under one key (`view-mode`) through `shared/storage`, and wins over the default. On a phone there
      is no toggle and the view is always rows, whatever is stored.
    - The choice between rows and cards is not a filter: it is not in the URL.
    - Above the list, in this order: the title with the toggle, the filters, the sort select. A list has no table and no
      column headers. The screens of `screens.md` say "row" for a list: the fields named there are the `title`,
      `subtitle`, `badge`, `meta` and `trailing` of one item.
    - A row or a card is one link (React Router `Link`) over the whole area, at least 56 px high on a phone; a long
      press and "open in new tab" work. Nothing inside a row is a second target except the `actions` slot: up to two
      buttons of 48 px (56 px with `density="large"`), outside the link area, with at least 8 px between them. Today
      uses two, "Accept vehicle" and "Cancel"; My orders uses one, the next action. The buttons belong to the feature;
      each sends the `version` of the row (see the API Client and Queries rule). "Cancel" does not cancel at once: it
      opens the formal dialog with the reason (`screens.md`) through `FormSheet`, and that dialog sends the row's
      `version` too. A button of the slot is drawn from a transition of the row (`enabled`, `message`, `confirm`,
      `commentRequired`) like every other transition button.
    - Empty list: a short text and, where the user can create, one primary button. Loading: a spinner after 300 ms,
      never a moving skeleton. Error: `ErrorState`.
- **How (the board):** The "List / Board" switch of the Orders screen is a second view of the same filters, kept in the
  URL (`?view=board`; unlike rows and cards it is a different set of data). The board is a wrapping grid of column
  sections (three per row on a desktop, two on a tablet, one on a phone), each a short list of cards with its own
  request (a `status` filter and a small page size) and a "Show all" link that opens the list filtered by the column's
  statuses. The board never scrolls sideways.
    - The status sets of the board columns, of the "Active" tab of My orders and of the Today lists are constants typed
      `OrderStatus[]` in `features/workorder/filters.ts`, the only place besides `StatusBadge` and `strings/status.ts`
      where status names appear.
    - Assumption (`screens.md` names neither): the page size of a board column is a constant of the feature, 10 cards,
      ordered by the intake date, newest first; "Show all" is a link below the cards of a column, shown when the column
      has more records than it shows (`totalElements` greater than the cards drawn). The orchestrator records both in
      `context/PLAN.md`.
- **How (routing):**
    - `createBrowserRouter`; the route tree is assembled in `app/router.tsx` from the features' `routes.tsx`. Paths are
      plural kebab-case: `/customers`, `/work-orders/:id`.
    - A path parameter that is not a UUID gives `NotFoundState` without a request.
    - A page under a menu item is wrapped in `RequireCapability` (see the Roles and Rights in the UI rule).
    - Login: `/login`. After a login the user goes to the `next` parameter or to the first item of `capabilities.menu`.
      `next` is used only if it starts with a single `/` and not with `//`; otherwise it is ignored.
    - Unknown path → `NotFoundState` with a button to the home page.
    - Phone: a page that is not a root of the menu has a Back button in the header. It goes back in history and, when
      there is no history (a link opened directly), to the parent list.
    - The page title is set per page (`document.title = strings...`) through one hook `usePageTitle(text)` in
      `shared/layout`.

## Why

- URL state gives links, a working Back button and no hidden state; it also removes a whole class of "the filter was
  reset" bugs.
- One component with two layouts keeps tests and fixes in one place. A table would need a second set of components and
  would not fit a phone.
- A fixed default per width with a stored choice avoids a view that jumps when a tablet is turned.
- Checking `next` closes an open redirect.

## Exceptions

A collection that the specification declares small and bounded (the payments and the history of one order) is a plain
list without a pager, a sort or a toggle.

## Prohibitions

- No table (antd `Table`), no antd `Pagination`, no infinite scroll.
- No list state in `useState` or a store when it belongs to the URL.
- No page number written by hand in more than `toPageParams`.
- No sort field that is not in the whitelist.
- No rows/cards mode in the URL (the `?view=board` switch is a different screen, not this mode); no `localStorage`
  access outside `shared/storage`.
- No `if (phone)` in a feature to draw a list; the layout decision is inside `EntityList`.
- No redirect to an unchecked `next`.

## Special Cases

- The board of orders is one list request per status column, each with its own `status` filter (see the board rule
  above). On a phone the columns are sections of one page.
- The mechanic's list of own orders is the same list as the manager's; the backend narrows it.
- A global search (`GET /search`) is one input in the header (on a phone, a search button that opens a full-screen
  search) with a result list under it, grouped as `screens.md` says, no pager. Assumption (`screens.md` sets neither):
  it starts to query from one non-blank character, 300 ms after the last keystroke (the same delay as a text filter);
  both are constants of the feature. If the backend rejects a short query, the backend's minimum replaces the one
  character. The orchestrator records it in `context/PLAN.md`.

## Infrastructure

- React Router (`createBrowserRouter`, `Link`, `useSearchParams`). Check the API of the pinned version in its installed
  typings and release notes.

## Verification

- Unit tests: `toPageParams` (`page=1` → `0`), `useListParams` (defaults omitted, broken value falls back, filter change
  resets the page), `next` validation (`/orders` ok, `//evil.com` and `https://x` rejected).
- Component tests: a board column and its "Show all" link; the same data in rows and in cards; `density="large"` on both
  views; two `actions` (Today) each sending the row's `version`, and "Cancel" opening the reason dialog; the toggle
  stores the choice and a reload keeps it; on a phone width no toggle is shown and rows are used even when `grid` is
  stored.
- E2E: opening a list link with a filter shows the filtered list; Back returns to the previous list state.
- ESLint: restricted imports of `antd` `Table` and `Pagination`.
