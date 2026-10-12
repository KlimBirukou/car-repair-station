---
paths:
  - "backend/src/test/**/*.java"
  - "backend/src/integrationTest/**/*.java"
---

# Rule: Testing

## Default

Unless explicitly overridden by the project specification:

- **What:** Every class with logic has a test class `<Class>Test` in the same package. A test proves a behaviour the
  task lists; no test is written for coverage.
- **When:** After the code of the task, not before: write the code, then its tests, then run the gate once. A task is
  done only when `./gradlew check` is green.
- **Stages (D-077):** The first run is stage 1.
    - `src/test/java`: unit tests of services and of pure classes (the transition table and its guards,
      `OrderPermissions`, `PasswordPolicy`, `TextNormalizer`, money), persistence mapper tests (no database),
      `@WebMvcTest` slices, ArchUnit (written only by the task that names it).
    - `src/integrationTest/java`: exactly three platform tests, written by the tasks that own them:
      `ChangelogPortabilityTest`, `SeedConsistencyTest`, `OpenApiExportTest` with `OpenApiContractTest`. The database is
      H2 in memory with the same init script as the application.
    - Stage 2 (only after the human allows it): adapter, specification and constraint tests, endpoint and security tests
      through the full context, concurrency and statement-count tests. A line of any rule's "Verification" that asks for
      such a test is stage 2: skip it unless the task lists it.
- **How (running):** While you work, run only the class you changed (`./gradlew test --tests '<Class>'`). Run the gate
  once at the end as `./gradlew check -q --console=plain` and read only what fails.
- **How (service unit tests):**
    - JUnit with `MockitoExtension` (strict stubs). Subject: `@InjectMocks private <Class> testObject`. Collaborators:
      `@Mock`. Captors: `@Captor`.
    - Stub only with `doReturn/doThrow/doNothing().when(mock).method(exact arguments)`. Never
      `when(...).thenReturn(...)`.
    - `@AfterEach void tearDown()` calls `verifyNoMoreInteractions` for every mock. A used stub counts as verified, so
      do not `verify` it again. `verify` only commands (void methods, side effects).
    - Prefer an exact-argument stub of the port with the expected record over `@Captor` plus field asserts. Use
      `@Captor` when the object cannot be built up front.
    - Arrange, act and assert are separated by blank lines, without comments. One scenario per test.
    - What a use case gets: the success path, each business failure branch (every exception it can throw) and each
      rights branch (each role the rule names). A pass-through use case gets the success test only. No null-contract
      tests (D-079).
- **Naming:** `method_shouldResult_whenCondition`, for example `update_shouldThrowNotFound_whenPersonMissing`. Data
  providers: `provide<What>`.
- **Parameterization:** `@MethodSource` or `@ValueSource` for variations, the provider right above the test.
  `@ParameterizedTest` only when there are two or more cases.
- **Assertions:** JUnit `Assertions`, expected value first. Compare whole records instead of field by field.
  `assertSame` when the same instance must pass through. Keep the result of `assertThrows` and check the data: for
  `BusinessException` its `code`.
- **Test data:** `private static final` constants at the top of the class, fixed literals (UUIDs through
  `UUID.fromString`, fixed dates). Builder methods `buildX()` are `private static` at the bottom of the same class. No
  shared fixtures. Expected values are literals, never recomputed with production logic.
- **Real objects for values:** `Clock.fixed(instant, ZoneOffset.UTC)`, properties records, DTOs. When the subject needs
  them, create it in `@BeforeEach` through its constructor (`@InjectMocks` injects only mocks and passes `null` for the
  rest).
- **IDs:** mock `IdGenerator` and assert the exact id: `doReturn(ID).when(idGenerator).generateId()`.

Example:

```java

@ExtendWith(MockitoExtension.class)
class PersonServiceImplTest {

    private static final UUID ID = UUID.fromString("0198a2c4-7b1e-7d3a-9f10-5c2e8a4b6d01");

    @Mock
    private PersonRepository personRepository;
    @Mock
    private IdGenerator idGenerator;

    @InjectMocks
    private PersonServiceImpl testObject;

    @AfterEach
    void tearDown() {
        verifyNoMoreInteractions(personRepository, idGenerator);
    }

    @Test
    void create_shouldInsertPerson_whenDtoValid() {
        var person = buildPerson();
        doReturn(ID).when(idGenerator).generateId();
        doReturn(person).when(personRepository).insert(person);

        var result = testObject.create(buildCreatePersonDto());

        assertSame(person, result);
    }

    @Test
    void update_shouldThrowNotFound_whenPersonMissing() {
        doReturn(Optional.empty()).when(personRepository).findById(ID);

        var exception = assertThrows(NotFoundException.class,
            () -> testObject.update(ID, buildUpdatePersonDto()));

        assertEquals("error.not-found", exception.code());
    }

    // buildPerson(), buildCreatePersonDto(), buildUpdatePersonDto(): private static builders at the bottom
}
```

## Why

- Strict stubs plus `verifyNoMoreInteractions` make every unexpected call fail, and a failing branch proves that nothing
  after it ran.
- Mocks cannot prove SQL, mappings, constraints, serialization or error responses: those belong to the platform tests
  now and to stage 2 later.
- Fixed data makes failures reproducible.

## Exceptions

A class without collaborators (a pure function, a value object) is tested without mocks. The specification may add
acceptance tests for a use case; follow it.

## Prohibitions

- `when(...).thenReturn(...)` and `lenient()`.
- `@MockBean` (removed in Spring Boot 4); use `@MockitoBean` in Spring slice tests.
- Mocking value objects, records, DTOs, `Clock` or properties.
- `UUID.randomUUID()`, `LocalDate.now()`, `Instant.now()`, `ZoneId.systemDefault()` in tests.
- `ReflectionTestUtils` on production fields: inject through the constructor or a properties record.
- Logic (`if`, ternary, loops) in tests; expected values computed like production code.
- `Thread.sleep`.
- Redundant checks: `verify` of an already stubbed call, `times(1)`, `doNothing()` on a void method.
- A `@ParameterizedTest` with one case.
- Null-contract tests (`@NullSource` and the like).
- Tests that insert rows by SQL to try a constraint.
- Comparing two password hashes.
- State shared between tests.

## Special Cases

- Logging checks (for example "the password is not logged"): attach and detach the appender in a JUnit extension or in
  `try/finally`, never without cleanup.
- Password hashing: test that `matches` is true for the right password and false for a wrong one. Never assert a hash
  value (it is salted).

## Infrastructure

- Gradle test dependencies: `spring-boot-starter-test`; for Spring Boot 4 slices the modular starters
  `spring-boot-starter-webmvc-test` and `spring-boot-starter-data-jpa-test`; `archunit-junit5`;
  `testRuntimeOnly 'org.junit.platform:junit-platform-launcher'`.
- Source set `integrationTest` extends the `test` dependencies; `check` depends on `integrationTest`.
- AssertJ arrives with `spring-boot-starter-test` but is not used by convention: JUnit assertions only.
- Formatting is enforced by Spotless, not by review.

## Verification

- `./gradlew check` is the single gate: agents, hooks and the reviewer run it.
- Reviewer checklist: every use case the task lists has its success path, its business failure branches and its rights
  branches; every endpoint of a `@WebMvcTest` slice has the success path and the error mapping; no item from
  Prohibitions; no test of stage 2 unless the task lists it.
- ArchUnit (only in the task that names it): test classes mirror the package of the class under test and end with
  `Test`.
