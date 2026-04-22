import { DOCUMENT_STATUSES, type DocumentFilterBody } from '@interfaces/document.interface';
import { DocumentStatusEnum } from '@data-contracts/backend/data-contracts';
import type { SelectedDepartment } from './department-multi-picker';

export interface DocumentFiltersValue {
  documentTypes: string[];
  departments: SelectedDepartment[];
  responsibilities: string[];
  statuses: DocumentStatusEnum[];
}

export const emptyDocumentFilters: DocumentFiltersValue = {
  documentTypes: [],
  departments: [],
  responsibilities: [],
  // Backend defaults to the published subset (SCHEDULED/ACTIVE/EXPIRED). We
  // explicitly select all 5 so the list shows DRAFT and REVOKED too until the
  // user narrows the filter.
  statuses: [...DOCUMENT_STATUSES],
};

const statusesAreDefault = (statuses: DocumentStatusEnum[]): boolean =>
  statuses.length === DOCUMENT_STATUSES.length &&
  DOCUMENT_STATUSES.every((status) => statuses.includes(status));

export const hasActiveFilters = (filters: DocumentFiltersValue): boolean =>
  filters.documentTypes.length > 0 ||
  filters.departments.length > 0 ||
  filters.responsibilities.length > 0 ||
  !statusesAreDefault(filters.statuses);

/**
 * Filters the Elasticsearch match endpoint cannot honour. Department and
 * responsibility filters map to structured fields that are not indexed by
 * the upstream search service — we surface a hint when they are active in
 * combination with a full-text query instead of silently dropping them.
 */
export const hasMatchIncompatibleFilters = (filters: DocumentFiltersValue): boolean =>
  filters.departments.length > 0 || filters.responsibilities.length > 0;

export const applyDocumentFilters = (
  base: DocumentFilterBody,
  filters: DocumentFiltersValue
): DocumentFilterBody => {
  const body: DocumentFilterBody = { ...base };

  if (filters.documentTypes.length > 0) {
    body.documentTypes = filters.documentTypes;
  }

  if (filters.departments.length > 0) {
    const existingMetaData = base.metaData || [];
    body.metaData = [
      ...existingMetaData,
      {
        key: 'departmentOrgId',
        matchesAny: filters.departments.map((d) => String(d.orgId)),
      },
    ];
  }

  if (filters.responsibilities.length > 0) {
    body.responsibilities = filters.responsibilities.map((personId) => ({ personId }));
  }

  // Always send statuses so the backend default (3 of 5) is never applied
  // implicitly — the UI always drives which lifecycle statuses are included.
  body.statuses = filters.statuses;

  return body;
};
