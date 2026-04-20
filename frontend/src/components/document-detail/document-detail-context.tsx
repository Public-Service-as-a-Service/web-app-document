'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { DocumentDto } from '@data-contracts/backend/data-contracts';
import type { UseDocumentEditDraft } from './use-document-edit-draft';

interface DocumentDetailContextValue {
  doc: DocumentDto;
  locale: string;
  registrationNumber: string;
  selectedRevision: number | null;
  canEdit: boolean;
  isActive: boolean;
  editDraft: UseDocumentEditDraft;
}

const DocumentDetailContext = createContext<DocumentDetailContextValue | null>(null);

export const DocumentDetailProvider = ({
  value,
  children,
}: {
  value: DocumentDetailContextValue;
  children: ReactNode;
}) => (
  <DocumentDetailContext.Provider value={value}>{children}</DocumentDetailContext.Provider>
);

export const useDocumentDetail = (): DocumentDetailContextValue => {
  const ctx = useContext(DocumentDetailContext);
  if (!ctx) {
    throw new Error('useDocumentDetail must be used inside <DocumentDetailProvider>');
  }
  return ctx;
};
