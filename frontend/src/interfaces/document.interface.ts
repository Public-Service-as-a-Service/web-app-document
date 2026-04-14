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

export interface Document {
  id: string;
  municipalityId: string;
  registrationNumber: string;
  revision: number;
  description: string;
  created: string;
  createdBy: string;
  archive: boolean;
  metadataList: DocumentMetadata[];
  documentData: DocumentData[];
  type: string;
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

export interface DocumentType {
  type: string;
  displayName: string;
}

export interface DocumentUpdateRequest {
  createdBy: string;
  description?: string;
  archive?: boolean;
  metadataList?: DocumentMetadata[];
  type?: string;
}

export interface DocumentFilterParams {
  query?: string;
  onlyLatestRevision?: boolean;
  page?: number;
  size?: number;
  sort?: string[];
}

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
}
