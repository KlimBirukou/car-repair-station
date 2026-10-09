---
paths:
  - "backend/src/**/web/**/*.java"
  - "backend/src/**/common/web/**/*.java"
---

# Rule: Web Layer and OpenAPI

## Default

Unless explicitly overridden by the project specification:

- **What:** A controller is a thin HTTP adapter. Requests and responses are records. The OpenAPI document is generated
  from the code, describes the responses and the probable errors, and is the contract for the frontend.
- **When:** For every endpoint.
- **Where:** `<feature>/web/` (see the Package Structure rule). Shared web code is in `common/web`: `ApiPaths`,
  `ApiErrors`, `ApiProblem`, `PageResponse`, `PageRequests`, `OpenApiConfig`, `ApiErrorsCustomizer` and the
  `GlobalExceptionHandler`.
- **How (paths):** Every endpoint is under `/api/v1`: `@RequestMapping(ApiPaths.V1 + "/work-orders")`, where
  `ApiPaths.V1` is `"/api/v1"`. Resource names are plural and kebab-case. The version stays `v1` until an incompatible
  change cannot be avoided. There is no version in a header.
- **How (two types per feature):** `<Feature>ControllerApi` is an interface that holds the OpenAPI documentation only.
  `<Feature>Controller` implements it and holds the Spring MVC annotations only.
    - Interface: `@Tag(name = "<Plural>")`, `@Operation(summary = ...)` on every method (a `description` when the
      summary is not enough), `@ApiErrors`, `@ParameterObject`.
    - Controller: `@RestController`, `@RequestMapping`, `@RequiredArgsConstructor`, the mapping annotations,
      `@Valid @RequestBody`, `@PathVariable`, `@PageableDefault`, `@ResponseStatus`.
    - A method maps the request with the web mapper, calls the service and maps the result. No logic, no `try/catch`, no
      role check, no `ResponseEntity`.
- **How (status codes):** Create is 201 with the created resource in the body (no `Location` header). `PUT`, activate,
  deactivate and the commands of the work order are 200 with the whole resource. Deleting a customer or a vehicle is
  204, the only success without a body. The code is set with `@ResponseStatus(HttpStatus.X)`: the enum, not a number.
- **How (endpoints):**
    - Standalone entities: `POST /`, `PUT /{id}`, `GET /{id}`, `GET /`.
    - Soft-deleted entities (customer, vehicle): `DELETE /{id}`. The owner of a vehicle: `PUT /vehicles/{id}/owner`.
    - Deactivated entities (employee, service item, part): `POST /{id}/deactivate` and `POST /{id}/activate`.
    - The work order: the commands of the Aggregates rule and `POST /{id}/transitions`. Passwords and login: the
      Security rule.
    - Search is the feature `search`: `GET /search?query=` returns customers (full name, phone) and vehicles (plate,
      VIN), at most 5 of each, grouped, without paging. It uses the service interfaces of those features.
    - Employees: `GET /employees/mechanics` returns the active mechanics as `EmployeeRef` (id and name), for both roles,
      without paging (a bounded staff list); it is declared before `/{id}`. The employee response carries
      `canDeactivate` and `canChangeRole`, computed in the service by `EmployeePermissions` from `CurrentUser` and the
      record (false for the user's own record).
    - Filters for cards: the vehicle filter has `customerId`, the order filter has `customerId` and `vehicleId`. There
      is no composite endpoint for a card.
    - A response that names another entity carries its `Ref` (see the References rule), not a bare id.
- **How (lists):** The controller takes `Pageable` with `@PageableDefault(size = 20)` and a filter record
  `<Feature>FilterRequest` as `@ParameterObject`. It calls `PageRequests.restrict(pageable, "name", ...)`: an unknown
  sort property is `INVALID` with `errors.sort`, and `id` is appended as the last key. The web mapper builds the
  `<Feature>Filter`. A day in a filter (`LocalDate`) becomes a half-open range of instants in the station zone in the
  web mapper, with `StationTime` as a MapStruct `@Context`. The board of orders is one list request per column (a status
  filter).
- **How (flags for the UI):** Everything the UI must hide or show by role is a boolean in a response: `capabilities` in
  `GET /auth/me`, `permissions` and `linesEditable` in an order, `null` for a field the user may not see and
  `canDeactivate` and `canChangeRole` in an employee (`Part.purchasePrice`). A new role-dependent screen element
  therefore needs a flag in the response, never a role literal in the frontend. The flags are computed in services (see
  the Security and Aggregates rules); the web mapper copies them.
- **How (validation):** Annotations carry no message text. The texts come from `ValidationMessages.properties`
  (`jakarta.validation.constraints.NotBlank.message=Required field` and so on) and are the texts of
  `docs/product/screens.md`. Use `@Size(max = n)` only: a minimum is `@NotBlank` or a rule of its own. The limits equal
  the column lengths in the changelogs. Request records trim their strings (not passwords) in the compact constructor,
  so that validation sees the clean value (see the Services rule).
- **How (errors in OpenAPI):** `@ApiErrors({ErrorKind.NOT_FOUND, ErrorKind.CONFLICT})` on an interface method, or on the
  interface for all its methods, lists the errors an operation can return. `ApiErrorsCustomizer` (a springdoc
  `OperationCustomizer`) turns every listed `ErrorKind` into a response: the code is `kind.status()`, the description is
  `kind.description()`, the schema is `ApiProblem`. It finds the annotation with merged-annotation lookup, so the
  interface is searched. It also adds on its own `UNAUTHORIZED` to every operation and `INVALID` to every operation that
  has a parameter or a body. `FORBIDDEN`, `NOT_FOUND` and `CONFLICT` are declared. There is no `@ApiResponse` for errors
  and no status number written by hand.
- **How (OpenAPI document):**
    - Success responses come from the return type and `@ResponseStatus`. There are no JSON examples.
    - `ApiProblem` documents the `ProblemDetail` shape: `type`, `title`, `status`, `detail`, `instance`, `code` and
      `errors` (a map from a field to its text).
    - The customizer sets `operationId` to `<controller><Method>` (`customerFindAll`), so every id is unique.
    - Every component of a response record is `@NotNull` (required) or `@Schema(nullable = true)`. Money is `BigDecimal`
      (`number`), an instant is `Instant` (`date-time`).
    - Swagger UI and `/v3/api-docs` are enabled only in `dev` and `test`. `OpenApiExportTest` writes the document to
      `backend/openapi/openapi.json` with sorted keys; the file is committed.

Example (the interface and the controller):

```java

@Tag(name = "Customers")
public interface CustomerControllerApi {

    @Operation(summary = "Update a customer", description = "Replaces the mutable fields of a customer and returns it.")
    @ApiErrors({ErrorKind.NOT_FOUND, ErrorKind.CONFLICT})
    CustomerResponse update(UUID id, UpdateCustomerRequest request);

    @Operation(summary = "List customers")
    PageResponse<CustomerResponse> findAll(@ParameterObject CustomerFilterRequest filter, @ParameterObject Pageable pageable);
}
```

```java

@RestController
@RequestMapping(ApiPaths.V1 + "/customers")
@RequiredArgsConstructor
public class CustomerController implements CustomerControllerApi {

    private final CustomerService customerService;
    private final CustomerWebMapper webMapper;

    @PutMapping("/{id}")
    @Override
    public CustomerResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateCustomerRequest request) {
        return webMapper.toResponse(customerService.update(id, webMapper.toDto(request)));
    }

    @GetMapping
    @Override
    public PageResponse<CustomerResponse> findAll(CustomerFilterRequest filter, @PageableDefault(size = 20) Pageable pageable) {
        var page = customerService.findAll(webMapper.toFilter(filter), PageRequests.restrict(pageable, "fullName", "email"));
        return PageResponse.of(page, webMapper::toResponse);
    }
}
```

## Why

- A separate documentation interface keeps the controllers short and readable, and the documentation in one place.
- The code and the description of an error are written once, in `ErrorKind`. The handler and the OpenAPI document read
  the same enum, so they cannot disagree.
- Without `required` a generated TypeScript type makes every field optional. The contract test removes that.
- Texts in one properties file are the texts of the screens: the frontend shows them as they come.
- One version prefix in one constant shows how the API is shared between independent parties; changing it later is one
  edit.

## Exceptions

The specification may require another endpoint shape. Follow it.

## Prohibitions

- No `facade` between a controller and a service.
- No `ResponseEntity` except in the login and logout methods, which set a cookie.
- No `Page`, domain record or JPA entity in a response: only web records and `PageResponse`.
- No logic, role check or `try/catch` in a controller; no mapping in it either, that is the web mapper's job.
- No JSON examples, no `@ApiResponse` for errors, no status number written by hand.
- No message text in a validation annotation.
- No endpoint outside `/api/v1`; no `@CrossOrigin` and no CORS configuration.
- No `@RequestParam` list longer than two: use a filter record.

## Special Cases

- The login and logout methods return `ResponseEntity` because they set the cookie.
- A command that deletes a line returns the whole updated order with 200, not 204: the client needs the new version.

## Infrastructure

- springdoc-openapi for the pinned Spring Boot version (take the exact artifact and version from the dependency
  management of Spring Boot 4.0.5 and the classes of the resolved jars, not from memory; Context7 when it is
  connected), Bean Validation, Jackson.
- `ValidationMessages.properties` and `messages.properties` in the classpath.
- Properties: `springdoc.swagger-ui.enabled`, `springdoc.api-docs.enabled`, `spring.data.web.pageable.*`.

## Verification

- `OpenApiContractTest` over the generated document: every path starts with `/api/v1`; every operation has a unique
  `operationId`, a tag and a summary; every operation has a 401 response; the error responses use only codes of
  `ErrorKind` and the schema `ApiProblem`; there are no examples; every property of a response is required or nullable;
  every list has `page`, `size` and `sort`.
- `@WebMvcTest` per controller (the service is a `@MockitoBean`): the success status; a validation failure is 400 with
  `errors.<field>` and the text of `screens.md`; an unknown id is 404; a forbidden call is 403.
- ArchUnit: a controller depends only on its service interface, web records and the web mapper; no class outside
  `..auth.web..` returns `ResponseEntity`; no controller method returns `Page`.
- Reviewer checklist: the interface and the controller of every feature, `@ApiErrors` matches the exceptions the service
  can throw, no item from Prohibitions.
