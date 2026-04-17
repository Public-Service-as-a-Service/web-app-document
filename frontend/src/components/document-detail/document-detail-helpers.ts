import dayjs from 'dayjs';
import type { DocumentColumnKey } from '@components/document-list/document-columns';

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// dayjs inputs for date-only values round-trip best through YYYY-MM-DD.
export const toDateInputValue = (value: string | undefined): string =>
  value ? dayjs(value).format('YYYY-MM-DD') : '';

export const formatDateDisplay = (value: string | undefined, fallback: string) =>
  value ? dayjs(value).format('YYYY-MM-DD') : fallback;

export const DETAIL_REVISION_COLUMNS: readonly DocumentColumnKey[] = [
  'description',
  'type',
  'validity',
  'responsibilities',
  'department',
];

export const buildPublicFileToken = (file: { id: string; fileName: string }) => {
  const json = JSON.stringify({ id: file.id, fileName: file.fileName });
  const bytes = new TextEncoder().encode(json);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
