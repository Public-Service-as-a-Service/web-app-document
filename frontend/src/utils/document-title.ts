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
