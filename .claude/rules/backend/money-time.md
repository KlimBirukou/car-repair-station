---
paths:
  - "backend/src/main/java/**/*.java"
---
# Rule: Money and Time

## Default
Unless explicitly overridden by the project specification:

- **What:** Money is an exact decimal, never a binary floating-point number. A moment in time is an instant, and the station's time zone is applied only where a person's day matters.
- **When:** For every amount, quantity, date and time.
- **Where:** Domain records, JPA entities, DTOs, requests, responses and the changelogs.
- **How (money):**
    - Java `BigDecimal` with scale 2, database `NUMERIC(12,2)`, JSON a plain number (`125.50`), not a string. The OpenAPI type is `number` and the generated TypeScript type is `number`. The currency is always lari and is never part of the data.
    - A quantity is `BigDecimal`, database `NUMERIC(10,3)`, greater than 0.
    - Line total = `quantity × price`, rounded to 2 decimals with `RoundingMode.HALF_UP`. Order total = the sum of the rounded line totals. Balance = total − payments. All calculations are done on the backend; the frontend only shows the numbers.
    - A number is written as plain digits, never in exponent notation.
- **How (time):**
    - An instant is `Instant` in Java, `TIMESTAMP WITH TIME ZONE` in the database and ISO-8601 in UTC with `Z` in JSON (`2026-10-05T06:30:00Z`). A date without time is `LocalDate`, `DATE` and `2026-10-05`. `hibernate.jdbc.time_zone` is `UTC`.
    - The station zone is `app.station-time-zone` (`Asia/Tbilisi`). It is used wherever a day matters: the Today screen, the default date of a payment, the day of an appointment. A day is computed from the injected `Clock` and this zone.
    - "Now" always comes from an injected `Clock`. The `Clock` bean is in `common/service`.
    - `StationTime` (a component in `common/service`, built from the `Clock` and the station zone) gives `today()` and `startOfDay(LocalDate)`. A filter that takes a day (`LocalDate`) becomes a half-open range of instants through it.
    - The frontend shows instants in the station zone (see `frontend/CLAUDE.md`).

## Why
- Binary floating-point sums drift (0.1 + 0.2 is not 0.3), and money must add up to the cent. A plain JSON number keeps the frontend simple while the backend stays exact.
- UTC instants avoid zone and daylight-saving bugs. The station zone only decides what "today" is.
- An injected `Clock` makes day boundaries testable.

## Exceptions
The specification may require another currency or another rounding. Follow it.

## Prohibitions
- No `double`, `float` or their wrappers for money or quantity, anywhere.
- No money as a JSON string and no money arithmetic in the frontend.
- No `Instant.now()`, `LocalDate.now()`, `LocalDateTime.now()`, `ZoneId.systemDefault()` or `new Date()` in application code.
- No `LocalDateTime` for a moment in time.
- No time zone offset or zone name stored in the data; the station zone is configuration.

## Special Cases
- `Payment.date` is a `LocalDate` in the station zone. `intakeDate` and `changedAt` are instants.
- A day near midnight: `2026-10-04T21:30:00Z` is already 2026-10-05 in `Asia/Tbilisi`.

## Infrastructure
- A `Clock` bean (`Clock.systemUTC()`); tests use `Clock.fixed(...)`.
- Properties: `app.station-time-zone`.

## Verification
- Unit tests with literals: `2.500 × 10.15` gives `25.38`; an order total is the sum of the rounded line totals; the balance after a payment is `0.00`.
- ArchUnit: no field or parameter of type `double`, `float`, `Double` or `Float` in domain records, DTOs, requests and responses; no call of `Instant.now()`, `LocalDate.now()` or `LocalDateTime.now()` in application packages.
- Integration test: an order in JSON has amounts as numbers and instants that end with `Z`.
- Test of the Today boundary with a fixed `Clock` at `2026-10-04T21:30:00Z`: the appointments of 2026-10-05 are returned.
