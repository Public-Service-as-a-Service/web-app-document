import type { DocumentDto } from '@data-contracts/backend/data-contracts';

type DocumentLike = Pick<DocumentDto, 'title' | 'registrationNumber'>;

// The registration number is shown alongside the title in every list, card,
// and detail header — so when a title is missing we'd rather surface a plain
// em dash than repeat the regnr. Callers that need a fully-qualified anchor
// (e.g. aria-labels) should compose title + regnr themselves.
export const getDocumentDisplayTitle = (doc: DocumentLike): string =>
  doc.title && doc.title.length > 0 ? doc.title : '—';
