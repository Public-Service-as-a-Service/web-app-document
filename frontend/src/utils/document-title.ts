import type { DocumentDto } from '@data-contracts/backend/data-contracts';

type DocumentLike = Pick<DocumentDto, 'title' | 'registrationNumber'>;

const hasTitle = (doc: DocumentLike): doc is DocumentLike & { title: string } =>
  typeof doc.title === 'string' && doc.title.length > 0;

// Visual fallback: the regnr is already shown beside the title in every
// list/card/header, so we'd rather render an em dash than repeat it.
export const getDocumentDisplayTitle = (doc: DocumentLike): string =>
  hasTitle(doc) ? doc.title : '—';

// aria-label fallback: screen readers don't see the regnr column, so an
// untitled document must still announce something meaningful.
export const getDocumentAriaTitle = (doc: DocumentLike): string =>
  hasTitle(doc) ? doc.title : doc.registrationNumber;

export const DOCUMENT_TITLE_ROW_MAX = 60;

// Single-row surfaces (tables, cards, attention list) need a hard
// character cap or a long title stretches the column / truncates other
// content. Callers spread `tooltip` onto the rendered element's
// `title` attribute so hover reveals the full string — screen readers
// still get the full title via the surrounding link's aria-label.
export const truncateDocumentTitleForRow = (
  doc: DocumentLike,
  max: number = DOCUMENT_TITLE_ROW_MAX
): { display: string; tooltip: string | undefined } => {
  const title = doc.title;
  if (!title) return { display: getDocumentDisplayTitle(doc), tooltip: undefined };
  if (title.length <= max) return { display: title, tooltip: undefined };
  return { display: `${title.slice(0, max)}…`, tooltip: title };
};
