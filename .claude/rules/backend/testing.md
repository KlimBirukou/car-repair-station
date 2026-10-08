---
paths:
  - "backend/src/test/**/*.java"
  - "backend/src/integrationTest/**/*.java"
---
# Rule: Testing

## Default
Unless explicitly overridden by the project specification:

- **What:** Every class with logic has a test class `<Class>Test` in the same package as the class.
- **When:** Together with the code. A task is done only when `./gradlew check` is green.
- **Where:**
    - `src/test/java`: unit tests of services, persistence mapper tests, `@WebMvcTest` slices, ArchUnit tests.
    - `src/integrationTest/java`: everything that needs a real database or the full context (adapters, specifications, constraints, smoke flows, the changelog portability test on H2, the seed consistency test).
    - `check` runs both source sets.
- **How (service unit tests):**
    - JUnit with `MockitoExtension` (strict stubs). Subject: `@InjectMocks private <Class> testObject`. Collaborators: `@Mock`. Captors: `@Captor`.
    - Stub only with `doReturn/doThrow/doNothing().when(mock).method(exact arguments)`. Never `when(...).thenReturn(...)`.
    - `@AfterEach void tearDown()` calls `verifyNoMoreInteractions` for every mock. A used stub counts as verified, so do not `verify` it again. `verify` only commands (void methods, side effects).
    - Prefer an exact-argument stub of the port with the expected record over `@Captor` plus field asserts. Use `@Captor` when the object cannot be built up front.
    - Arrange, act and assert are separated by blank lines, without comments. One scenario per test.
- **Naming:** `method_shouldResult_whenCondition`, for example `update_shouldThrowNotFound_whenPersonMissing`. Null contract: `method_shouldThrowNpe_whenArgumentNull`. Data providers: `provide<What>`.
- **Parameterization:**
    - `@NullSource` for a null argument. With several parameters use a `@MethodSource` that nulls one parameter at a time.
    - `@MethodSource` or `@ValueSource` for variations, the provider right above the test.
    - Use `@ParameterizedTest` only when there are two or more cases. The one exception is the null-contract test: `@ParameterizedTest` with `@NullSource`, even for a single parameter.
- **Assertions:** JUnit `Assertions`, expected value first. Compare whole records instead of field by field. `assertSame` when the same instance must pass through. Keep the result of `assertThrows` and check the data: for `BusinessException` its `code`.
- **Test data:**
    - `private static final` constants at the top of the class, fixed literals (UUIDs through `UUID.fromString`, fixed dates).
    - Builder methods `buildX()` are `private static` at the bottom of the same class. No shared fixtures.
    - Expected values are literals, never recomputed with production logic.
- **Real objects for values:** `Clock.fixed(instant, ZoneOffset.UTC)`, properties records, DTOs. When the subject needs them, create it in `@BeforeEach` through its constructor (`@InjectMocks` injects only mocks and passes `null` for the rest).
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

    @ParameterizedTest
    @NullSource
    void create_shouldThrowNpe_whenArgumentNull(CreatePersonDto dto) {
        assertThrows(NullPointerException.class, () -> testObject.create(dto));
    }

    // buildPerson(), buildCreatePersonDto(), buildUpdatePersonDto(): private static builders at the bottom
}
```

## Why
- Strict stubs plus `verifyNoMoreInteractions` make every unexpected call fail, and a failing branch proves that nothing after it ran (for example, nothing was saved).
- `doReturn` everywhere gives one syntax for void and non-void methods and for spies. The price: the compiler does not check the return type, so a mismatch fails at run time.
- An exact-argument stub with an expected record checks that the service assembled the object correctly, in one line.
- Fixed data makes failures reproducible. Real value objects remove `lenient()` stubs and hidden coupling to the implementation.
- Mocks cannot prove SQL, mappings, constraints, serialization or error responses, so those have their own test layers.
- The null-contract tests are the only mechanical check that Lombok `@NonNull` is present on `*ServiceImpl` parameters.

## Exceptions
A class without collaborators (a pure function, a value object) is tested without mocks. The specification may add acceptance tests for a use case; follow it.

## Prohibitions
- `when(...).thenReturn(...)` and `lenient()`.
- `@MockBean` (removed in Spring Boot 4); use `@MockitoBean` in Spring slice tests.
- Mocking value objects, records, DTOs, `Clock` or properties.
- `UUID.randomUUID()`, `LocalDate.now()`, `Instant.now()`, `ZoneId.systemDefault()` in tests.
- `ReflectionTestUtils` on production fields: inject through the constructor or a properties record.
- Logic (`if`, ternary, loops) in tests; expected values computed like production code.
- `Thread.sleep`: use Awaitility.
- Redundant checks: `verify` of an already stubbed call, `times(1)`, `doNothing()` on a void method.
- A `@ParameterizedTest` with one case, except the `@NullSource` null-contract test.
- Comparing two password hashes.
- State shared between tests.

```java
when(personRepository.findById(ID)).thenReturn(Optional.of(person));   // use doReturn(...).when(...)
lenient().doReturn(Optional.of(person)).when(personRepository).findById(ID);   // stub in the test that needs it
@Mock private Clock clock;                                             // use Clock.fixed(...)
doReturn(UUID.randomUUID()).when(idGenerator).generateId();            // use the fixed ID
assertEquals(FIRST_NAME, saved.firstName());                           // compare the whole record
```

## Special Cases
- Logging checks (for example "the password is not logged"): attach and detach the appender in a JUnit extension or in `try/finally`, never without cleanup.
- Password hashing: test that `matches` is true for the right password and false for a wrong one. Never assert a hash value (it is salted).
- Async code: Awaitility with an explicit timeout.

## Infrastructure
- Gradle test dependencies: `spring-boot-starter-test`; for Spring Boot 4 slices the modular starters `spring-boot-starter-webmvc-test` and `spring-boot-starter-data-jpa-test`; Testcontainers (PostgreSQL) with the Boot-managed version; `archunit-junit5`; Awaitility; `testRuntimeOnly 'org.junit.platform:junit-platform-launcher'`.
- Source set `integrationTest` extends the `test` dependencies; `check` depends on `integrationTest`.
- AssertJ arrives with `spring-boot-starter-test` but is not used by convention: JUnit assertions only.
- Formatting is enforced by Spotless, not by review.

## Verification
- `./gradlew check` is the single gate: agents, hooks and the reviewer run it.
- Reviewer checklist: every use case has the success path, every failure branch and the null contract; every adapter has insert, update, find and each filter; every endpoint has the success path and the error mapping; no item from Prohibitions.
- ArchUnit: test classes mirror the package of the class under test and end with `Test`.
