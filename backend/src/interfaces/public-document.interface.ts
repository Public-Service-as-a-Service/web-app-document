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
  title?: string;
  description: string;
  type: string;
  typeDisplayName: string;
  created: string;
  validFrom?: string;
  validTo?: string;
  files: PublicDocumentFile[];
  downloadAllUrl?: string;
  revisions?: PublicDocumentRevision[];
  metadataList: Array<{ key: string; value: string }>;
}
