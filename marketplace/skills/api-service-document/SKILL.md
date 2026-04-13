---
name: api-service-document
description: >-
  This skill should be used when the user asks about "document API", "document endpoints",
  "document service", "Dept44 document microservice", "registration number", "document revisions",
  "document types", "document metadata", "confidentiality", "document files", "document search",
  "document filter", "DocumentResource", "DocumentEntity", "API key", "WSO2", "auth mode",
  "development environment", "production environment", or mentions backend document operations,
  document CRUD, file upload/download, revision history, or the api-service-document Spring Boot
  microservice. This skill is also relevant when working on backend controllers, services, or
  interfaces related to documents, when understanding how the Express backend proxies to the
  upstream Dept44 microservice, or when configuring authentication for development vs production
  environments. It applies to any document-related backend or API work, even if the user does
  not explicitly name the microservice.
---

# api-service-document Microservice

This skill provides expert knowledge of the Dept44 `api-service-document` Spring Boot microservice
and how the web-app-document Express backend integrates with it. The microservice source can be
cloned into `api-service-document/` in the project root for reference.

## Scope

This skill covers:

- Document CRUD operations (create, read, update, search, filter)
- File upload, download, or deletion on documents
- Document revision history and immutability patterns
- Document type administration
- Confidentiality management and event logging
- The Express backend proxy layer (`backend/src/controllers/document.controller.ts`)
- TypeScript interfaces for documents (`backend/src/interfaces/document.interface.ts`)
- Dual-environment authentication (API key for dev, OAuth2 for production)
- Understanding the full request flow from frontend to microservice

## Architecture Overview

The system operates in two environments with different authentication strategies:

### Development Environment (.sundsvall.dev)

```
Browser --> Next.js frontend (documents.sundsvall.dev)
  --> Next.js Route Handler (/api/*)
    --> Express backend (Docker internal, port 3000)
      --> Dept44 API (direct, API key header auth)
        --> api-service-document (Spring Boot, v3.0)
```

In development, the Express backend authenticates using an **API key header**
sent directly to the microservice — no WSO2 gateway in the path. The exact header
name (e.g., `x-api-key`) should be confirmed against the microservice's security
configuration before implementation.

### Production Environment (future)

```
Browser --> Next.js frontend (production domain)
  --> Next.js Route Handler (/api/*)
    --> Express backend (Docker internal, port 3000)
      --> WSO2 API Gateway (api-i-sundsvall.se, OAuth2 client credentials)
        --> api-service-document (Spring Boot, v3.0)
```

In production, the Express backend authenticates via **OAuth2 client credentials** against
the WSO2 API Gateway, which then proxies to the microservice.

### Dual Auth Mode — Build for Both

The codebase currently has OAuth2 client credentials logic (`ApiTokenService`) built for
the WSO2 production path. The API key header mode for the development environment is
**not yet implemented** — it needs to be built.

When implementing or modifying authentication-related code:

1. **Introduce an environment flag** (e.g., `AUTH_MODE=apikey` or `AUTH_MODE=oauth2`) in
   `backend/src/config/` to switch between the two strategies.
2. **API key mode (development):** Send an `x-api-key` header (or similar) on outbound
   requests. The key value comes from an env var (e.g., `API_KEY`). No token endpoint
   call needed — simpler and faster for dev.
3. **OAuth2 mode (production):** Use the existing `ApiTokenService` with `CLIENT_KEY` /
   `CLIENT_SECRET` to obtain Bearer tokens from the WSO2 gateway's `/token` endpoint.
4. **`ApiService` must abstract over both** — controller code should not care which auth
   mode is active. The auth header is set in `getDefaultHeaders()` based on the flag.
5. **URL paths may differ** — through WSO2, paths are prefixed with `document/3.0`;
   direct access may use a different base path. The `municipalityApiURL()` helper or
   `API_BASE_URL` should absorb this difference.

For the full auth implementation details and environment variable reference, consult
**`references/backend-integration.md`**.

## Core Concepts

### Revision-Based Immutability

Documents are never modified in place. Every change (metadata update, file add/replace, file
delete) creates a new database row with `revision + 1`. This provides a complete audit trail.
The only exception is `updateConfidentiality`, which modifies all existing revisions in-place
and logs the change to an external Eventlog service.

### Multi-Tenancy via Municipality ID

All data is scoped by a `municipalityId` path parameter (default `2281` for Sundsvall).
The same database serves multiple municipalities. Every API path starts with
`/{municipalityId}/documents`.

### Registration Numbers

Documents receive auto-generated registration numbers in format `YYYY-municipalityId-sequence`
(e.g., `2024-2281-0001`). The sequence resets annually. A pessimistic write lock prevents
concurrent collisions.

### Document Types

Document types are municipality-scoped and must be pre-created via the admin API before use.
Each type has a `type` identifier and a `displayName`. Document create/update requests validate
the type against the database.

### File Storage

Files are stored as `LONGBLOB` in MariaDB (`document_data_binary` table), with metadata
(filename, MIME type, size) in `document_data`. Binary entities use lazy fetching. Max file
size: 60MB per file and per request.

## API Endpoint Groups

The microservice exposes three REST controllers, all under `/{municipalityId}`:

| Group | Base Path | Purpose |
|-------|-----------|---------|
| Documents | `/documents` | CRUD, search, filter, file operations |
| Revisions | `/documents/{regNum}/revisions` | Read revision history |
| Admin | `/admin/documenttypes` | Document type management |

Through the WSO2 gateway, these are prefixed with `document/3.0`, producing URLs like
`https://api-i-sundsvall.se/document/3.0/2281/documents/...`.

The Express backend maps these 1:1 at `/api/documents` and `/api/admin/documenttypes`.

For complete endpoint details with request/response shapes, consult
**`references/api-endpoints.md`**.

## Domain Model Summary

| Entity | Table | Key Fields |
|--------|-------|------------|
| DocumentEntity | `document` | id, registrationNumber, revision, description, type, confidentiality, archive, createdBy, metadata, documentData |
| DocumentDataEntity | `document_data` | id, fileName, mimeType, fileSizeInBytes |
| DocumentDataBinaryEntity | `document_data_binary` | id, binaryFile (LONGBLOB) |
| DocumentTypeEntity | `document_type` | id, municipalityId, type, displayName |
| RegistrationNumberSequenceEntity | `registration_number_sequence` | municipalityId, sequenceNumber |

For full entity definitions, DTOs, validation rules, and relationships, consult
**`references/domain-model.md`**.

## Dept44 Framework

The microservice builds on `se.sundsvall.dept44:dept44-service-parent:8.0.5`, which provides:

- **`@ServiceApplication`** annotation (replaces `@SpringBootApplication`)
- **`dept44-common-validators`** — `@ValidMunicipalityId`, `@ValidUuid`
- **`dept44-models`** — `AbstractParameterPagingAndSortingBase`, `PagingMetaData`
- **`dept44-starter-feign`** — Feign client infrastructure with OAuth2 and `ProblemErrorDecoder`
- **`dept44-starter-jpa`** — JPA/Hibernate autoconfiguration
- **RFC 7807 Problem Details** — `Problem.valueOf(HttpStatus, message)` for error responses
- **Circuit breakers** — Resilience4j `@CircuitBreaker` on all repositories and Feign clients

For full Dept44 patterns, configuration keys, and testing infrastructure, consult
**`references/architecture.md`**.

## Express Backend Integration

The Express backend at `backend/src/` proxies all document operations to the upstream
microservice. Key components:

| File | Purpose |
|------|---------|
| `controllers/document.controller.ts` | Document CRUD + file + revision endpoints |
| `controllers/document-type.controller.ts` | Admin document type endpoints |
| `services/api.service.ts` | Central HTTP client with OAuth2 Bearer tokens |
| `services/api-token.service.ts` | OAuth2 client_credentials token management |
| `interfaces/document.interface.ts` | TypeScript types mirroring the Java DTOs |
| `utils/util.ts` | URL builders: `apiURL()`, `municipalityApiURL()` |
| `config/api-config.ts` | API version mapping (`document` -> `3.0`) |

The `municipalityApiURL('documents', registrationNumber, 'files', documentDataId)` helper
produces `document/3.0/2281/documents/{regNum}/files/{dataId}`, which `ApiService.request()`
prepends with `API_BASE_URL`.

For complete backend integration details including auth flow, multipart handling, and
TypeScript interfaces, consult **`references/backend-integration.md`**.

## Key Patterns to Follow

When working on document-related code:

1. **Respect the revision model** — Never design mutations that modify existing document rows.
   Create new revisions instead. The only exception is confidentiality updates.
2. **Always scope by municipality** — Every API call requires `municipalityId`. The default
   is `2281` (Sundsvall).
3. **Validate document types** — Types must exist in the database before use. Create them
   via the admin API first.
4. **Handle multipart correctly** — Document creation and file operations use `multipart/form-data`
   with a JSON part (`document`) and binary parts (`documentFiles` / `documentFile`).
5. **Follow the proxy pattern** — Backend routes mirror upstream paths 1:1. When adding new
   document functionality, add both the backend route and understand the upstream endpoint.
6. **Use existing TypeScript interfaces** — Types in `document.interface.ts` mirror the Java
   DTOs. Extend them rather than creating parallel type definitions.
7. **Support both auth modes** — Any code touching outbound authentication must work in
   both API key (development) and OAuth2 (production) modes. Use the `AUTH_MODE` env flag
   to branch, and keep the abstraction in `ApiService` so controllers stay auth-agnostic.

## Additional Resources

### Reference Files

For detailed information beyond this overview, consult:

- **`references/api-endpoints.md`** — Complete endpoint documentation with HTTP methods, paths,
  request/response bodies, query parameters, and validation rules
- **`references/domain-model.md`** — Full entity definitions, DTOs, embeddables, validation
  annotations, database schema, and Flyway migrations
- **`references/architecture.md`** — Dept44 framework details, configuration properties,
  testing patterns, CI/CD, Docker setup, and architectural decisions
- **`references/backend-integration.md`** — Express backend proxy implementation, OAuth2 auth
  flow, multipart file handling, TypeScript interfaces, and environment variables

### Source Code Locations

- Microservice source: `api-service-document/src/main/java/se/sundsvall/document/`
- OpenAPI spec: `api-service-document/src/main/resources/api/openapi.yaml`
- Backend controllers: `backend/src/controllers/document.controller.ts`
- Backend interfaces: `backend/src/interfaces/document.interface.ts`
- Frontend API proxy: `frontend/src/app/api/[...path]/route.ts`
