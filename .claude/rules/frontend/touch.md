---
paths:
  - "frontend/src/**/*.tsx"
  - "frontend/src/**/*.css"
  - "frontend/e2e/**/*.ts"
---

# Rule: Mobile-First Layout and Touch

## Default

Unless explicitly overridden by the project specification:

- **What:** One adaptive application, written for a phone first. Mechanics work on a phone or a tablet, with dirty
  hands, and glance at the screen for a second; managers use the same screens on a tablet or a computer. Usable beats
  pretty.
- **When:** For every component, style and screen.
- **Where:** `src/shared/layout/` (`breakpoints.ts`, `useLayout.ts`, `AppShell`, `PageHeader`, `ActionBar`,
  `BottomTabBar`, `SideNav`, `OnlineBanner`), `src/shared/dialogs/`, `src/shared/list/`.
- **How (breakpoints):** Three, defined once in `breakpoints.ts`: phone below 768 px, tablet 768 to 1023 px, desktop
  1024 px and above. A tablet held horizontally is usually 1024 px or more and gets the desktop layout; that is
  intended. Sizes of controls and text are the same on every width: only navigation and the number of columns change.
- **How (mobile-first):** Styles are written for the narrow screen and widened with `@media (min-width: 768px)` and
  `@media (min-width: 1024px)`; no `max-width` media queries. CSS Modules (`*.module.css`) next to the component. Of the
  width queries only the two values 768px and 1024px appear. The queries `print` and `prefers-reduced-motion` (the
  Theme, Font, Motion and Print rule) are the only other ones.
- **How (adaptive code):** `useLayout()` returns `'phone' | 'tablet' | 'desktop'` and may be imported only in
  `shared/layout`, `shared/dialogs` and `shared/list`. Feature code is adaptive through those components and CSS, never
  through its own width checks.
- **How (navigation):**
    - phone: a bottom tab bar with at most 4 items; the fourth is "Menu" when there are more and opens a bottom sheet
      with the rest. The items are the `capabilities.menu` of the user (see the Roles and Rights in the UI rule). A
      bottom sheet with more actions in the order card is "More" (below): the two are different things.
    - tablet: a narrow side column of icons with labels.
    - desktop: the side menu, 220 px.
    - The content is one column on a phone; the order card is limited to about 1000 px on wide screens.
- **How (sizes):** Same on every width, from `shared/theme/tokens.ts`:
    - touch target: at least 48 px high and wide; the primary action of a screen 56 px; at least 8 px between two
      targets;
    - this holds for a breadcrumb item and for a link inside a text as well: its box is at least 48 px high and wide
      (padding or a block-level link around the text), with at least 8 px to the next target. A link is not exempt;
    - text: body 16 px, secondary 15 px, small 14 px (only for what is not needed), key data (order number, status,
      amount) 18 to 20 px; titles 24 px on a phone and 30 px from 768 px;
    - the control size `small` of antd is not used.
- **How (actions):** `ActionBar` holds the actions of a screen. On a phone it is fixed to the bottom above the tab bar
  (with `env(safe-area-inset-bottom)` padding) and the primary action is full width, within reach of a thumb. A
  transition marked `MORE` opens a bottom sheet with 56 px items (the button is labelled "More"), not a dropdown, on
  every width. A disabled action shows the backend `message` as text under it, always visible: there is no hover on a
  touch screen.
- **How (dialogs):** `ConfirmDialog` and `FormSheet` in `shared/dialogs`. On a phone they are a full-width sheet from
  the bottom (or full screen for a form) with buttons the full width and at least 48 px; elsewhere a centered modal. A
  dangerous action is confirmed with a verb that names it ("Cancel order"), never "OK"; the dangerous button is not next
  to the primary one.
- **How (replacements):**

| Do not use                                               | Use                                                                                                                  |
|----------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------|
| antd `Table`                                             | `EntityList` (rows or cards)                                                                                         |
| antd `Switch`, `Checkbox`, `Radio` at their default size | the same control drawn at 48 px (a row of 48 px with the label inside the target), configured once in `antdTheme.ts` |
| antd `InputNumber` with step arrows                      | `MoneyInput`, `QuantityInput`, `IntegerInput` with `controls={false}`                                                |
| antd `Pagination`                                        | `PagerBar`                                                                                                           |
| antd `Popconfirm`, `Modal.confirm`                       | `ConfirmDialog`                                                                                                      |
| antd `Dropdown` and hover menus                          | a bottom sheet, opened by a tap                                                                                      |
| antd `Tooltip` as the only carrier of information        | visible text                                                                                                         |
| antd `DatePicker`                                        | `DateField` (native date input; the Forms and Validation rule)                                                       |
| `Select` with search for a short list                    | `Segmented` or radio group                                                                                           |
| a horizontal scroll area                                 | a stacked layout                                                                                                     |

- **How (touch details):** `touch-action: manipulation` on all controls (no double-tap zoom delay). The viewport meta
  has `viewport-fit=cover`. Nothing needs hover. No information in color alone: a status is its text plus its color.
  Scrolling a page is fine; the page never scrolls sideways.
- **How (feedback):** A press shows at once (the `:active` color change, 100 ms). No ripple, no long animation (see the
  Theme, Font, Motion and Print rule).

## Why

- A mechanic with greasy hands misses a small target and double-taps a slow one; a large target, a thumb-reach primary
  action and a disabled-while-sending button remove the most common failures.
- A second layout for desktop means a second set of screens and tests. One mobile-first layout that gains columns stays
  one thing.
- Hover, tooltips and small controls simply do not exist on a tablet.

## Exceptions

The specification may require a denser layout for one manager screen. Follow it for that screen, still with 48 px
targets.

## Prohibitions

- No control smaller than 48 px; no `size="small"`; no icon-only button without a visible label or an `aria-label` from
  `strings`.
- No hover-only behavior, no information in a tooltip only.
- No fixed pixel width that makes a page scroll sideways; no `max-width` media query; no media query value other than
  768px and 1024px.
- No `useLayout` outside the allowed folders; no `window.matchMedia` outside `shared/layout`, where it is used only
  inside `useLayout` and the hook `useReducedMotion` (below); no `if (phone)` in a feature.
- No component from the replacement table.
- No text below 14 px; no body text below 16 px.

## Special Cases

- A long text (the problem description) wraps; it is never cut with an ellipsis where the user needs it to decide.
- A numeric keyboard is requested with `inputMode`, not `type="number"`, so the field keeps its leading zeros and its
  decimal comma.
- The print layout is the Theme, Font, Motion and Print rule's business.
- `useReducedMotion()` lives in `shared/layout`. It reads `window.matchMedia('(prefers-reduced-motion: reduce)')` and
  subscribes to its change event, and returns a boolean. It is the only place besides `useLayout` where
  `window.matchMedia` appears; the media query string itself is the one the CSS rules already allow. `ThemeProvider`
  uses it (the Theme, Font, Motion and Print rule); a feature does not.

## Infrastructure

- CSS Modules (built into Vite). Antd component tokens for control height (see the Theme, Font, Motion and Print rule).
- Playwright projects and the helper of the 48 px check are described in the Browser Tests rule (`e2e.md`).

## Verification

- Stylelint and a unit test: every `@media` in `src/**/*.css` is `min-width: 768px`, `min-width: 1024px`, `print` or
  `prefers-reduced-motion`.
- Playwright (the Browser Tests rule, `e2e.md`): on the key screens in every project, every visible interactive element,
  including the breadcrumb items and the links inside a text, is at least 48 × 48 px, and the page does not scroll
  sideways. There is no exemption attribute: a target that is too small is fixed, not exempted. The other screens are
  covered by the ESLint and Stylelint rules and the component tests.
- Playwright saves a screenshot of each of these screens in every project; the reviewer opens them.
- Unit test of `useReducedMotion` with a mocked `matchMedia`: the value follows the query and its change event.
- ESLint: `no-restricted-imports` for the antd components in the replacement table, `no-restricted-syntax` for
  `size="small"`.
