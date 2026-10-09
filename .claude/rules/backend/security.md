---
paths:
  - "backend/src/**/auth/**/*.java"
  - "backend/src/main/resources/application*.yaml"
---

# Rule: Security and Sessions

## Default

Unless explicitly overridden by the project specification:

- **What:** Employees log in with a login and a password. A session is a signed JWT in an HttpOnly cookie, valid for 12
  hours. Rights are checked in services through the `CurrentUser` port.
- **When:** For login, every request, every password change and every rights check.
- **Where:** The `auth` feature: `auth/web` (login, logout, current user, change own password), `auth/service`, and
  `auth/security` for the framework wiring (filter chain, token issuing, cookie, the `CurrentUser` adapter, the BCrypt
  adapter), package-private where possible. The shared types are in `common/security`: `CurrentUser`, `Role`,
  `PasswordPolicy`, `PasswordHasher`.
- **How (passwords):**
    - Policy (`PasswordPolicy`, a pure class): 10 to 72 bytes in UTF-8 (72 is the BCrypt limit), with at least one
      letter, one digit and one symbol (neither letter nor digit). It applies to an initial password, a reset and a
      change. A violation is `INVALID` with an `errors` entry: "Password must be 10 to 72 characters and contain a
      letter, a digit and a symbol".
    - Hash: BCrypt, strength 10, through `PasswordHasher` (the port is in `common/security`, the adapter is in
      `auth/security` on Spring Security's `BCryptPasswordEncoder`). The salt is random and stored inside the hash. The
      password is checked with `matches(raw, hash)`; two hashes are never compared. Only the hash is stored.
    - `Employee.passwordHash` is never in a response or a log: the domain record overrides `toString`, and the web
      mapper has no target for it.
- **How (login):** `POST /api/v1/auth/login` with `login` and `password`. The login is compared in lower case.
    - Unknown login or wrong password → `UNAUTHORIZED`, `error.invalid-credentials`, one text for both. For an unknown
      login the service still runs `matches` on a dummy hash, so the response time does not reveal it.
    - Correct password but a deactivated employee → `FORBIDDEN`, `error.account-deactivated` ("Your account is
      deactivated. Ask a manager to activate it."). The check comes after the password check, so a wrong password never
      shows it.
    - Success: the response sets the cookie and returns `expiresAt` and the user (`id`, `fullName`, `role`).
      `POST /api/v1/auth/logout` clears the cookie. `GET /api/v1/auth/me` returns the current user and `capabilities`:
      what the UI may offer to the role. `menu` is the ordered list of menu items (enum `MenuItem`: `TODAY`, `ORDERS`,
      `MY_ORDERS`, `CUSTOMERS`, `VEHICLES`, `PRICE_LIST`, `EMPLOYEES`; the first one is the home page after login), plus
      the booleans `canManageCustomers`, `canManageVehicles` (create, edit, delete, change owner) and `canCreateOrders`.
      A `Capabilities` record is built from the role in one method of the auth service; no other class decides them. The
      frontend never compares a role: it reads these values (and the flags of an order, see the Aggregates rule). The
      login response returns the same `capabilities`.
- **How (session):**
    - Token: JWT HS256 with `sub` (the employee id), `role`, `iat` and `exp` = `iat` + `app.security.token-ttl` (12
      hours). There is no refresh token: after the expiry the employee logs in again. The secret is
      `app.security.jwt-secret`, read from the environment variable `APP_JWT_SECRET`, at least 32 bytes. Only the `dev`
      profile has a default; elsewhere the application does not start without it.
    - Cookie: `access_token`, `HttpOnly`, `SameSite=Strict`, `Path=/`, `Max-Age` equal to the token lifetime, `Secure`
      set by `app.security.cookie-secure` (true by default, false in `dev`).
    - Every request: a resolver reads the cookie, the decoder checks the signature and the expiry, then the converter
      loads the employee. A missing, unknown or deactivated employee is `UNAUTHORIZED` (`error.unauthorized`). The role
      comes from the loaded employee, not from the token, so a deactivation or a role change works at once.
    - Filter chain: `/api/v1/auth/login` and `/v3/api-docs/**` are open, the rest of `/api/v1/**` needs a session. CSRF
      protection is off: the cookie is `SameSite=Strict`, the API is same-origin only (no CORS configuration) and takes
      JSON only. A 401 is the usual `ProblemDetail` (see the Exceptions rule).
- **How (rights):** Services read the user through `CurrentUser` (`id()`, `role()`, `requireRole(Role)` that throws
  `ForbiddenException`), never through `SecurityContextHolder`. Controllers carry no role annotations. Row-level and
  field-level rules are in the Services rule.
- **How (passwords of employees):** `PUT /api/v1/auth/password` changes the own password (current and new; a wrong
  current password is an `errors` entry "Current password is incorrect"). `PUT /api/v1/employees/{id}/password` lets a
  manager set a new password for another employee. There is no forced change at the first login.

## Why

- A cookie that scripts cannot read means a script injected into a page cannot steal the session, and the frontend has
  no token code at all. `SameSite=Strict` plus a same-origin API covers CSRF for this internal application.
- One primary-key read of the employee per request makes a deactivation work at once, which a plain JWT would not.
- BCrypt with the 72-byte cap and a short policy are the common simple defaults; the cap avoids silent truncation.

## Exceptions

The specification may require another mechanism: refresh tokens, a forced change at the first login, a lockout. Follow
it.

## Prohibitions

- No password, hash or token in a log, an exception message or a response.
- No `SecurityContextHolder` or `org.springframework.security` type outside `auth/security`.
- No role check in a controller or in a mapper; no capability computed outside the one `Capabilities` method.
- No comparison of two hashes, and no hand-written hashing or salting.
- No JWT secret in the repository except the `dev` one; no default secret outside `dev`.
- No token in a URL or in browser storage.

## Special Cases

- Accepted risks, not covered: login rate limiting and lockout, token revocation before the expiry (a stolen token works
  up to 12 hours; a deactivation stops it at once), forced password change.
- The seed password hash is BCrypt of strength 10, created offline.

## Infrastructure

- Spring Security with its OAuth2 resource server JWT support (Nimbus) and `spring-security-crypto`. The exact starter
  names for the pinned Spring Boot version come from its reference (The exact starter names for the pinned Spring Boot
  version come from its dependency management and the resolved jars, not from memory - Context7 when it is connected).
- Properties: `app.security.token-ttl`, `app.security.jwt-secret`, `app.security.cookie-secure`.

## Verification

- Unit tests: `Capabilities` for each role, every flag written out as a literal; `PasswordPolicy` with a table of
  accepted and rejected passwords written as literals; the login service for an unknown login, a wrong password, a
  deactivated employee with the right password, and success; `matches` is true for the right password and false for a
  wrong one, a hash value is never asserted.
- Integration tests (H2): login sets a cookie with `HttpOnly`, `SameSite=Strict` and `Max-Age=43200`; a request with
  that cookie works; an expired or tampered token gives 401; the same token gives 401 after the employee is deactivated;
  logout clears the cookie; `/api/v1/**` without a cookie gives 401; `/v3/api-docs` is open.
- ArchUnit: only `..auth.security..` depends on `org.springframework.security..`; `PasswordPolicy` has no dependencies.
- Reviewer checklist: no item from Prohibitions; every service that needs a right calls `CurrentUser`.
