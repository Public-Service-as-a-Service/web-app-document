export enum DocumentStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

export const DOCUMENT_STATUSES: DocumentStatus[] = Object.values(DocumentStatus);

export interface DocumentConfidentiality {
  confidential: boolean;
  legalCitation: string;
}

export interface DocumentMetadata {
  key: string;
  value: string;
}

export interface DocumentData {
  id: string;
  fileName: string;
  mimeType: string;
  fileSizeInBytes: number;
}

export interface DocumentResponsibility {
  personId: string;
}

export interface Document {
  id: string;
  municipalityId: string;
  registrationNumber: string;
  revision: number;
  confidentiality: DocumentConfidentiality;
  title?: string;
  description: string;
  created: string;
  createdBy: string;
  updatedBy?: string;
  archive: boolean;
  metadataList: DocumentMetadata[];
  documentData: DocumentData[];
  responsibilities?: DocumentResponsibility[];
  type: string;
  validFrom?: string;
  validTo?: string;
  status?: DocumentStatus;
}

export interface PageMeta {
  page: number;
  limit: number;
  count: number;
  totalRecords: number;
  totalPages: number;
}

export interface PagedDocumentResponse {
  documents: Document[];
  _meta: PageMeta;
}

export interface DocumentCreateRequest {
  createdBy: string;
  archive?: boolean;
  title: string;
  description: string;
  metadataList?: DocumentMetadata[];
  responsibilities?: DocumentResponsibility[];
  type: string;
  validFrom?: string;
  validTo?: string;
}

export interface DocumentUpdateRequest {
  updatedBy: string;
  title?: string;
  description?: string;
  archive?: boolean;
  metadataList?: DocumentMetadata[];
  type?: string;
  validFrom?: string;
  validTo?: string;
}

export interface DocumentResponsibilitiesUpdateRequest {
  updatedBy: string;
  responsibilities: DocumentResponsibility[];
}

export interface DocumentDataCreateRequest {
  createdBy: string;
}

export interface DocumentType {
  type: string;
  displayName: string;
}

export interface DocumentTypeCreateRequest {
  type: string;
  displayName: string;
  createdBy: string;
}

export interface DocumentTypeUpdateRequest {
  type?: string;
  displayName?: string;
  updatedBy: string;
}

export interface DocumentFilterParameters {
  page?: number;
  limit?: number;
  sortBy?: string[];
  sortDirection?: 'ASC' | 'DESC';
  onlyLatestRevision?: boolean;
  createdBy?: string;
  documentTypes?: string[];
  metaData?: Array<{
    key?: string;
    matchesAny?: string[];
    matchesAll?: string[];
  }>;
  responsibilities?: DocumentResponsibility[];
  validOn?: string;
  statuses?: DocumentStatus[];
  // Backend-only flag: when true, each result row is swapped for the latest
  // ACTIVE/SCHEDULED/EXPIRED revision of that document (docs with none are
  // dropped). Stripped before forwarding to upstream.
  publishedOnly?: boolean;
}
