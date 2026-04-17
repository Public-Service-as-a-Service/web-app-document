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

const PREVIEWABLE_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'json',
  'xml',
  'csv',
  'md',
  'txt',
]);

export const supportsPreview = (mimeType: string | undefined, fileName: string): boolean => {
  if (mimeType) {
    if (PREVIEWABLE_MIME_TYPES.has(mimeType)) return true;
    if (
      mimeType.startsWith('image/') ||
      mimeType.startsWith('video/') ||
      mimeType.startsWith('audio/') ||
      mimeType.startsWith('text/')
    ) {
      return true;
    }
  }

  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex < 0) return false;
  const extension = fileName.slice(dotIndex + 1).toLowerCase();
  return PREVIEWABLE_EXTENSIONS.has(extension);
};
