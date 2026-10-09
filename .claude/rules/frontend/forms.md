---
paths:
  - "frontend/src/shared/forms/**/*.ts"
  - "frontend/src/shared/forms/**/*.tsx"
  - "frontend/src/features/**/components/**/*.tsx"
  - "frontend/src/features/**/pages/**/*.tsx"
---

# Rule: Forms and Validation

## Default

Unless explicitly overridden by the project specification:

- **What:** Forms are Ant Design `Form`. The backend decides; the frontend checks only a closed list of simple things,
  each of which the backend checks too, so that an obvious mistake does not cost a request. Backend errors are shown
  through the same fields.
- **When:** For every form and every dialog with input.
- **Where:** `src/shared/forms/` (`rules.ts`, the field components, `applyProblem.ts`, `FormErrorSummary.tsx`), forms in
  `features/<f>/components/`.
- **How (layout):** `layout="vertical"`: the label is above the field and is always visible, never only a placeholder.
  One column. The submit button is in the `ActionBar` (see the Mobile-First Layout and Touch rule), full width on a
  phone. Submit on Enter is on. The first field with an error is scrolled into view (`scrollToFirstError`).
- **How (field names):** The `name` of a field equals the property name of the request record. A form declares its
  fields once (`const FIELDS = ['fullName', 'phone'] as const`) and uses the constants for the `name` props and for
  `applyProblem`.
- **How (client rules):** Only these, from `shared/forms/rules.ts`. Each has the same text as the backend
  (`ValidationMessages.properties`). The texts of the client checks live in `strings.validation`, written once by hand
  from that file. A backend error is shown as it comes (`applyProblem`), so a difference between the two texts is
  visible but harmless; the reviewer compares `strings.validation` with `ValidationMessages.properties` when a rule is
  added or changed. There is no automatic test for it.
    1. `required`: the field is not empty or blank.
    2. `maxLength(n)`: `n` comes from `LIMITS` in `src/api/generated/limits.ts` (the `maxLength` of the OpenAPI schema),
       never a typed number.
    3. Format: a valid date (the native date input already gives `YYYY-MM-DD` or an empty value), a number that is a
       number, greater than zero where the specification says so, with at most 2 decimals for money and 3 for a
       quantity.
    4. A date limit ("not in the future", "not before today") only when `docs/product/screens.md` or
       `docs/domain/entities.md` states it; "today" is `stationToday()` from the format module.
       Everything else (uniqueness, existence, status rules, rights, cross-field business rules) is the backend's. The
       user sees its answer under the field.
- **How (backend errors):** `applyProblem(form, error, FIELDS)`: for each key of `errors` that is in `FIELDS` it calls
  `form.setFields` with the text; the keys that are not in `FIELDS`, and a `detail` when there is no `errors`, go to
  `FormErrorSummary` (an alert above the buttons). The text is never changed. The error under a field is cleared when
  the user edits that field.
- **How (money, quantity and other numbers):** `MoneyInput`, `QuantityInput`, `IntegerInput` and `HoursInput` wrap the
  antd `InputNumber` in string mode with `controls={false}` (no step arrows). `MoneyInput`: `inputMode="decimal"`,
  precision 2, the currency sign as a suffix. `QuantityInput`: `inputMode="decimal"`, precision 3. `IntegerInput`:
  `inputMode="numeric"`, digits only, no sign, for a year and a mileage. `HoursInput`: `inputMode="decimal"`, precision
  2, for `standardHours`. The value that goes into the request is produced only by `parseMoney`, `parseQuantity`,
  `parseInteger` and `parseHours` of the format module: a `number`, never a string, never rounded silently (more
  decimals than allowed is a validation error). The suffix is not part of the value. These four are the only number
  fields; no feature wraps `InputNumber` itself.
- **How (dates):** `DateField` wraps the native `<input type="date">` (large, 48 px). Its value is the API's `LocalDate`
  string as it is: no parsing, no conversion. `DateTimeField` wraps the native `<input type="datetime-local">` (the
  intake date and time of a new order); its form value is the API's instant, converted through `toInstant` and
  `toLocalDateTime` of the format module, and its default is `stationNow()`. Showing a date that is not being edited is
  the format module's job (`DD.MM.YYYY`).
    - The text inside a native date field is drawn by the browser in the locale of the browser or the device (for
      example `10/05/2026` or `05.10.2026`). This is an accepted deviation from the format `DD.MM.YYYY` of `screens.md`
      and `frontend/CLAUDE.md`, recorded by the human in `docs/decisions.md`: the app does not try to change it, because
      a native input is what gives the right picker and keyboard on a phone. Everywhere that a date is shown as text (a
      list, a card, a message, a label) it is `DD.MM.YYYY`, through `formatDate`. A hint such as a placeholder with a
      format is not added to the field.
- **How (inputs):** Every text input sets `autoComplete` (on or off on purpose), `inputMode` (`numeric`, `decimal`,
  `tel`, `email`, `search`) and `enterKeyHint`. Phone numbers use `type="tel"`. Font size 16 px or more, so a phone does
  not zoom on focus.
- **How (choices):** Up to 6 options → `Segmented` or a radio group; more → `Select`; a record from another entity
  (customer, vehicle, employee, service item, part) → the shared `EntityPicker` (a searchable select backed by that
  feature's list query). No other picker is written.
- **How (submit):** The button is disabled and shows the loading state while the mutation is pending. The form stays
  open and filled after a failed submit. After success the dialog closes or the page navigates; a success toast is short
  and has no more than 3 words ("Saved").
- **How (version):** A form of a command that needs an expected version follows the version rule of the API Client and
  Queries rule.

## Why

- A rule written twice drifts. A closed list, a limit read from the contract and the same texts keep the two sides
  equal.
- A field name that equals the request property makes error mapping a one-line loop.
- Native date and numeric inputs give the right keyboard and picker on a phone for free and avoid parsing.
- A parity test would have tied the frontend build to a file of the other area; the texts are few, a backend text is
  shown as it comes anyway, and a reviewer sees a difference.

## Exceptions

The specification may require another client check. Add it to `rules.ts` and to the list above with its backend
counterpart; do not write it inside a form.

## Prohibitions

- No client rule outside `shared/forms/rules.ts`; no validation library (zod, yup) and no validator copied from the
  backend.
- No typed length, limit, regular expression or message text in a form.
- No arithmetic on money or quantity; no `parseFloat`, `Number(...)` or `toFixed` outside `shared/format`.
- No `DatePicker` of antd; no `Select` with search for a short list; no antd `InputNumber` outside the four number
  fields of `shared/forms`.
- No placeholder as the only label.
- No `form.setFields` outside `applyProblem`.
- No submit handler that is not guarded against a second call.

## Special Cases

- A rule that depends on the user's role is not a client rule.
- Optional fields are sent as `null` or omitted exactly as the generated request type says; an empty string is not "no
  value" unless the backend contract says so.

## Infrastructure

- Antd `Form`; `scripts/generate-limits.mjs` (part of `npm run api:generate`).

## Verification

- Unit tests of `rules.ts` with literal cases; of `parseMoney` (`'125.5'` → `125.5`, `'125.555'` → error, `''` → empty);
  of `applyProblem` (known key, unknown key, only `detail`).
- Component test per form (MSW): submit empty shows "Required field" and sends nothing; a backend 400 with
  `errors.email` shows the text under the field; a 409 `error.unique-violation` shows under the field; the button is
  disabled while pending.
- Every maximum length in the forms comes from `LIMITS` (ESLint `no-restricted-syntax` for a numeric literal in a `max`
  property of a rule).
