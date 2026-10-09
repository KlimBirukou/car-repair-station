---
paths:
  - "frontend/src/shared/theme/**/*"
  - "frontend/src/app/**/*.tsx"
  - "frontend/src/**/*.css"
  - "frontend/index.html"
---

# Rule: Theme, Font, Motion and Print

## Default

Unless explicitly overridden by the project specification:

- **What:** The look of `docs/product/ui-style.md` is applied through Ant Design tokens and a few CSS variables, from
  one file of constants. The look serves reading at a glance.
- **When:** For every color, size, radius, font, duration and print style.
- **Where:** `src/shared/theme/` (`tokens.ts`, `antdTheme.ts`, `StatusBadge.tsx`, `global.css`, `print.css`),
  `src/app/ThemeProvider.tsx`.
- **How (source):** `tokens.ts` is the only place with color values, sizes and durations. `antdTheme.ts` builds the
  `ConfigProvider` theme from it. `ThemeProvider` also writes the same values as CSS variables on `:root` (it is the one
  provider that reads `useReducedMotion`) (`--color-accent`, `--color-border-control`, `--radius-card`, ...) for CSS
  Modules. A color in a `.css` or `.tsx` file is a variable or a token, never a literal.
- **How (values):** From `ui-style.md`, in antd terms. The token names below are the common ones of antd; a worker
  checks each against the installed typings of the pinned antd 6 (`theme/interface`) before use and uses the name the
  version has:
    - colors: `colorPrimary` accent, `colorBgLayout` page, `colorBgContainer` white, `colorText`, `colorTextSecondary`,
      `colorBorder` the control border (`#8A817B`, 3:1 or more), `colorBorderSecondary` card borders and dividers
      (`#EEE7E2`), `colorError` the accent red;
    - shape: `borderRadius` 10, `borderRadiusLG` 14; card shadow as in the style file;
    - control size: `controlHeight` 48, `controlHeightLG` 56, and `controlHeightSM` also 48 (the small size is not used
      anyway);
    - text size: `tokens.ts` holds the sizes of the Mobile-First Layout and Touch rule and `antdTheme.ts` maps them:
      `fontSize` 16 (body), `fontSizeSM` 14 (the antd default is 12, which would put text below the minimum; antd
      components that use it, such as the helper text of a form, then stay at 14 or more), `fontSizeLG` 18 and
      `fontSizeXL` 20 (key data). The secondary size 15 and the two title sizes (24 on a phone, 30 from 768 px) have no
      antd token: they are CSS variables written by `ThemeProvider` (`--font-size-secondary`, `--font-size-title`,
      `--font-size-title-wide`), and `global.css` switches `--font-size-title` to the wide value inside
      `@media (min-width: 768px)`. The heading tokens of antd (`fontSizeHeading1` and so on) are set to values from this
      list as well, so that no antd heading is smaller than 24;
    - focus: a visible ring of 3 px in the text color with a 2 px offset on every focusable element (`ui-style.md`);
    - dangerous buttons: see "muted red" below;
    - motion: see below.
- **How (font):** Onest is a package dependency (`@fontsource-variable/onest`, Latin and Cyrillic subsets only),
  imported once in the entry file, so it is built into the application and nothing is loaded from the internet. The font
  stack is `'Onest Variable', system-ui, sans-serif`. No `<link>` to a font host and no `@import url(...)`. Georgian
  text (names of customers) is not in the Onest subsets: it is drawn by the `system-ui` fallback, which every current OS
  supports. This is accepted; no second font is added.
- **How (muted red):** `ui-style.md` says a dangerous action is never filled and is a "muted red outline" without giving
  a value. Assumption (the orchestrator records it in `context/PLAN.md`): `tokens.ts` has `colorDangerOutline`, the dark
  accent of the style file (`#8F2119`, 4.5:1 or more as text on white and 3:1 or more as a border), used for the border
  and the text of a dangerous button; the background is white, and a press (`:active`) shows the red tint.
  `antdTheme.ts` sets it as the `colorError` family of the `Button` component token, so that a button with `danger` is
  outlined and never filled; `colorError` itself stays the accent. The filled red button is the primary action only. If
  the human gives another value in `ui-style.md`, only `tokens.ts` changes.
- **How (status badges):** `StatusBadge` takes the status and draws the pill with its label and the colors of
  `ui-style.md`. The map is typed `Record<OrderStatus, { background; color }>`: a new status breaks the build. It is a
  presentation map, not a rule; it is the one place that may switch on a status for looks. Text in the badge is at least
  14 px and semi-bold. The status is always a word, never only a color.
- **How (reduced motion and print):** the two media queries `prefers-reduced-motion` and `print` are allowed in CSS
  besides the widths of the Mobile-First Layout and Touch rule. The `motion` token of antd cannot be switched by CSS, so
  `ThemeProvider` calls `useReducedMotion()` (`shared/layout`, see the Mobile-First Layout and Touch rule) and passes
  the result to `buildAntdTheme(reducedMotion)`, which sets `motion` to `false` when it is true. The CSS durations are
  switched by the media query alone.
- **How (motion):**
    - Wanted: feedback on press (a color change, 100 ms), a smooth opening and closing of a dialog or sheet, a smooth
      state change of a button (100 to 200 ms, the standard easing).
    - Not allowed: looping animation (except the loading spinner), moving backgrounds, page transitions, parallax,
      shimmer skeletons, anything longer than 300 ms.
    - The antd ripple (`wave`) is off; the press feedback is the `:active` style.
    - `prefers-reduced-motion: reduce` sets the antd `motion` token to false (through `useReducedMotion`, above) and the
      CSS durations to near zero (the one place where `!important` is allowed, in `global.css`).
- **How (contrast):** Text pairs 4.5:1 or more; the border of a control, the focus ring and the icon of a button 3:1 or
  more against what is behind them. Both are checked by a test over `tokens.ts`.
- **How (print):** `print.css` is a plain global file with one `@media print` block. CSS Modules hash their class names,
  so the sheet finds elements by attributes: a component that must not be printed carries `data-print="hide"` (the side
  menu, the tab bar, the top bar, the action bar, the banners, every button and the history section; the shared layout
  components set it themselves). The sheet hides `[data-print="hide"]`, sets a white background and black text, and lets
  the order card use the full width. What stays: the header, the customer, the vehicle, the lines, the total and the
  payment (`screens.md`). The Print button calls `window.print()`.
- **How (default theme):** There is one light theme. The default blue of antd never shows: the primary color, the link
  color, the focus color and the selected color all come from the tokens.

## Why

- Colors and sizes in one file make a change one edit and make contrast testable.
- A font that ships with the application cannot fail on a bad connection in a workshop.
- Short feedback tells a user that a tap landed; long or looping animation distracts and drains a battery.

## Exceptions

The specification may change a value of `ui-style.md`; the value changes in `tokens.ts` only.

## Prohibitions

- No literal color (`#...`, `rgb(...)`) outside `tokens.ts`; no literal font size, radius or duration in a component.
- No overriding of antd internal class names (`.ant-...`); use tokens or component tokens.
- No font from a CDN, no `@import url`.
- No dark theme, no theme switcher.
- No animation or transition that loops or lasts longer than 300 ms.
- No `!important` outside the reduced-motion block and `print.css`.
- No information carried by color alone.

## Special Cases

- A component token of antd (for example the option height of `Select`) is set in `antdTheme.ts`, not in a component.
- A color that exists only in the status map or the print sheet still lives in `tokens.ts`. `print.css` and `global.css`
  are stylesheets like any other: they use the variables (`var(--color-bg-container)`, `var(--color-text)`), not
  literals, and they are not excluded from Stylelint. The card shadow of `ui-style.md` is a token (`shadowCard`) and a
  variable too.

## Infrastructure

- antd `ConfigProvider` and `theme`; `@fontsource-variable/onest` (confirm the package name and subsets in the package's
  own documentation).

## Verification

- Unit test `contrast.test.ts` over `tokens.ts`: every text/background pair at 4.5:1 or more (body, secondary, accent on
  white, accent text on the red tint, every status badge pair), every control border and the focus ring at 3:1 or more
  against white and against the page background. The expected thresholds are literals.
- Unit test: every `OrderStatus` has a badge style and a label.
- Stylelint, for every `.css` file under `src` without exception (`shared/theme` included, because the only file with
  color values is `tokens.ts`, which is TypeScript): `color-no-hex`, `color-named: never`, and
  `function-disallowed-list` (`rgb`, `rgba`, `hsl`, `hsla`), so that a literal color in a stylesheet fails the build as
  well as one in code. The sibling `no-restricted-syntax` color selector of ESLint is switched off for `tokens.ts`
  alone.
- ESLint `no-restricted-syntax` for color literals (`Literal[value=/^#[0-9a-fA-F]{3,8}$/]`) outside
  `shared/theme/tokens.ts`. The selector is one of the entries that the ESLint configuration assembles in one place (the
  Frontend Structure rule).
- Unit test: `tokens.ts` has no text size below 14, and `antdTheme.ts` maps `fontSize`, `fontSizeSM`, `fontSizeLG` and
  `fontSizeXL` to 16, 14, 18 and 20; `buildAntdTheme(true).token.motion` is `false`.
- Component test: `ThemeProvider` with a mocked `matchMedia` for reduced motion turns antd motion off.
- Playwright (visual check by the reviewer): a screenshot of a list, an order card and a dialog per project; no blue, no
  ripple.
