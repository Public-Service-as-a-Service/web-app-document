import type { DocumentFilterBody } from '@interfaces/document.interface';
import type { SelectedDepartment } from './department-multi-picker';

export interface DocumentFiltersValue {
  documentTypes: string[];
  departments: SelectedDepartment[];
  responsibilities: string[];
}

export const emptyDocumentFilters: DocumentFiltersValue = {
  documentTypes: [],
  departments: [],
  responsibilities: [],
};

export const hasActiveFilters = (filters: DocumentFiltersValue): boolean =>
  filters.documentTypes.length > 0 ||
  filters.departments.length > 0 ||
  filters.responsibilities.length > 0;

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
    body.responsibilities = filters.responsibilities.map((username) => ({ username }));
  }

  return body;
};
