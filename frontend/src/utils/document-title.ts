import type { DocumentDto } from '@data-contracts/backend/data-contracts';

type DocumentLike = Pick<DocumentDto, 'title' | 'registrationNumber'>;

const hasTitle = (doc: DocumentLike): doc is DocumentLike & { title: string } =>
  typeof doc.title === 'string' && doc.title.length > 0;

export const getDocumentDisplayTitle = (doc: DocumentLike): string =>
  hasTitle(doc) ? doc.title : '—';

export const getDocumentAriaTitle = (doc: DocumentLike): string =>
  hasTitle(doc) ? doc.title : doc.registrationNumber;

export const DOCUMENT_TITLE_ROW_MAX = 30;

export const truncateDocumentTitleForRow = (
  doc: DocumentLike,
  max: number = DOCUMENT_TITLE_ROW_MAX
): { display: string; tooltip: string | undefined } => {
  const title = doc.title;
  if (!title) return { display: getDocumentDisplayTitle(doc), tooltip: undefined };
  if (title.length <= max) return { display: title, tooltip: undefined };
  return { display: `${title.slice(0, max)}…`, tooltip: title };
};
