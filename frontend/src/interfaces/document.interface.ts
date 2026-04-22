/**
 * Frontend-only document shapes. Response and request DTOs that are shared
 * with the backend live in `@data-contracts/backend/data-contracts` and are
 * auto-generated from the backend OpenAPI spec.
 */

import { DocumentStatusEnum } from '@data-contracts/backend/data-contracts';

// Statuses surfaced in the documents list filter. DRAFT is included so
// authors can find their own work-in-progress on the "My documents" view —
// without it, drafts would be effectively invisible once you navigated
// away from the create flow.
//
// Kept outside the auto-generated data-contracts module so regeneration
// (yarn generate:contracts) doesn't wipe it.
export const DOCUMENT_STATUSES: DocumentStatusEnum[] = [
  DocumentStatusEnum.DRAFT,
  DocumentStatusEnum.SCHEDULED,
  DocumentStatusEnum.ACTIVE,
  DocumentStatusEnum.EXPIRED,
  DocumentStatusEnum.REVOKED,
];

export interface DocumentCreateRequest {
  createdBy: string;
  archive?: boolean;
  title: string;
  description: string;
  metadataList?: { key: string; value: string }[];
  responsibilities?: { personId: string }[];
  type: string;
  validFrom?: string;
  validTo?: string;
}

export interface DocumentFilterParams {
  query?: string;
  onlyLatestRevision?: boolean;
  page?: number;
  size?: number;
  sort?: string[];
}

/**
 * Request body for POST /documents/filter. Mirrors backend
 * `DocumentFilterParametersDto` with extras the backend strips before
 * forwarding upstream: `includeConfidential` and `publishedOnly`.
 */
export interface DocumentFilterBody {
  page?: number;
  limit?: number;
  sortBy?: string[];
  sortDirection?: 'ASC' | 'DESC';
  includeConfidential?: boolean;
  onlyLatestRevision?: boolean;
  createdBy?: string;
  documentTypes?: string[];
  metaData?: Array<{
    key?: string;
    matchesAny?: string[];
    matchesAll?: string[];
  }>;
  responsibilities?: { personId: string }[];
  validOn?: string;
  statuses?: DocumentStatusEnum[];
  // When true, backend swaps each row for the latest ACTIVE/SCHEDULED/EXPIRED
  // revision and drops docs that have never been published.
  publishedOnly?: boolean;
}

/**
 * Full-text (Elasticsearch) search — stripped response: only matching document
 * IDs + the files that matched, with highlighted snippets grouped by field.
 * Documents must be hydrated separately via GET /documents/{registrationNumber}
 * when metadata (title, type, etc.) is needed.
 *
 * Mirrors backend `FileMatchDto` / `DocumentMatchDto` / `PagedDocumentMatchResponseDto`.
 */
export interface FileMatch {
  id: string;
  fileName: string;
  /** Highlighted fragments keyed by matched field (e.g. extractedText, title, description, fileName). Matches are wrapped in `<em>…</em>`. */
  highlights: Record<string, string[]>;
}

export interface DocumentMatch {
  id: string;
  registrationNumber: string;
  revision: number;
  files: FileMatch[];
}

export interface PagedDocumentMatchResponse {
  documents: DocumentMatch[];
  _meta: {
    page: number;
    limit: number;
    count: number;
    totalRecords: number;
    totalPages: number;
  };
}

export interface FileMatchesQuery {
  query: string[];
  onlyLatestRevision?: boolean;
  page?: number;
  size?: number;
  sort?: string[];
}

export interface FileStatistics {
  documentDataId?: string;
  fileName?: string;
  downloads?: number;
  views?: number;
}

export interface RevisionStatistics {
  revision?: number;
  downloads?: number;
  views?: number;
  perFile?: FileStatistics[];
}

export interface DocumentStatistics {
  municipalityId?: string;
  registrationNumber?: string;
  from?: string;
  to?: string;
  totalAccesses?: number;
  perRevision?: RevisionStatistics[];
}
