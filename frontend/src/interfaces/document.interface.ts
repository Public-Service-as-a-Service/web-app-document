/**
 * Frontend-only document shapes. Response and request DTOs that are shared
 * with the backend live in `@data-contracts/backend/data-contracts` and are
 * auto-generated from the backend OpenAPI spec.
 */

import { DocumentStatusEnum } from '@data-contracts/backend/data-contracts';

// Statuses surfaced in the documents list filter. DRAFT is intentionally
// omitted: drafts are private working state for the author and should not
// appear in the shared documents list even when "all statuses" is
// selected. The DocumentStatusEnum itself keeps DRAFT — detail pages still
// need to render it, we just don't offer it as a list filter option.
//
// Kept outside the auto-generated data-contracts module so regeneration
// (yarn generate:contracts) doesn't wipe it.
export const DOCUMENT_STATUSES: DocumentStatusEnum[] = [
  DocumentStatusEnum.SCHEDULED,
  DocumentStatusEnum.ACTIVE,
  DocumentStatusEnum.EXPIRED,
  DocumentStatusEnum.REVOKED,
];

export interface DocumentCreateRequest {
  createdBy: string;
  archive?: boolean;
  description: string;
  metadataList: { key: string; value: string }[];
  responsibilities?: { username: string }[];
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
 * `DocumentFilterParametersDto` with an extra `includeConfidential` field that
 * the backend strips before forwarding upstream.
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
  responsibilities?: { username: string }[];
  validOn?: string;
  statuses?: DocumentStatusEnum[];
}
