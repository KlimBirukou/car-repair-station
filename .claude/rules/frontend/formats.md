---
paths:
  - "frontend/src/shared/format/**/*.ts"
  - "frontend/src/shared/strings/**/*.ts"
  - "frontend/src/**/*.tsx"
---

# Rule: Formatting and Strings

## Default

Unless explicitly overridden by the project specification:

- **What:** One module formats and parses every amount, quantity, number, date and instant. One module holds every
  user-visible string. The frontend never calculates money.
- **When:** Whenever a value is shown or typed, and whenever text is shown.
- **Where:** `src/shared/format/` and `src/shared/strings/`.
- **How (money):**
    - The API gives a JSON number. `formatMoney(1250)` gives `1,250.00 ₾` (English grouping, always 2 decimals, a space,
      the sign `₾`). The sign lives only in this module.
    - A quantity: `formatQuantity(2.5)` gives `2.5` (up to 3 decimals, no trailing zeros).
    - Totals, balances and line totals come from the backend. The frontend does not add, multiply or round.
    - Input: `parseMoney(text)` and `parseQuantity(text)` return a `number` or an error code; they accept a dot or a
      comma, reject more decimals than allowed and never round. `moneyToInput(1250)` gives `'1250.00'`, the text for a
      prefilled field (a payment amount): the only way a number goes back into a field.
    - Other numbers: `parseInteger(text)` (year, mileage: digits only, no sign), `parseHours(text)` (`standardHours`, up
      to 2 decimals), `formatHours(1.5)` gives `1.5`, `formatInteger(120000)` gives `120,000` (mileage). A count or a
      page number is shown with `String(n)`.
- **How (time):**
    - `STATION_TIME_ZONE = 'Asia/Tbilisi'` is one constant in `shared/format/zone.ts` (it equals the backend's
      `app.station-time-zone`).
    - An instant (an ISO string with `Z`) is shown in the station zone: `formatInstant` → `DD.MM.YYYY HH:mm:ss`,
      `formatInstantDate` → `DD.MM.YYYY`. Implementation: dayjs with the `utc` and `timezone` plugins.
    - `formatInstantTime` → `HH:mm` (the time of an appointment in a list row), same zone.
    - A date without time (`LocalDate`, for example `Payment.date`, a day filter) is shown by `formatDate` →
      `DD.MM.YYYY` with no zone conversion: it is already a day of the station.
    - `stationToday()` returns today's `YYYY-MM-DD` in the station zone; `stationNow()` returns the current instant as
      an ISO string (the default of a date-and-time field). Together they are the only places that ask the system for
      the current time.
    - `toInstant(localDateTime)` and `toLocalDateTime(instant)` convert between the value of the native date-and-time
      input (`YYYY-MM-DDTHH:mm`, a wall-clock time of the station) and the instant of the API; they are used by
      `DateTimeField` only.
    - A filter by day sends the `YYYY-MM-DD` string as it is. The backend turns it into a range of instants.
    - Text is `DD.MM.YYYY` everywhere. The one exception is the inside of a native date field, which the browser draws
      in its own locale (the Forms and Validation rule).
- **How (strings):**
    - `src/shared/strings/<feature>.ts` exports a `const` object per feature; `index.ts` joins them as `strings`. A text
      with a variable is a function (`strings.order.title(make, model, plate)`), never a concatenation in a component.
    - The statuses have labels in `strings.status` typed as `Record<OrderStatus, string>`: a new backend status breaks
      the build until a label exists.
    - The texts of `docs/product/screens.md` are copied exactly.
    - Texts that come from the backend (`detail`, `errors`, transition `label`, `message`) are shown as they are and are
      not in `strings`.
- **How (language):** English only. No language switcher, no locale-dependent code.

Example (strings and their use):

```ts
// shared/strings/order.ts
export const order = {
    title: (make: string, model: string, plate: string) => `${make} ${model} · ${plate}`,
    linesLocked: 'Lines are locked',
} as const;

// a component
<Text>{strings.order.linesLocked} < /Text>
< Text > {formatMoney(order.total
)
}
</Text>
```

## Why

- Binary floating-point arithmetic and hand formatting disagree with the backend by a cent or a day. A single module
  makes the format uniform and testable.
- A date near midnight differs between UTC and the station zone (`2026-10-04T21:30:00Z` is already 05.10.2026 in
  Tbilisi); only one place may decide.
- One place for texts makes a wording change one edit and lets a reviewer compare the texts with the backend's.

## Exceptions

The specification may require another currency or another format. Follow it in the module; nothing else changes.

## Prohibitions

- No `new Date()`, `Date.now()`, `dayjs()` (call without argument), `toLocaleString`, `toLocaleDateString`,
  `toLocaleTimeString`, `Intl.*`, `toFixed`, `parseFloat`, `parseInt`, `Number(...)` outside `shared/format`.
- No `+`, `-`, `*`, `/` on a money or quantity value; no sum of lines on the client.
- No literal `₾` outside `shared/format`.
- No `LocalDate` string passed through the timezone conversion; no instant shown without it.
- No user-visible text in a component, a hook or a test of behaviour: not as JSX text, not in `placeholder`, `title`,
  `aria-label`, `label`, `okText`, `cancelText`.
- No concatenated or pluralized text built in a component.

## Special Cases

- `aria-label` texts are user-visible (a screen reader) and live in `strings` too.
- A number that is not money (a count, a page number) may be shown with `String(n)`.
- Tests of behaviour may import `strings` to find an element by its label; they do not repeat the literal.

## Infrastructure

- `dayjs` with `utc` and `timezone`; `Intl.NumberFormat('en-US')` inside `shared/format` only.
- ESLint: `no-restricted-syntax` selectors for the calls above, `no-restricted-syntax` for
  `JSXAttribute[name.name=/^(aria-label|placeholder|title|label|okText|cancelText)$/][value.type='Literal']`,
  `react/jsx-no-literals` for JSX text. `shared/format` and `shared/strings` are excluded.

## Verification

- Unit tests with literals, no recomputation: `formatMoney(1250)` → `1,250.00 ₾`; `formatMoney(0)` → `0.00 ₾`;
  `formatInstant('2026-10-04T21:30:00Z')` → `05.10.2026 01:30:00`; `formatInstantDate('2026-10-04T21:30:00Z')` →
  `05.10.2026`; `formatDate('2026-10-05')` → `05.10.2026`; `parseMoney('125,5')` → `125.5`; `parseMoney('1.005')` →
  error.
- `stationToday()` with the system time fixed (`vi.setSystemTime`) at `2026-10-04T21:30:00Z` → `2026-10-05`;
  `stationNow()` at the same time → `2026-10-04T21:30:00.000Z`; `toInstant('2026-10-05T01:30')` →
  `2026-10-04T21:30:00.000Z`; `moneyToInput(1250)` → `1250.00`; `parseInteger('1990')` → `1990`, `parseInteger('-1')` →
  error; `formatInteger(120000)` → `120,000`.
- Test that every `OrderStatus` has a label and a badge style.
- `npm run lint` fails on every item of Prohibitions.
- `formatInstantTime('2026-10-04T21:30:00Z')` → `01:30`;
