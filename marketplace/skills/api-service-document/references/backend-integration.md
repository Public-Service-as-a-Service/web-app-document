# Backend Integration Reference

Complete documentation of how the Express backend proxies requests to the
api-service-document microservice.

## Table of Contents

- [Request Flow](#request-flow)
- [Dual Environment Authentication](#dual-environment-authentication)
- [Backend Structure](#backend-structure)
- [Authentication — OAuth2 (Production)](#authentication--oauth2-production)
- [Authentication — API Key (Development)](#authentication--api-key-development)
- [Central API Service](#central-api-service)
- [Multipart File Handling](#multipart-file-handling)
- [TypeScript Interfaces](#typescript-interfaces)
- [URL Construction](#url-construction)
- [Environment Variables](#environment-variables)
- [Frontend API Proxy](#frontend-api-proxy)

---

## Request Flow

The request flow differs between environments:

**Development (.sundsvall.dev) — API key auth:**
```
Browser
  --> Next.js frontend (documents.sundsvall.dev)
    --> Next.js Route Handler (/api/*)
      --> Express backend (internal Docker network, port 3000)
        --> api-service-document (direct, x-api-key header)
```

**Production (future) — OAuth2 via WSO2:**
```
Browser
  --> Next.js frontend (production domain)
    --> Next.js Route Handler (/api/*)
      --> Express backend (internal Docker network, port 3000)
        --> WSO2 API Gateway (api-i-sundsvall.se, OAuth2 Bearer token)
          --> api-service-document (Dept44 Spring Boot, v3.0)
```

The Express backend is never publicly exposed. All traffic reaches it through the
Next.js server-side catch-all route handler.

---

## Dual Environment Authentication

The backend must support two authentication modes for outbound requests to the
document microservice. An environment flag controls which mode is active.

### Overview

| Aspect | Development (.sundsvall.dev) | Production (future) |
|--------|----------------------------|---------------------|
| **Auth method** | API key header | OAuth2 client credentials |
| **Gateway** | Direct to microservice | WSO2 API Gateway |
| **Auth header** | `x-api-key: {API_KEY}` | `Authorization: Bearer {token}` |
| **Token endpoint** | None needed | `{API_BASE_URL}/token` |
| **Env vars needed** | `API_KEY`, `API_BASE_URL` | `CLIENT_KEY`, `CLIENT_SECRET`, `API_BASE_URL` |
| **URL prefix** | May differ (no `document/3.0` prefix from gateway) | `document/3.0` (added by WSO2 routing) |
| **Domain** | `*.sundsvall.dev` | Production domain |

### Environment Flag

Use an environment variable to switch modes:

```
AUTH_MODE=apikey    # Development: use x-api-key header
AUTH_MODE=oauth2    # Production: use OAuth2 client credentials via WSO2
```

Add this to `backend/src/config/index.ts` alongside existing env vars, and to
`.env.example` and `docker-compose.yml`.

### Implementation Strategy

The auth mode abstraction belongs in the `ApiService` layer. Controllers must never
branch on auth mode — they call `ApiService` methods and the auth header is set
transparently in `getDefaultHeaders()`.

**API key mode implementation:**

```typescript
// In getDefaultHeaders() or a strategy pattern:
if (AUTH_MODE === 'apikey') {
  headers['x-api-key'] = API_KEY;
  // No Authorization header, no token fetch
} else {
  const token = await this.tokenService.getToken();
  headers['Authorization'] = `Bearer ${token}`;
}
```

**URL path handling:**

When going through WSO2, the gateway adds the `document/3.0` prefix based on its
API subscription routing. When connecting directly to the microservice in dev, the
`API_BASE_URL` should include whatever base path the microservice exposes, or the
`municipalityApiURL()` helper needs to account for the difference.

To keep controller code and `municipalityApiURL()` unchanged across modes, set
`API_BASE_URL` so it absorbs the routing difference:

- **Dev (API key):** `API_BASE_URL` points directly to the microservice and includes
  whatever base path it exposes. The `municipalityApiURL()` helper prepends
  `document/3.0` as usual, so `API_BASE_URL` should be the bare host
  (e.g., `https://api-dev.sundsvall.dev`).
- **Prod (OAuth2):** `API_BASE_URL` points to the WSO2 gateway
  (e.g., `https://api-i-sundsvall.se`). The gateway routes based on the
  `document/3.0` prefix that `municipalityApiURL()` prepends.

This way `municipalityApiURL()` always prepends `document/3.0/{municipalityId}` and
`API_BASE_URL` is the only value that changes between environments. No conditional
logic in the URL builder is needed.

### What Exists Today

- **OAuth2 mode:** Fully implemented in `api-token.service.ts` and `api.service.ts`.
  Uses `CLIENT_KEY` / `CLIENT_SECRET` to fetch Bearer tokens from WSO2's `/token`
  endpoint. Production is not yet live but the code path is built.
- **API key mode:** Not yet implemented. Needs to be built into `ApiService` with the
  env flag, a new `API_KEY` env var, and the header injection logic.
- **No inbound auth:** The Express backend has no authentication middleware for
  incoming requests — it relies on Docker network isolation (only the Next.js
  frontend can reach it).

---

## Backend Structure

All source files are under `backend/src/`:

| File | Purpose |
|------|---------|
| `server.ts` | Entry point, registers controllers |
| `app.ts` | Express setup, middleware chain, routing-controllers |
| `config/index.ts` | Loads .env, exports all env vars |
| `config/api-config.ts` | API name/version mapping |
| `controllers/document.controller.ts` | Document CRUD + file + revision endpoints |
| `controllers/document-type.controller.ts` | Admin document type CRUD |
| `controllers/health.controller.ts` | Health check |
| `services/api.service.ts` | Central HTTP client with OAuth2 Bearer tokens |
| `services/api-token.service.ts` | OAuth2 client_credentials token management |
| `interfaces/document.interface.ts` | TypeScript types for documents |
| `middlewares/error.middleware.ts` | Global error handler |
| `utils/util.ts` | URL construction helpers |
| `utils/logger.ts` | Winston logger with daily rotation |
| `exceptions/http.exception.ts` | Custom HTTP exception class |

---

## Authentication — OAuth2 (Production)

### Token Service (`api-token.service.ts`)

For the production WSO2 path (`AUTH_MODE=oauth2`), the backend authenticates using
OAuth2 client credentials:

1. POST to `{API_BASE_URL}/token` with:
   - `Authorization: Basic {base64(CLIENT_KEY:CLIENT_SECRET)}`
   - `Content-Type: application/x-www-form-urlencoded`
   - Body: `grant_type=client_credentials`
2. Receives `access_token` and `expires_in`
3. Caches token in memory with 10-second safety margin before expiry
4. Returns cached token on subsequent calls until near-expiry

### Environment Variables (OAuth2 mode)

| Variable | Purpose |
|----------|---------|
| `API_BASE_URL` | WSO2 API Gateway base URL (e.g., `https://api-i-sundsvall.se`) |
| `CLIENT_KEY` | OAuth2 client key for WSO2 |
| `CLIENT_SECRET` | OAuth2 client secret for WSO2 |

---

## Authentication — API Key (Development)

For the development environment (`AUTH_MODE=apikey`), the backend authenticates by
sending an API key header directly to the microservice — no WSO2 gateway involved.

### How It Works

- Set `AUTH_MODE=apikey` and `API_KEY=<the-api-key>` in the environment
- The `ApiService.getDefaultHeaders()` method attaches `x-api-key: {API_KEY}` instead
  of an `Authorization: Bearer` header
- No token endpoint call is needed — the key is static
- `API_BASE_URL` points directly to the microservice (or a dev gateway on
  `.sundsvall.dev` domain)

### Environment Variables (API key mode)

| Variable | Purpose |
|----------|---------|
| `API_BASE_URL` | Direct microservice URL (e.g., `https://api-dev.sundsvall.dev`) |
| `API_KEY` | Static API key for the development environment |
| `AUTH_MODE` | Set to `apikey` to activate this mode |

### Implementation Status

This mode is **not yet implemented**. When building it:
- Add `AUTH_MODE` and `API_KEY` to `config/index.ts` exports
- Add conditional logic in `ApiService.getDefaultHeaders()` to branch on `AUTH_MODE`
- Add the new env vars to `.env.example` and `docker-compose.yml`
- No changes needed in controllers — they remain auth-agnostic

---

## Central API Service

### `api.service.ts`

Every outbound request goes through `ApiService.request()`:

1. Obtains Bearer token via `ApiTokenService.getToken()`
2. Sets headers:
   - `Authorization: Bearer {token}`
   - `Content-Type: application/json`
   - `X-Request-Id: {uuid}`
   - `X-Sent-By: document-app`
3. Sends request via axios with 30-second timeout
4. On 201 Created with `Location` header: follows up with GET to fetch created resource
5. On error: maps upstream 5xx to 502, passes through 4xx

### Public Methods

All methods take a single `AxiosRequestConfig` parameter:

| Method | Purpose |
|--------|---------|
| `get<T>(config)` | GET request |
| `post<T>(config)` | POST request |
| `put<T>(config)` | PUT request |
| `patch<T>(config)` | PATCH request |
| `delete<T>(config)` | DELETE request |
| `getRaw(config)` | GET returning stream response (for file downloads) |
| `postMultipart<T>(config)` | POST with multipart/form-data (clears Content-Type for boundary) |
| `putMultipart<T>(config)` | PUT with multipart/form-data |

All methods except `getRaw` return `Promise<ApiResponse<T>>` where
`ApiResponse<T> = { data: T; message: string }`.

The private `request()` method handles: auth headers via `getDefaultHeaders()`,
URL resolution via `apiURL()`, 30s timeout, auto-follow on `Location` header (201),
and error mapping (5xx -> 502, 4xx passthrough).

---

## Multipart File Handling

For document creation (`POST /documents`) and file upload (`PUT /documents/:regNum/files`):

1. **Receive from frontend:** `multer` with in-memory storage parses multipart request
2. **Construct FormData:** Creates new `FormData` object (using `form-data` npm package)
3. **Append JSON part:** `formData.append('document', JSON.stringify(body), { contentType: 'application/json' })`
4. **Append file parts:** For each file buffer: `formData.append('documentFiles', buffer, { filename, contentType })`
5. **Send upstream:** `postMultipart()` or `putMultipart()` removes Content-Type header so
   axios auto-generates the multipart boundary

---

## TypeScript Interfaces

### `document.interface.ts`

```typescript
interface Document {
  id: string;
  municipalityId: string;
  registrationNumber: string;
  revision: number;
  confidentiality: DocumentConfidentiality;
  description: string;
  created: string;
  createdBy: string;
  archive: boolean;
  metadataList: DocumentMetadata[];
  documentData: DocumentData[];
  type: string;
}

interface DocumentConfidentiality {
  confidential: boolean;
  legalCitation: string;
}

interface DocumentMetadata {
  key: string;
  value: string;
}

interface DocumentData {
  id: string;
  fileName: string;
  mimeType: string;
  fileSizeInBytes: number;
}

interface PageMeta {
  page: number;
  limit: number;
  count: number;
  totalRecords: number;
  totalPages: number;
}

interface PagedDocumentResponse {
  documents: Document[];
  _meta: PageMeta;
}

interface DocumentCreateRequest {
  createdBy: string;
  confidentiality?: DocumentConfidentiality;
  archive?: boolean;
  description: string;
  metadataList: DocumentMetadata[];
  type: string;
}

interface DocumentUpdateRequest {
  createdBy: string;
  description?: string;
  archive?: boolean;
  metadataList?: DocumentMetadata[];
  type?: string;
}

interface ConfidentialityUpdateRequest {
  confidential: boolean;
  legalCitation?: string;
  changedBy: string;
}

interface DocumentDataCreateRequest {
  createdBy: string;
}

interface DocumentType {
  type: string;
  displayName: string;
}

interface DocumentTypeCreateRequest {
  type: string;
  displayName: string;
  createdBy: string;
}

interface DocumentTypeUpdateRequest {
  displayName?: string;
  type?: string;
  updatedBy: string;
}

interface DocumentFilterParameters {
  page?: number;
  limit?: number;
  sortBy?: string[];
  sortDirection?: 'ASC' | 'DESC';
  includeConfidential?: boolean;
  onlyLatestRevision?: boolean;
  documentTypes?: string[];
  metaData?: Array<{
    key: string;
    matchesAny?: string[];
    matchesAll?: string[];
  }>;
}
```

**Note:** The frontend has a slightly different `DocumentFilterParams` shape in
`frontend/src/interfaces/document.interface.ts` using `query`, `size`, `sort` instead
of `limit`, `sortBy`. Before mapping data between the frontend and backend layers,
read `frontend/src/interfaces/document.interface.ts` to confirm the current shape.

---

## URL Construction

### `utils/util.ts`

Two URL builder functions:

```typescript
// Base URL builder - joins API_BASE_URL with path segments
apiURL(...parts: string[]): string

// Municipality-scoped API URL builder
// Prepends API base path (e.g., "document/3.0"), then municipality ID, then segments
municipalityApiURL(...parts: string[]): string
```

### `config/api-config.ts`

```typescript
export const APIS = [
  { name: 'document', version: '3.0' },
] as const;

// Returns "document/3.0" for getApiBase('document')
export function getApiBase(apiName: string): string;
```

### Example URL Construction

```typescript
// For: GET /api/documents/2024-2281-0001/files/abc-123
const url = municipalityApiURL('documents', '2024-2281-0001', 'files', 'abc-123');
// Produces: "document/3.0/2281/documents/2024-2281-0001/files/abc-123"
// ApiService prepends API_BASE_URL:
// "https://api-i-sundsvall.se/document/3.0/2281/documents/2024-2281-0001/files/abc-123"
```

---

## Environment Variables

### Backend `.env.example`

**Current variables** (exist in `.env.example` today):

| Variable | Purpose | Default |
|----------|---------|---------|
| `API_BASE_URL` | Upstream base URL (gateway or direct) | (required) |
| `CLIENT_KEY` | OAuth2 client key for WSO2 | (required) |
| `CLIENT_SECRET` | OAuth2 client secret for WSO2 | (required) |
| `MUNICIPALITY_ID` | Target municipality | `2281` |
| `PORT` | Express listen port | `3010` (local) / `3000` (Docker) |
| `BASE_URL_PREFIX` | Route prefix | `/api` |
| `ORIGIN` | CORS allowed origin | `http://localhost:3000` |
| `NAMESPACE` | Available but currently unused | (empty) |
| `LOG_FORMAT` | Morgan log format | `dev` |
| `LOG_DIR` | Log file directory | `../../data/logs` |

**Planned additions for dual auth** (to be added to `config/index.ts`, `.env.example`,
and `docker-compose.yml`):

| Variable | Purpose | Default |
|----------|---------|---------|
| `AUTH_MODE` | Auth strategy: `apikey` (dev) or `oauth2` (prod) | `apikey` |
| `API_KEY` | API key for dev environment (when `AUTH_MODE=apikey`) | (required in dev) |

### Docker Connection

In `docker-compose.yml`, the frontend connects to backend via:
```yaml
BACKEND_URL: http://backend:3000
```

---

## Frontend API Proxy

### Next.js Catch-All Route Handler

`frontend/src/app/api/[...path]/route.ts`:

- Intercepts any request to `/api/*`
- Forwards to `{BACKEND_URL}/api/{path}` with:
  - Query strings passed through
  - Request body forwarded (including multipart)
  - All HTTP methods supported (GET, POST, PUT, PATCH, DELETE)
- For non-JSON responses (file downloads): streams `Content-Type` and
  `Content-Disposition` headers through to the browser

### Frontend API Service

The frontend Zustand stores call `apiService` which uses:
```typescript
apiURL('/document/api/documents?query=...')
// With NEXT_PUBLIC_BASE_PATH prefix
```

This hits the Next.js route handler, which proxies to the Express backend.
