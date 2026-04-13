# API Endpoints Reference

Complete endpoint documentation for the api-service-document microservice.
All paths are relative to `/{municipalityId}`.

Through the WSO2 API Gateway, paths are prefixed with `document/3.0`.
Through the Express backend, paths are prefixed with `/api`.

## Table of Contents

- [Document Endpoints](#document-endpoints)
- [Revision Endpoints](#revision-endpoints)
- [Administration Endpoints](#administration-endpoints)
- [Search and Filter](#search-and-filter)
- [File Operations](#file-operations)
- [Error Responses](#error-responses)

---

## Document Endpoints

### Create Document

```
POST /{municipalityId}/documents
Content-Type: multipart/form-data
```

**Multipart parts:**
- `document` (required) — JSON string of `DocumentCreateRequest`:
  ```json
  {
    "createdBy": "string (required, @NotBlank)",
    "confidentiality": {
      "confidential": false,
      "legalCitation": "string"
    },
    "archive": false,
    "description": "string (required, @NotBlank, max 8192 chars)",
    "metadataList": [
      { "key": "string (required)", "value": "string (required)" }
    ],
    "type": "string (required, must match existing document type)"
  }
  ```
- `documentFiles` (optional) — One or more files. No duplicate filenames allowed.
  Content type `application/octet-stream` is rejected.

**Response:** `201 Created` with `Location` header pointing to the new document.

**Validation:**
- `type` must match a document type registered for the municipality
- File names must be unique (case-insensitive)
- Files must not have `application/octet-stream` content type
- `description` max 8192 characters
- `metadataList` must not be empty

---

### Read Document (Latest Revision)

```
GET /{municipalityId}/documents/{registrationNumber}
```

**Query parameters:**
- `includeConfidential` (boolean, default false)

**Response:** `200 OK` with `Document` body:
```json
{
  "id": "uuid",
  "municipalityId": "2281",
  "registrationNumber": "2024-2281-0001",
  "revision": 3,
  "confidentiality": {
    "confidential": false,
    "legalCitation": null
  },
  "description": "string",
  "created": "2024-01-15T10:30:00+01:00",
  "createdBy": "string",
  "archive": false,
  "metadataList": [
    { "key": "string", "value": "string" }
  ],
  "documentData": [
    {
      "id": "uuid",
      "fileName": "report.pdf",
      "mimeType": "application/pdf",
      "fileSizeInBytes": 245760
    }
  ],
  "type": "POLICY"
}
```

---

### Update Document

```
PATCH /{municipalityId}/documents/{registrationNumber}
Content-Type: application/json
```

**Query parameters:**
- `includeConfidential` (boolean, default false)

**Request body** (`DocumentUpdateRequest`):
```json
{
  "createdBy": "string (required)",
  "description": "string (optional, max 8192 chars)",
  "archive": true,
  "metadataList": [
    { "key": "string", "value": "string" }
  ],
  "type": "string (optional, validated if present)"
}
```

**Response:** `200 OK` with the updated `Document` (new revision).

**Important:** This creates a new revision. The previous revision remains unchanged.

---

### Update Confidentiality

```
PATCH /{municipalityId}/documents/{registrationNumber}/confidentiality
Content-Type: application/json
```

**Request body** (`ConfidentialityUpdateRequest`):
```json
{
  "confidential": true,
  "legalCitation": "OSL 25:1",
  "changedBy": "string (required)"
}
```

**Response:** `204 No Content`

**Important:** Unlike other updates, this modifies ALL existing revisions in-place and
logs the change to the Eventlog service.

---

### Search Documents (Full-Text)

```
GET /{municipalityId}/documents?query=*search*
```

**Query parameters:**
- `query` (required) — Wildcard search using `*`. Searches across: `createdBy`,
  `description`, `municipalityId`, `registrationNumber`, `fileName`, `mimeType`,
  metadata keys and values
- `includeConfidential` (boolean, default false)
- `onlyLatestRevision` (boolean, default false)
- `page` (int, default 0)
- `size` (int, default 20)
- `sort` (string, e.g., `created,desc`)

**Response:** `200 OK` with `PagedDocumentResponse`:
```json
{
  "documents": [ ... ],
  "_meta": {
    "page": 0,
    "limit": 20,
    "count": 5,
    "totalRecords": 42,
    "totalPages": 3
  }
}
```

---

### Filter Documents (Parameter-Based)

```
POST /{municipalityId}/documents/filter
Content-Type: application/json
```

**Request body** (`DocumentParameters`):
```json
{
  "page": 0,
  "limit": 20,
  "sortBy": ["created"],
  "sortDirection": "DESC",
  "includeConfidential": false,
  "onlyLatestRevision": true,
  "documentTypes": ["POLICY", "REPORT"],
  "metaData": [
    {
      "key": "department",
      "matchesAny": ["HR", "Finance"],
      "matchesAll": []
    }
  ]
}
```

**MetaData filtering:**
- `matchesAny` — Document matches if the metadata key has ANY of these values (OR)
- `matchesAll` — Document matches if the metadata key has ALL of these values (AND)

**Response:** `200 OK` with `PagedDocumentResponse`.

---

## File Operations

### Download File (Latest Revision)

```
GET /{municipalityId}/documents/{registrationNumber}/files/{documentDataId}
```

**Query parameters:**
- `includeConfidential` (boolean, default false)

**Response:** Binary stream with appropriate `Content-Type` and `Content-Disposition` headers.

---

### Add or Replace File

```
PUT /{municipalityId}/documents/{registrationNumber}/files
Content-Type: multipart/form-data
```

**Multipart parts:**
- `document` — JSON string of `DocumentDataCreateRequest`: `{ "createdBy": "string" }`
- `documentFile` — The file to add or replace

**Response:** `204 No Content`

**Important:** Creates a new revision. If a file with the same name exists, it is replaced.

---

### Delete File

```
DELETE /{municipalityId}/documents/{registrationNumber}/files/{documentDataId}
```

**Response:** `204 No Content`

**Important:** Creates a new revision without the deleted file. The file remains
accessible on previous revisions.

---

## Revision Endpoints

### List All Revisions

```
GET /{municipalityId}/documents/{registrationNumber}/revisions
```

**Query parameters:**
- `includeConfidential` (boolean, default false)
- `page`, `size`, `sort` (pagination)

**Response:** `200 OK` with `PagedDocumentResponse` containing all revisions.

---

### Read Specific Revision

```
GET /{municipalityId}/documents/{registrationNumber}/revisions/{revision}
```

**Path parameters:**
- `revision` — Integer >= 0

**Query parameters:**
- `includeConfidential` (boolean, default false)

**Response:** `200 OK` with `Document`.

---

### Download File from Specific Revision

```
GET /{municipalityId}/documents/{registrationNumber}/revisions/{revision}/files/{documentDataId}
```

**Response:** Binary stream.

---

## Administration Endpoints

### Create Document Type

```
POST /{municipalityId}/admin/documenttypes
Content-Type: application/json
```

**Request body** (`DocumentTypeCreateRequest`):
```json
{
  "type": "POLICY",
  "displayName": "Policy Document",
  "createdBy": "admin"
}
```

**Response:** `201 Created` with `Location` header.

---

### List Document Types

```
GET /{municipalityId}/admin/documenttypes
```

**Response:** `200 OK` with `List<DocumentType>`:
```json
[
  { "type": "POLICY", "displayName": "Policy Document" },
  { "type": "REPORT", "displayName": "Report" }
]
```

---

### Read Document Type

```
GET /{municipalityId}/admin/documenttypes/{type}
```

**Response:** `200 OK` with `DocumentType`.

---

### Update Document Type

```
PATCH /{municipalityId}/admin/documenttypes/{type}
Content-Type: application/json
```

**Request body** (`DocumentTypeUpdateRequest`):
```json
{
  "displayName": "Updated Display Name",
  "type": "NEW_TYPE_ID",
  "updatedBy": "admin"
}
```

**Response:** `204 No Content`.

---

### Delete Document Type

```
DELETE /{municipalityId}/admin/documenttypes/{type}
```

**Response:** `204 No Content`.

**Note:** Deletion fails if any documents reference this type.

---

## Error Responses

The microservice uses RFC 7807 Problem Details (via dept44):

```json
{
  "title": "Not Found",
  "status": 404,
  "detail": "No document with registrationNumber: 2024-2281-9999 found."
}
```

Common error scenarios:
- `400 Bad Request` — Validation failures (invalid type, duplicate filenames, missing required fields)
- `404 Not Found` — Document, revision, or file not found
- `409 Conflict` — Duplicate document type
- `502 Bad Gateway` — Upstream service failure (mapped by Express backend from 5xx)

## Express Backend Route Mapping

| Express Route | Upstream Path |
|--------------|---------------|
| `GET /api/documents` | `document/3.0/{municipalityId}/documents` |
| `POST /api/documents` | `document/3.0/{municipalityId}/documents` |
| `GET /api/documents/:regNum` | `document/3.0/{municipalityId}/documents/{regNum}` |
| `PATCH /api/documents/:regNum` | `document/3.0/{municipalityId}/documents/{regNum}` |
| `PATCH /api/documents/:regNum/confidentiality` | `.../{regNum}/confidentiality` |
| `PUT /api/documents/:regNum/files` | `.../{regNum}/files` |
| `GET /api/documents/:regNum/files/:dataId` | `.../{regNum}/files/{dataId}` |
| `DELETE /api/documents/:regNum/files/:dataId` | `.../{regNum}/files/{dataId}` |
| `GET /api/documents/:regNum/revisions` | `.../{regNum}/revisions` |
| `GET /api/documents/:regNum/revisions/:rev` | `.../{regNum}/revisions/{rev}` |
| `GET /api/documents/:regNum/revisions/:rev/files/:dataId` | `.../{rev}/files/{dataId}` |
| `POST /api/documents/filter` | `document/3.0/{municipalityId}/documents/filter` |
| `GET /api/admin/documenttypes` | `document/3.0/{municipalityId}/admin/documenttypes` |
| `POST /api/admin/documenttypes` | same |
| `GET /api/admin/documenttypes/:type` | `.../{type}` |
| `PATCH /api/admin/documenttypes/:type` | `.../{type}` |
| `DELETE /api/admin/documenttypes/:type` | `.../{type}` |
