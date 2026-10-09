---
paths:
  - "frontend/src/shared/**/*.tsx"
  - "frontend/src/features/**/components/**/*.tsx"
  - "frontend/src/features/**/pages/**/*.tsx"
---

# Rule: Components

## Default

Unless explicitly overridden by the project specification:

- **What:** How a React component is written, how it gets its data and how the shared components are used. It
  complements the Frontend Structure rule (where a file goes) and the Mobile-First Layout and Touch rule (sizes).
- **When:** For every component and page.
- **Where:** `shared/` (generic components), `features/<f>/components/` (feature components), `features/<f>/pages/`
  (route elements).
- **How (form of a component):**
    - A function component with a named export, one component per file, the file named as the component
      (`OrderHeader.tsx`). Props are an `interface <Name>Props` above it, destructured in the signature. No `React.FC`,
      no `PropTypes`, no class component.
    - A component that is only markup and props has no state. State is the smallest that the view needs (an open dialog,
      a typed text); server data is never state (the API Client and Queries rule).
    - `useEffect` is for synchronizing with something outside React (a DOM event, a subscription, the document title).
      Not for fetching, not for copying props or query data into state, not for computing a value that can be computed
      during render.
    - Derived values are computed during render. `useMemo` and `useCallback` only where a measured need or a dependency
      of an effect requires them; there is no habit of wrapping everything.
    - A list is rendered with a stable `key` (the id of the record), never the index.
- **How (pages and components):**
    - A page (`pages/`) reads the route parameters, calls the feature's hooks and composes components; it holds no
      markup beyond layout. A page shows four states in this order: loading (`Spin` after 300 ms), error (`ErrorState`,
      or `NotFoundState` for a 404 or a bad id), empty (where it can be empty), data.
    - A component of a feature gets data through props and callbacks; it calls a hook only when it is a container of its
      own data (a picker, a section of the order card). One level of prop passing is normal; more than two levels is a
      sign to move the hook down.
    - A command button gets the object it acts on as a prop (the API Client and Queries rule, the version section),
      calls the command hook, and is disabled while its mutation is pending.
- **How (shared components):** Use these, do not write a second one. A feature composes them.

| Component                                                                                                                     | Folder                                              | Used for                                                                      |
|-------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------|-------------------------------------------------------------------------------|
| `AppShell`, `PageHeader`, `ActionBar`, `BottomTabBar`, `SideNav`                                                              | `shared/layout`                                     | the frame of every screen (the Mobile-First Layout and Touch rule)            |
| `ErrorState`, `NotFoundState`                                                                                                 | `shared/layout`                                     | a failed or missing page; props: the message and, for `ErrorState`, `onRetry` |
| `OnlineBanner`, `UserBadge`                                                                                                   | `shared/layout`                                     | connection strip; the role as text                                            |
| `EntityList`, `EntityListItem`, `PagerBar`, `ViewToggle`, `SortSelect`                                                        | `shared/list`                                       | every collection (the Lists and Routing rule)                                 |
| `ConfirmDialog`, `FormSheet`, `ConcurrentUpdateNotice`                                                                        | `shared/dialogs`                                    | a confirmation, a form in a dialog, the conflict notice                       |
| `MoneyInput`, `QuantityInput`, `IntegerInput`, `HoursInput`, `DateField`, `DateTimeField`, `EntityPicker`, `FormErrorSummary` | `shared/forms`                                      | form fields (the Forms and Validation rule)                                   |
| `StatusBadge`                                                                                                                 | `shared/theme`                                      | the status as a pill                                                          |
| `TransitionButtons`                                                                                                           | `features/workorder` (exported from its `index.ts`) | the buttons drawn from `transitions` (see below)                              |

- **How (`TransitionButtons`):** One component draws a list of transitions: the `PRIMARY` ones as buttons, the `MORE`
  ones in one bottom sheet; each button is disabled when `enabled` is false and shows `message` under it;
  `confirm: true` opens a `ConfirmDialog`; `commentRequired: true` opens a `FormSheet` with a required comment; the
  label is the transition's `label` as it comes. The order card and the `actions` slot of a list row both use it. It
  knows no status and no transition id. It lives in the `workorder` feature (it needs the transition type) and is
  exported from its `index.ts`; the Today and My orders screens import it from there.
- **How (dialogs):** A dialog is mounted only while it is open (`{open && <Dialog />}`), so its form state and its
  version snapshot start fresh at every opening. `ConfirmDialog` takes the verb for its button, the consequence text
  from `strings` and `onConfirm`; `FormSheet` takes a title, the form and the submit state. A dialog never closes by
  itself on a failed submit.
- **How (accessibility):**
    - Use the element that means the thing: `button` for an action, `a`/`Link` for navigation, `h1` once per page (the
      `PageHeader` title), real lists for lists. A `div` with `onClick` is not a button.
    - Every control has an accessible name: a visible label, or an `aria-label` from `strings`. A decorative icon has
      `aria-hidden`.
    - Focus: a dialog moves focus into itself and returns it to the opener on close (antd does it; do not break it with
      a custom portal). The focus ring is the global one of the Theme rule; no `outline: none`.
    - A change of state that the user must hear about (a toast, an error under a field) is in a live region; antd
      `message` and `Form` errors already are.
    - Language: `<html lang="en">`.
- **How (icons and images):** Icons come from `@ant-design/icons` only, imported by name. An icon next to text is
  `aria-hidden`; an icon alone has an `aria-label`. No raster images in the application except the favicon; there is no
  image upload.
- **How (styles):** CSS Modules next to the component; the class names are camelCase; the values are tokens or CSS
  variables (the Theme rule). No inline `style` except for a value that is computed at run time and cannot be a class.
  No `className` strings built from user data.
- **How (safety):** No `dangerouslySetInnerHTML`. A backend text is rendered as text. A link to the outside is not drawn
  at all (the application has none). A `target="_blank"` link has `rel="noopener noreferrer"`.

## Why

- One shape for components makes the code readable by someone who does not write React every day.
- Effects used for data flow are the common source of loops and stale data; naming their only use keeps them rare.
- One `TransitionButtons` means the rule "draw what the backend returns" exists once; the order card, Today and My
  orders cannot drift.
- Mounting a dialog only while open is what keeps the version snapshot honest.

## Exceptions

The specification may need a component library element that is not in the replacement table of the Mobile-First Layout
and Touch rule. Wrap it once in `shared/` at 48 px and use the wrapper.

## Prohibitions

- No class component, no `React.FC`, no default export (except the tool config files), no two components in one file (a
  tiny private helper that is not exported is fine).
- No `useEffect` that fetches, copies query data to state, or derives a value.
- No `key={index}` on a list that can change.
- No `div` or `span` with `onClick`.
- No component that is both a page and used by another feature.
- No second implementation of a shared component in a feature; no copy of `TransitionButtons`.
- No inline `style` with a literal color, size or duration.
- No `dangerouslySetInnerHTML`; no `window.alert`, `confirm`, `prompt`.
- No `console.log`.

## Special Cases

- A section that appears only for some orders (a cancellation banner, the payments block) decides to appear from the
  data it is given (`order.cancellation != null`), not from a status.
- A component that shows money, a date or a status takes the raw value and calls `formatMoney`, `formatDate` or
  `StatusBadge` itself; a parent never passes a formatted string.
- A skeleton or shimmer is not used while loading (the Theme rule); a `Spin` after 300 ms is.
- A history item draws the from-badge and the arrow only when `fromStatus` is not null (the creation record has none):
  the component decides from the data it is given. The order number is shown wherever `screens.md` names it, always
  through `formatOrderNumber`.

## Infrastructure

- React (function components, hooks), antd 6, `@ant-design/icons`, React Router. ESLint: `eslint-plugin-react`,
  `react-hooks` (`rules-of-hooks`, `exhaustive-deps` as errors), `jsx-a11y` (recommended), `react/no-array-index-key`,
  `react/jsx-no-target-blank`, `react/no-danger`.

## Verification

- `npm run lint` fails on the items of Prohibitions that a plugin can see (hooks, a11y, index keys, danger, console).
- Component test of `TransitionButtons`: `PRIMARY` and `MORE` placement, `enabled: false` with the message visible,
  `confirm`, `commentRequired`, and the `version` that goes into the request.
- Component test of a page: loading, error, not found, empty and data states.
- Component test of a dialog: reopened after close, its form is empty and its version is the current one.
- Reviewer checklist: one component per file; no effect used as data flow; no second copy of a shared component; every
  control has a name.
