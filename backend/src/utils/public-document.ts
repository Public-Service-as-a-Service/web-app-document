import { MUNICIPALITY_ID, PUBLIC_DOCUMENT_ALLOW_ARCHIVED } from '@config';
import { HttpException } from '@exceptions/http.exception';
import type { Document, DocumentData, DocumentMetadata } from '@/interfaces/document.interface';
import type { PublicDocumentResponse } from '@/interfaces/public-document.interface';

export const PUBLIC_METADATA_PREFIX = 'public:';
// Legacy key that older documents may still carry. We never expose it publicly,
// and it no longer drives any authorisation — the lifecycle `status` field does.
const LEGACY_PUBLISHED_METADATA_KEY = 'published';

const DEFAULT_MUNICIPALITY_ID = '2281';
const allowArchivedPublicDocuments = PUBLIC_DOCUMENT_ALLOW_ARCHIVED === 'true';

interface PublicFileTokenPayload {
  id: string;
  fileName: string;
}

export const assertRegistrationNumberMunicipality = (registrationNumber: string): void => {
  const expectedMunicipalityId = MUNICIPALITY_ID || DEFAULT_MUNICIPALITY_ID;
  const municipalityFromRegistrationNumber = registrationNumber.split('-')[1];

  if (municipalityFromRegistrationNumber !== expectedMunicipalityId) {
    throw new HttpException(404, 'Not found');
  }
};

export const assertPublicDocumentAccess = (
  document: Document,
  options: { requireActive: boolean }
): void => {
  // Lifecycle status is the source of truth. ACTIVE is the only status that is
  // currently effective; SCHEDULED/DRAFT are not yet public and
  // EXPIRED/REVOKED are no longer public.
  if (options.requireActive && document.status !== 'ACTIVE') {
    throw new HttpException(404, 'Not found');
  }

  if (document.confidentiality?.confidential === true) {
    throw new HttpException(404, 'Not found');
  }

  // Archive is a policy decision, not inherently the same thing as inactive.
  // Defaulting to blocked is conservative until a document-type policy exists.
  if (!allowArchivedPublicDocuments && document.archive === true) {
    throw new HttpException(404, 'Not found');
  }
};

const toPublicMetadata = (metadata: DocumentMetadata[] = []): DocumentMetadata[] =>
  metadata
    .filter((item) => item.key.startsWith(PUBLIC_METADATA_PREFIX))
    .map((item) => ({
      key: item.key.slice(PUBLIC_METADATA_PREFIX.length),
      value: item.value,
    }))
    .filter((item) => item.key.length > 0 && item.key !== LEGACY_PUBLISHED_METADATA_KEY);

const PREVIEWABLE_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/json',
  'application/xml',
  'text/xml',
  'text/csv',
  'text/markdown',
  'text/x-markdown',
]);

export const supportsPreview = (mimeType: string): boolean => {
  if (!mimeType) return false;
  if (PREVIEWABLE_MIME_TYPES.has(mimeType)) return true;
  return (
    mimeType.startsWith('image/') ||
    mimeType.startsWith('video/') ||
    mimeType.startsWith('audio/') ||
    mimeType.startsWith('text/')
  );
};

export const buildPublicFileToken = (file: DocumentData): string => {
  const payload: PublicFileTokenPayload = { id: file.id, fileName: file.fileName };
  return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
};

const parsePublicFileToken = (fileToken: string): PublicFileTokenPayload => {
  try {
    const decoded = Buffer.from(fileToken, 'base64url').toString('utf-8');
    const parsed = JSON.parse(decoded) as Partial<PublicFileTokenPayload>;

    if (!parsed.id || !parsed.fileName) {
      throw new Error('Invalid public file token payload');
    }

    return { id: parsed.id, fileName: parsed.fileName };
  } catch {
    throw new HttpException(404, 'Not found');
  }
};

export const findDocumentFileByToken = (
  files: DocumentData[] = [],
  fileToken: string
): DocumentData => {
  const payload = parsePublicFileToken(fileToken);
  const exactMatch = files.find((file) => file.id === payload.id);

  if (exactMatch) {
    return exactMatch;
  }

  const fileNameMatches = files.filter((file) => file.fileName === payload.fileName);
  if (fileNameMatches.length === 1) {
    return fileNameMatches[0];
  }

  throw new HttpException(404, 'Not found');
};

const normalizeBasePath = (basePath: string): string => basePath.replace(/\/+$/, '');

export const toPublicDocumentResponse = (
  document: Document,
  options: { basePath?: string; revision?: number; typeDisplayName?: string } = {}
): PublicDocumentResponse => {
  const basePath = normalizeBasePath(options.basePath || '');
  const revisionPath =
    typeof options.revision === 'number'
      ? `/v/${encodeURIComponent(String(options.revision))}`
      : '';
  const documentPath = `${basePath}/d/${encodeURIComponent(document.registrationNumber)}${revisionPath}`;
  const files = (document.documentData || []).map((file) => {
    const token = buildPublicFileToken(file);
    const encodedToken = encodeURIComponent(token);
    const previewSupported = supportsPreview(file.mimeType);

    return {
      fileName: file.fileName,
      mimeType: file.mimeType,
      fileSizeInBytes: file.fileSizeInBytes,
      downloadUrl: `${documentPath}/files/${encodedToken}`,
      previewUrl: previewSupported ? `${documentPath}/preview/${encodedToken}` : undefined,
      previewSupported,
    };
  });

  // Public DTO mapping is intentionally allowlisted. Do not return raw Document:
  // it contains internal IDs, actor data and confidentiality state.
  return {
    registrationNumber: document.registrationNumber,
    revision: document.revision,
    title: document.title,
    description: document.description,
    type: document.type,
    typeDisplayName: options.typeDisplayName || document.type,
    created: document.created,
    validFrom: document.validFrom,
    validTo: document.validTo,
    files,
    downloadAllUrl: files.length > 0 ? `${documentPath}/download` : undefined,
    metadataList: toPublicMetadata(document.metadataList),
  };
};

const UNSAFE_FILENAME_CHARS = /[<>:"/\\|?*]/g;

export const sanitizePublicFileName = (fileName: string, fallback = 'document'): string => {
  const withoutControlChars = Array.from(fileName)
    .filter((char) => {
      const charCode = char.charCodeAt(0);
      return charCode > 31 && charCode !== 127;
    })
    .join('');
  const sanitized = withoutControlChars.replace(UNSAFE_FILENAME_CHARS, '_').trim().slice(0, 180);

  return sanitized || fallback;
};

const toAsciiFallback = (fileName: string): string =>
  sanitizePublicFileName(fileName)
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/["\\]/g, '_');

const encodeRFC5987ValueChars = (value: string): string =>
  encodeURIComponent(value).replace(
    /['()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );

export const contentDisposition = (
  fileName: string,
  disposition: 'attachment' | 'inline'
): string => {
  const sanitized = sanitizePublicFileName(fileName);
  const asciiFallback = toAsciiFallback(sanitized);
  return `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encodeRFC5987ValueChars(
    sanitized
  )}`;
};

export const uniqueZipEntryName = (
  fileName: string,
  usedNames: Set<string>,
  fallback: string
): string => {
  const sanitized = sanitizePublicFileName(fileName, fallback);
  const dotIndex = sanitized.lastIndexOf('.');
  const base = dotIndex > 0 ? sanitized.slice(0, dotIndex) : sanitized;
  const extension = dotIndex > 0 ? sanitized.slice(dotIndex) : '';

  let candidate = sanitized;
  let counter = 2;
  while (usedNames.has(candidate)) {
    candidate = `${base}-${counter}${extension}`;
    counter += 1;
  }

  usedNames.add(candidate);
  return candidate;
};
