---
paths:
  - "backend/src/main/java/**/*.java"
---

# Rule: Exceptions and Error Responses

## Default

Unless explicitly overridden by the project specification:

- **What:** Business errors are exceptions that extend `BusinessException`. An exception carries a kind (`ErrorKind`), a
  message code and arguments. It never carries client-facing text.
- **When:** Whenever a use case cannot continue because of a business rule or a missing object.
- **Where:** `BusinessException`, `ErrorKind`, the generic `NotFoundException`, `ForbiddenException`,
  `ConcurrentUpdateException` and `FieldErrorException` are in `common/exception`. Feature-specific exceptions are in
  `<feature>/exception/`. One `GlobalExceptionHandler` (`@RestControllerAdvice`, extends
  `ResponseEntityExceptionHandler`) is in `common/web`. Texts are in `messages.properties`.
- **How:**
    - `ErrorKind` is an enum that holds the status code (an `int`, so exceptions stay free of web types) and a short
      description: `NOT_FOUND` → 404, `INVALID` → 400, `CONFLICT` → 409, `FORBIDDEN` → 403, `UNAUTHORIZED` → 401. The
      handler and the OpenAPI document both read the code and the description from the enum: nothing is written a second
      time by hand (see the Web rule).
    - One handler method serves every `BusinessException`. It resolves the text from `messages.properties` by the code
      and arguments, falls back to the code itself if the text is missing, and returns `ProblemDetail` with the property
      `code`.
    - Handled business errors are logged at `INFO` without a stack trace.
    - Database errors are translated in the handler, not in services or adapters:
        - `DataIntegrityViolationException` with a unique violation (SQLState `23505`) → 409 with
          `code = error.unique-violation` and an `errors` map `{field: text}`. The text comes from
          `constraint.<constraint name>`, the field from `constraint.<constraint name>.field`. If the name has no entry:
          a generic conflict text without `errors`. The handler lower-cases the constraint name before the lookup.
        - any other integrity violation → 500 and an `ERROR` log (a missing check or a bug).
        - `ObjectOptimisticLockingFailureException` → 409. It is the second line of defence: the service compares the
          expected version first (see the Aggregates rule).
    - Bean Validation failures → 400 with `code = error.validation` and the same `errors` map `{field: text}` (override
      `handleMethodArgumentNotValid`).
    - A check that annotations cannot express (it depends on the clock or on data: the year limit "1900 and next year",
      a payment date in the future, a wrong current password, a blank reason of a transition) throws
      `FieldErrorException` from the service. It has the kind `INVALID`, the code `error.validation` and a list of field
      errors `(field, code, args)`. `BusinessException` has a method `fieldErrors()` (empty by default); the one handler
      adds the property `errors` `{field: text}` whenever the list is not empty, resolving each text from
      `messages.properties` by `field.<code>`. The field name is the property name of the request record. The response
      has the same shape as a Bean Validation failure.
    - A missing, expired or invalid session → 401 with `code = error.unauthorized`, produced by the security entry point
      in the same `ProblemDetail` shape (see the Security rule).
    - Any other exception → 500, a generic text, `ERROR` log with the stack trace.
    - Feature exceptions to the order and employee rules: `workorder/exception`: `LinesLockedException`,
      `OrderClosedException`, `IntakeDateLockedException`; `employee/exception`: `LastManagerException`
      (`CONFLICT`), `EmployeeSelfChangeException` (`FORBIDDEN`).
- **Language:** The interface is English and so is `messages.properties`. The frontend shows `detail` and the `errors`
  texts as they come; it has no message dictionary.

Example:

```java
public enum ErrorKind {
    NOT_FOUND(404, "The object does not exist or is not visible to the user"),
    INVALID(400, "The request is invalid: a field fails validation or an id is malformed"),
    CONFLICT(409, "The request conflicts with the current state or with a unique value"),
    FORBIDDEN(403, "The user is not allowed to do this"),
    UNAUTHORIZED(401, "The session is missing, expired or invalid");

    // fields status and description, accessors status() and description()
}
```

```java
public class NotFoundException extends BusinessException {

    public NotFoundException(Class<?> type, UUID id) {
        super(ErrorKind.NOT_FOUND, "error.not-found", type.getSimpleName(), id);
    }
}
```

```properties
error.not-found={0} not found (id={1})
error.concurrent-update=The order was changed by another user. Refresh the page.
constraint.uk_person_email=A person with this email already exists
constraint.uk_person_email.field=email
error.validation=Validation failed
error.order-closed=The order is closed and cannot be changed
field.year-range=Year must be between 1900 and {0}
field.payment-date-future=Date cannot be in the future
field.current-password-incorrect=Current password is incorrect
field.password-policy=Password must be 10 to 72 characters and contain a letter, a digit and a symbol
field.reason-required=Enter a reason
error.last-manager=At least one active manager must remain.
error.employee-self-change=You cannot deactivate yourself or change your own role.
error.intake-date-locked=The intake date can be changed only while the order is an appointment
```

```java

@ExceptionHandler(BusinessException.class)
ProblemDetail handle(BusinessException e) {
    var text = messageSource.getMessage(e.code(), e.args(), e.code(), Locale.ENGLISH);
    var problem = ProblemDetail.forStatusAndDetail(HttpStatusCode.valueOf(e.kind().status()), text);
    problem.setProperty("code", e.code());
    return problem;
}
```

## Why

- A new business rule needs one exception class and one line in `messages.properties`. The handler is not touched, so a
  forgotten handler cannot turn a business error into a 500.
- Texts live in one place and can change without touching services.
- Matching by constraint name is stable. Parsing the database message depends on the driver and the server language.
- Extending `ResponseEntityExceptionHandler` keeps Spring MVC's own errors (malformed JSON, wrong parameter type, wrong
  method) at their proper 4xx statuses instead of the catch-all 500.
- One `errors` shape for validation and for uniqueness means the frontend maps errors onto form fields once.

## Exceptions

If the specification requires a special response shape for a case, add a dedicated `@ExceptionHandler` for that
exception and follow the specification.

## Prohibitions

- No message text in exception classes and no `super(message)` with human-readable text.
- No per-exception handler methods for ordinary business errors.
- No parsing of database error messages.
- No catching of `Exception` or `DataIntegrityViolationException` in services and adapters.
- No `HttpStatus` or `ResponseEntity` in services, adapters or exceptions.
- No stack traces, SQL or constraint details in responses.
- No field text in a `FieldErrorException`: only the field, the code and the arguments.

## Special Cases

Adding a new `ErrorKind` requires a change in the handler. It is rare and must be a deliberate decision.

## Infrastructure

- Spring `MessageSource` (`messages.properties` on the classpath).
- `ProblemDetail` responses.
- Only the handler reads Hibernate's `ConstraintViolationException` (constraint name, SQLState) from the cause chain.

## Verification

- Integration tests (MockMvc or a running context): malformed JSON → 400; invalid UUID in the path → 400; unknown id →
  404; duplicate unique value → 409 with the mapped text under `errors.<field>`; validation error → 400 with `errors`.
- Unit test: every code used by `BusinessException` subclasses has an entry in `messages.properties`, and every
  `constraint.<name>` entry has a `constraint.<name>.field` entry.
- ArchUnit: services throw only `BusinessException` subclasses; only `GlobalExceptionHandler` depends on
  `org.springframework.dao..` and Hibernate exception classes.
- Unit test: every `field.<code>` used in a `FieldErrorException` has an entry in `messages.properties`.
- Integration test: a `FieldErrorException` gives 400 with `code = error.validation` and `errors.<field>` with the text.
- Integration tests: deactivating the last active manager and taking the role from them are rejected with 409 and the
  text of `error.last-manager`; the own record is rejected with 403 and `error.employee-self-change`; a changed intake
  date of an accepted order is 409 `error.intake-date-locked`.
