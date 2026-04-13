# Architecture Reference

Dept44 framework details, configuration, testing patterns, and architectural decisions
for the api-service-document microservice.

## Table of Contents

- [Dept44 Framework](#dept44-framework)
- [Project Build](#project-build)
- [Configuration Properties](#configuration-properties)
- [Architectural Patterns](#architectural-patterns)
- [Service Layer](#service-layer)
- [Integration Layer](#integration-layer)
- [Testing Infrastructure](#testing-infrastructure)
- [Docker and CI/CD](#docker-and-cicd)

---

## Dept44 Framework

Dept44 is Sundsvall municipality's internal Spring Boot framework. The microservice builds
on `se.sundsvall.dept44:dept44-service-parent:8.0.5`.

### Modules Used

| Module | Purpose |
|--------|---------|
| `dept44-common-validators` | `@ValidMunicipalityId`, `@ValidUuid` annotations |
| `dept44-models` | `AbstractParameterPagingAndSortingBase`, `PagingMetaData` |
| `dept44-starter-feign` | Feign client infrastructure, `ProblemErrorDecoder`, OAuth2 interceptors |
| `dept44-starter-jpa` | JPA/Hibernate/DataSource autoconfiguration |
| `dept44-starter-test` | `AbstractAppTest`, `@WireMockAppTestSuite` |
| `dept44-starter-jpa-test` | JPA test utilities |

### Key Annotations

- **`@ServiceApplication`** — Replaces `@SpringBootApplication`. Used on `Application.java`.
  Enables dept44-specific autoconfiguration.
- **`@ValidMunicipalityId`** — Validates municipality ID format on path parameters.
- **`@ValidUuid`** — Validates UUID format on path parameters.

### Error Handling (RFC 7807)

Dept44 provides RFC 7807 Problem Details:
- `Problem.valueOf(HttpStatus, message)` — Creates a throwable problem
- `ThrowableProblem` — Base exception type
- `ConstraintViolationProblem` — Validation error with `Violation` list
- Automatically serialized as `application/problem+json`

---

## Project Build

### Maven Configuration

```xml
<parent>
    <groupId>se.sundsvall.dept44</groupId>
    <artifactId>dept44-service-parent</artifactId>
    <version>8.0.5</version>
</parent>

<groupId>se.sundsvall</groupId>
<artifactId>api-service-document</artifactId>
<version>3.0</version>
```

### Key Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| `spring-boot-devtools` | (managed) | Development hot reload |
| `faux-pas` | 0.9.0 | Zalando library for exception handling in lambdas |
| `hibernate-processor` | (managed) | JPA metamodel generation |

### Build Plugins

- **`openapi-generator-maven-plugin`** — Generates Java model classes from
  `src/main/resources/integrations/eventlog-api.yaml` into package
  `generated.se.sundsvall.eventlog`
- **`build-helper-maven-plugin`** — Adds generated sources to compilation
- **`jacoco-maven-plugin`** — Code coverage reporting

### Java Version

Java 25 (set in CI workflows and Dockerfile).

---

## Configuration Properties

### application.yml (Main Profile)

```yaml
# Application
spring.application.name: api-document

# Database
spring.datasource.driver-class-name: org.mariadb.jdbc.Driver
spring.datasource.type: com.zaxxer.hikari.HikariDataSource
spring.datasource.hikari.pool-name: document-pool

# JPA
spring.jpa.properties.hibernate.format_sql: true
spring.jpa.properties.hibernate.auto_quote_keyword: true

# File Upload Limits
spring.servlet.multipart.max-file-size: 60MB
spring.servlet.multipart.max-request-size: 60MB

# Flyway (disabled by default)
spring.flyway.enabled: false

# Eventlog Integration
integration.eventlog.connectTimeout: 5
integration.eventlog.readTimeout: 30

# MDC / Logging
mdc.municipalityId.enabled: true
logging.level.root: INFO

# OpenAPI
openapi.name: ${spring.application.name}
openapi.title: ${spring.application.name}
openapi.version: '@project.version@'
springdoc.swagger-ui.operationsSorter: alpha
```

### Required Runtime Environment Variables

These are not in committed config and must be supplied at deployment:

| Variable | Purpose |
|----------|---------|
| `spring.datasource.url` | MariaDB JDBC URL |
| `spring.datasource.username` | DB username |
| `spring.datasource.password` | DB password |
| `integration.eventlog.url` | Eventlog service URL |
| `integration.eventlog.logKeyUuid` | UUID for log key |
| `spring.security.oauth2.client.registration.eventlog.client-id` | OAuth2 client ID |
| `spring.security.oauth2.client.registration.eventlog.client-secret` | OAuth2 client secret |
| `spring.security.oauth2.client.provider.eventlog.token-uri` | OAuth2 token endpoint |

---

## Architectural Patterns

### 1. Revision-Based Immutability

Every document modification creates a new `DocumentEntity` row with `revision + 1`.
The `copyDocumentEntity` mapper method deep-copies an existing entity, including all
`DocumentDataEntity` children and their binary content.

**Implementation in `DocumentService.update()`:**
1. Fetch the latest revision entity
2. Deep-copy it via `DocumentMapper.copyDocumentEntity()`
3. Apply changes to the copy
4. Increment revision number
5. Save the new entity

**Exception:** `updateConfidentiality()` modifies ALL revisions in-place.

### 2. Multi-Tenancy via Municipality ID

- All REST paths start with `/{municipalityId}`
- All repository queries filter by `municipalityId`
- Document types are municipality-scoped
- Registration number sequences are municipality-scoped
- MDC logging includes municipality ID

### 3. Specification Pattern for Search

`SearchSpecification` uses JPA Criteria API to build composable, type-safe queries:

- `withSearchQuery()` — Full-text LIKE search with wildcard `*` -> `%` conversion.
  Searches across: `createdBy`, `description`, `municipalityId`, `registrationNumber`,
  `fileName`, `mimeType`, metadata keys and values.
- `withSearchParameters()` — Structured search by document types and metadata
  key/value matching with `matchesAny` (OR) and `matchesAll` (AND) logic.

Both support optional `onlyLatestRevision` and `includeConfidential` filters.

### 4. Circuit Breaker Pattern

All repositories and the Feign client use Resilience4j `@CircuitBreaker`:
- `DocumentRepository` — `@CircuitBreaker(name = "documentRepository")`
- `DocumentTypeRepository` — `@CircuitBreaker(name = "documentTypeRepository")`
- `EventLogClient` — `@CircuitBreaker(name = "eventlog")`

### 5. Pessimistic Locking

`RegistrationNumberSequenceRepository.findByMunicipalityId()` uses
`@Lock(LockModeType.PESSIMISTIC_WRITE)` to prevent concurrent registration number
collisions during document creation.

### 6. Entity Listeners

All entities use `@EntityListeners` with `@PrePersist` callbacks:
- `DocumentEntityListener` — Sets `id` (UUID) and `created` timestamp
- `DocumentTypeEntityListener` — Sets `id` (UUID), `created` timestamp;
  `@PreUpdate` sets `lastUpdated`
- `RegistrationNumberSequenceEntityListener` — Sets `id` (UUID), `created`;
  `@PreUpdate` sets `modified`

---

## Service Layer

### DocumentService

Primary service class. `@Service`, `@Transactional`.

**Dependencies:** `DatabaseHelper`, `DocumentRepository`, `DocumentTypeRepository`,
`RegistrationNumberService`, `EventLogClient`, `EventlogProperties`

Key operations and their revision behavior:

| Operation | Creates New Revision? | Notes |
|-----------|-----------------------|-------|
| `create` | Yes (revision 0) | Generates registration number |
| `update` | Yes | Deep-copies entity, applies changes |
| `addOrReplaceFile` | Yes | Adds or replaces file by name match |
| `deleteFile` | Yes | Copies entity without the deleted file |
| `updateConfidentiality` | No | Modifies ALL revisions in-place |
| `read` / `search` | No | Read-only operations |

### RegistrationNumberService

Generates unique registration numbers: `YYYY-municipalityId-sequence`.
- Resets sequence to 1 at start of each new year
- Uses pessimistic write lock on sequence table
- `@Transactional` to ensure atomicity

### DocumentTypeService

CRUD operations for document types:
- Validates uniqueness on create (throws 409 if duplicate)
- Delete fails silently if type not found (no error)
- Types are municipality-scoped

---

## Integration Layer

### Eventlog (Feign Client)

```java
@FeignClient(name = "eventlog", url = "${integration.eventlog.url}",
             configuration = EventlogConfiguration.class)
@CircuitBreaker(name = "eventlog")
public interface EventLogClient {
    @PostMapping("/{municipalityId}/{logKey}")
    void createEvent(@PathVariable String municipalityId,
                     @PathVariable UUID logKey,
                     @RequestBody Event event);
}
```

**Used only for:** Logging confidentiality update events.

**Configuration:**
- `ProblemErrorDecoder` for error handling
- Configurable connect/read timeouts via `EventlogProperties`
- OAuth2 client credentials interceptor (conditional on `ClientRegistrationRepository`)

**Generated models:** `Event`, `EventType`, `Metadata` classes generated from
`eventlog-api.yaml` into package `generated.se.sundsvall.eventlog`.

---

## Testing Infrastructure

### Unit Tests (`src/test/`)

| Pattern | Framework | Example |
|---------|-----------|---------|
| Service tests | Mockito (`@ExtendWith(MockitoExtension.class)`) | `DocumentServiceTest` |
| Controller tests | `@SpringBootTest` + `@AutoConfigureWebTestClient` + `@MockitoBean` | `DocumentResourceTest` |
| Repository tests | `@DataJpaTest` + Testcontainers MariaDB | `DocumentRepositoryTest` |
| Model tests | Plain JUnit | Verify builders, equals, hashCode |
| Schema verification | Compare Hibernate DDL vs committed SQL | `SchemaVerificationTest` |

### Integration Tests (`src/integration-test/`)

- Extend `AbstractAppTest` from dept44-starter-test
- `@WireMockAppTestSuite` for external service mocking
- `@Sql` for test data setup/teardown
- Test data in `__files/` directories per test case
- Request/response verified against JSON files
- `OpenApiSpecificationIT` validates API spec consistency

### Test Profiles

| Profile | Database | Flyway | External Services |
|---------|----------|--------|-------------------|
| `junit` | Testcontainers MariaDB (`jdbc:tc:mariadb:10.6.4`) | Disabled | Mocked via @MockitoBean |
| `it` | Testcontainers MariaDB | Enabled | WireMock |

### Test Data Files

- `testdata-junit.sql` / `testdata-it.sql` — Insert test data (includes binary blobs)
- `truncate.sql` — Truncates all tables with FK checks disabled
- `files/` — Test files (image.png, image2.png, readme.txt)

---

## Docker and CI/CD

### Dockerfile

```dockerfile
FROM eclipse-temurin:25-jre
WORKDIR /app
RUN useradd -u 10001 -r -s /usr/sbin/nologin appuser
COPY target/*.jar /app/app.jar
RUN chown -R appuser:appuser /app
USER appuser
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:InitialRAMPercentage=25 -XX:+ExitOnOutOfMemoryError"
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
```

- Eclipse Temurin JRE 25
- Non-root user (`appuser`, UID 10001)
- Container-aware JVM settings
- Exposes port 8080

### CI/CD (GitHub Actions)

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `maven_ci.yml` | Push to main, PRs, weekly | Build + test (shared workflow) |
| `build-and-push.yml` | Manual dispatch | Build Docker image + push |
| `dependabot-reviewer.yml` | Dependabot PRs | Auto-approve dependency updates |

All workflows use Java 25 and shared workflows from `Sundsvallskommun/.github`.
