import type { DocumentDto } from '@data-contracts/backend/data-contracts';

type DocumentLike = Pick<DocumentDto, 'title' | 'registrationNumber'>;

export const getDocumentDisplayTitle = (doc: DocumentLike): string =>
  doc.title && doc.title.length > 0 ? doc.title : doc.registrationNumber;
