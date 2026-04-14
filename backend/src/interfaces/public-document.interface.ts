export interface PublicDocumentFile {
  fileName: string;
  mimeType: string;
  fileSizeInBytes: number;
  downloadUrl: string;
  previewUrl?: string;
  previewSupported: boolean;
}

export interface PublicDocumentRevision {
  revision: number;
  created: string;
  url: string;
}

export interface PublicDocumentResponse {
  registrationNumber: string;
  revision: number;
  description: string;
  type: string;
  created: string;
  files: PublicDocumentFile[];
  downloadAllUrl?: string;
  revisions?: PublicDocumentRevision[];
  metadataList: Array<{ key: string; value: string }>;
}
