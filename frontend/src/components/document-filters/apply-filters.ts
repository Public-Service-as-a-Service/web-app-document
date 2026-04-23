import type { DocumentFilterBody } from '@interfaces/document.interface';
import { DocumentStatusEnum } from '@data-contracts/backend/data-contracts';
import type { SelectedDepartment } from './department-multi-picker';

export interface DocumentFiltersValue {
  documentTypes: string[];
  departments: SelectedDepartment[];
  responsibilities: string[];
  statuses: DocumentStatusEnum[];
}

// "Clear all" target — truly empty, including no status narrowing. Page
// defaults are separate (see *_DEFAULT_STATUSES below); clicking clear on
// any page should leave no selection anywhere, not bounce back to a page
// default the user just tried to remove.
export const emptyDocumentFilters: DocumentFiltersValue = {
  documentTypes: [],
  departments: [],
  responsibilities: [],
  statuses: [],
};

// The /documents listing focuses on what's currently live — ACTIVE only by
// default. Other lifecycle states stay one click away in the dropdown, and
// the chip row always shows the active selection.
export const DEFAULT_DOCUMENT_STATUSES: DocumentStatusEnum[] = [DocumentStatusEnum.ACTIVE];

// /my-documents shows everything the user is involved in regardless of
// lifecycle, so drafts and revoked docs surface without an extra click.
export const MY_DOCUMENTS_DEFAULT_STATUSES: DocumentStatusEnum[] = [];

// Initial filter state for /documents on page load.
export const defaultDocumentsPageFilters: DocumentFiltersValue = {
  ...emptyDocumentFilters,
  statuses: [...DEFAULT_DOCUMENT_STATUSES],
};

export const statusesAreDefault = (
  statuses: DocumentStatusEnum[],
  defaults: DocumentStatusEnum[] = DEFAULT_DOCUMENT_STATUSES
): boolean =>
  statuses.length === defaults.length && defaults.every((status) => statuses.includes(status));

export const hasActiveFilters = (
  filters: DocumentFiltersValue,
  defaultStatuses: DocumentStatusEnum[] = DEFAULT_DOCUMENT_STATUSES
): boolean =>
  filters.documentTypes.length > 0 ||
  filters.departments.length > 0 ||
  filters.responsibilities.length > 0 ||
  !statusesAreDefault(filters.statuses, defaultStatuses);

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
