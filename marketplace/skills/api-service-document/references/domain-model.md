# Domain Model Reference

Complete entity definitions, DTOs, validation rules, and database schema for the
api-service-document microservice.

## Table of Contents

- [Database Schema](#database-schema)
- [Entity Classes](#entity-classes)
- [API DTOs](#api-dtos)
- [Custom Validators](#custom-validators)
- [Mappers](#mappers)
- [Flyway Migrations](#flyway-migrations)

---

## Database Schema

**Database:** MariaDB (driver: `org.mariadb.jdbc.Driver`)
**Connection pool:** HikariCP (pool name: `document-pool`)

### Tables

#### `document`
Main document table. Each row represents one revision of a document.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | VARCHAR (UUID) | PK |
| `registration_number` | VARCHAR | NOT NULL, not updatable |
| `revision` | INT | NOT NULL |
| `municipality_id` | VARCHAR | — |
| `description` | VARCHAR(8192) | NOT NULL |
| `confidential` | BOOLEAN | NOT NULL (embedded) |
| `legal_citation` | VARCHAR | (embedded) |
| `archive` | BOOLEAN | NOT NULL |
| `created_by` | VARCHAR | — |
| `created` | DATETIME | Set by @PrePersist |
| `document_type_id` | VARCHAR | FK -> `document_type.id` |

**Unique:** `(revision, registration_number)`
**Indexes:** `ix_registration_number`, `ix_created_by`, `ix_municipality_id`, `ix_confidential`

#### `document_data`
File metadata, one row per file per document revision.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | VARCHAR (UUID) | PK |
| `document_id` | VARCHAR | FK -> `document.id` |
| `mime_type` | VARCHAR | — |
| `file_name` | VARCHAR | — |
| `file_size_in_bytes` | BIGINT | Default 0 |
| `document_data_binary_id` | VARCHAR | FK -> `document_data_binary.id`, UNIQUE |

#### `document_data_binary`
Actual file binary content.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | VARCHAR (UUID) | PK |
| `binary_file` | LONGBLOB | — |

#### `document_metadata`
Key-value metadata pairs for documents.

| Column | Type | Constraints |
|--------|------|-------------|
| `document_id` | VARCHAR | FK -> `document.id` |
| `key` | VARCHAR | Indexed |
| `value` | VARCHAR | — |

#### `document_type`
Configurable document type definitions per municipality.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | VARCHAR (UUID) | PK |
| `municipality_id` | VARCHAR | — |
| `type` | VARCHAR | NOT NULL |
| `display_name` | VARCHAR | NOT NULL |
| `created` | DATETIME | @PrePersist |
| `created_by` | VARCHAR | — |
| `last_updated` | DATETIME | @PreUpdate |
| `last_updated_by` | VARCHAR | — |

**Unique:** `(municipality_id, type)`

#### `registration_number_sequence`
Auto-increment sequence per municipality per year.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | VARCHAR (UUID) | PK |
| `municipality_id` | VARCHAR | UNIQUE |
| `sequence_number` | INT | — |
| `created` | DATETIME | @PrePersist |
| `modified` | DATETIME | @PreUpdate |

---

## Entity Classes

Package: `se.sundsvall.document.integration.db.model`

### DocumentEntity

```java
@Entity
@Table(name = "document")
@EntityListeners(DocumentEntityListener.class)
public class DocumentEntity {
    @Id String id;                          // UUID, auto-generated
    int revision;                           // NOT NULL
    String municipalityId;
    String registrationNumber;              // NOT NULL, not updatable
    @ManyToOne(cascade = ALL, fetch = EAGER)
    DocumentTypeEntity type;
    @Column(length = 8192) String description;
    @Embedded ConfidentialityEmbeddable confidentiality;
    boolean archive;
    String createdBy;
    OffsetDateTime created;                 // Set by listener @PrePersist
    @OneToMany(cascade = ALL, orphanRemoval = true)
    List<DocumentDataEntity> documentData;
    @ElementCollection(fetch = EAGER)
    List<DocumentMetadataEmbeddable> metadata;
}
```

### DocumentDataEntity

```java
@Entity
@Table(name = "document_data")
public class DocumentDataEntity {
    @Id String id;                          // UUID
    String mimeType;
    String fileName;
    long fileSizeInBytes;                   // Default 0
    @OneToOne(cascade = ALL, orphanRemoval = true, fetch = LAZY)
    DocumentDataBinaryEntity documentDataBinary;
}
```

### DocumentDataBinaryEntity

```java
@Entity
@Table(name = "document_data_binary")
public class DocumentDataBinaryEntity {
    @Id String id;                          // UUID
    @Lob Blob binaryFile;                   // LONGBLOB
}
```

### ConfidentialityEmbeddable

```java
@Embeddable
public class ConfidentialityEmbeddable {
    boolean confidential;                   // NOT NULL
    String legalCitation;
}
```

### DocumentMetadataEmbeddable

```java
@Embeddable
@Table(name = "document_metadata")
public class DocumentMetadataEmbeddable {
    @Column(name = "`key`") String key;     // Quoted (reserved word)
    String value;
}
```

### DocumentTypeEntity

```java
@Entity
@Table(name = "document_type")
@EntityListeners(DocumentTypeEntityListener.class)
public class DocumentTypeEntity {
    @Id String id;
    String municipalityId;
    @Column(name = "`type`") String type;   // Quoted (reserved word)
    String displayName;
    OffsetDateTime created;                 // @PrePersist
    String createdBy;
    OffsetDateTime lastUpdated;             // @PreUpdate
    String lastUpdatedBy;
}
```

### RegistrationNumberSequenceEntity

```java
@Entity
@Table(name = "registration_number_sequence")
@EntityListeners(RegistrationNumberSequenceEntityListener.class)
public class RegistrationNumberSequenceEntity {
    @Id String id;
    String municipalityId;                  // UNIQUE
    int sequenceNumber;
    OffsetDateTime created;                 // @PrePersist
    OffsetDateTime modified;                // @PreUpdate
}
```

---

## API DTOs

Package: `se.sundsvall.document.api.model`

All DTOs use a builder pattern: static `create()` factory + `withX()` fluent setters.

### Document (Response)

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | UUID |
| `municipalityId` | String | — |
| `registrationNumber` | String | Format: `YYYY-municipalityId-sequence` |
| `revision` | int | — |
| `confidentiality` | Confidentiality | — |
| `description` | String | — |
| `created` | OffsetDateTime | — |
| `createdBy` | String | — |
| `archive` | boolean | — |
| `metadataList` | List\<DocumentMetadata\> | — |
| `documentData` | List\<DocumentData\> | — |
| `type` | String | — |

### DocumentCreateRequest

| Field | Type | Validation |
|-------|------|------------|
| `createdBy` | String | @NotBlank |
| `confidentiality` | Confidentiality | Optional |
| `archive` | boolean | — |
| `description` | String | @NotBlank, @Size(max=8192) |
| `metadataList` | List\<DocumentMetadata\> | @NotEmpty, @Valid |
| `type` | String | @NotBlank, validated against DB |

### DocumentUpdateRequest

| Field | Type | Validation |
|-------|------|------------|
| `createdBy` | String | @NotBlank |
| `description` | String | @Size(max=8192), optional |
| `archive` | Boolean | Nullable |
| `metadataList` | List\<DocumentMetadata\> | @Valid, optional |
| `type` | String | Validated if present |

### DocumentParameters (Filter/Search)

Extends `AbstractParameterPagingAndSortingBase` from dept44-models.

| Field | Type | Default |
|-------|------|---------|
| `municipalityId` | String | Set server-side |
| `includeConfidential` | boolean | false |
| `onlyLatestRevision` | boolean | false |
| `documentTypes` | List\<String\> | — |
| `metaData` | List\<MetaData\> | — |

**MetaData inner class:**
| Field | Type | Notes |
|-------|------|-------|
| `key` | String | Metadata key to filter on |
| `matchesAny` | List\<String\> | OR matching |
| `matchesAll` | List\<String\> | AND matching |

---

## Custom Validators

### DocumentTypeValidator (`@Component`)

Validates that the `type` field on document create/update requests matches a registered
document type for the municipality. Throws `ConstraintViolationProblem` (400) if invalid.

Source: `se.sundsvall.document.api.validation.DocumentTypeValidator`

### @NoDuplicateFileNames

Custom constraint on `List<MultipartFile>`. Rejects duplicate filenames
(case-insensitive comparison) and empty filenames.

Source: `se.sundsvall.document.api.validation.NoDuplicateFileNamesConstraintValidator`

### @ValidContentType

Custom constraint on `List<MultipartFile>`. Rejects files with
`application/octet-stream` content type.

Source: `se.sundsvall.document.api.validation.ValidContentTypeConstraintValidator`

### Dept44 Validators

- `@ValidMunicipalityId` — Validates municipality ID format
- `@ValidUuid` — Validates UUID format

---

## Mappers

### DocumentMapper

Static utility class. Key conversion methods:

| Method | From | To |
|--------|------|----|
| `toDocumentEntity` | DocumentCreateRequest + DocumentFiles | DocumentEntity |
| `toDocument` | DocumentEntity | Document (API response) |
| `toDocumentDataEntities` | List\<MultipartFile\> | List\<DocumentDataEntity\> |
| `copyDocumentEntity` | DocumentEntity | DocumentEntity (new revision) |
| `toPagedDocumentResponse` | Page\<DocumentEntity\> | PagedDocumentResponse |
| `toInclusionFilter` | boolean includeConfidential | InclusionFilter enum |

### DocumentTypeMapper

| Method | From | To |
|--------|------|----|
| `toDocumentTypeEntity` | DocumentTypeCreateRequest | DocumentTypeEntity |
| `updateDocumentTypeEntity` | DocumentTypeEntity + UpdateRequest | DocumentTypeEntity |
| `toDocumentType` | DocumentTypeEntity | DocumentType (API) |

### EventlogMapper

Creates `Event` objects for the Eventlog service:
- Event metadata: `RegistrationNumber`, `ExecutedBy`
- Events expire after 10 years

---

## Flyway Migrations

Located in `src/main/resources/db/migration/`:

| Migration | Description |
|-----------|-------------|
| `V1_0__add_database_schema.sql` | Creates document, document_data, document_data_binary, document_metadata, registration_number_sequence |
| `V1_1__add_document_type_table.sql` | Creates document_type table |
| `V1_2__add_document_type_to_document..sql` | Adds document_type_id FK to document table |

**Note:** Flyway is disabled by default (`spring.flyway.enabled: false`) and only enabled
in the integration test profile.
