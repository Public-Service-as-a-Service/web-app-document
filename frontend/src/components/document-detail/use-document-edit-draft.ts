'use client';

import { useCallback, useState } from 'react';
import type {
  DocumentDto,
  DocumentMetadataDto,
  DocumentUpdateDto,
} from '@data-contracts/backend/data-contracts';
import { METADATA_KEYS, getMetadataValue } from '@utils/document-metadata';
import { toDateInputValue } from './document-detail-helpers';

export interface DocumentEditDraft {
  title: string;
  description: string;
  type: string;
  validFrom: string;
  validTo: string;
  caseNumber: string;
  caseUrl: string;
  pendingDeleteFileIds: string[];
  pendingUploadFiles: File[];
}

const emptyDraft: DocumentEditDraft = {
  title: '',
  description: '',
  type: '',
  validFrom: '',
  validTo: '',
  caseNumber: '',
  caseUrl: '',
  pendingDeleteFileIds: [],
  pendingUploadFiles: [],
};

const draftFromDocument = (doc: DocumentDto | null): DocumentEditDraft => {
  if (!doc) return emptyDraft;
  return {
    title: doc.title || '',
    description: doc.description || '',
    type: doc.type || '',
    validFrom: toDateInputValue(doc.validFrom),
    validTo: toDateInputValue(doc.validTo),
    caseNumber: getMetadataValue(doc.metadataList, METADATA_KEYS.caseNumber),
    caseUrl: getMetadataValue(doc.metadataList, METADATA_KEYS.caseUrl),
    pendingDeleteFileIds: [],
    pendingUploadFiles: [],
  };
};

export type DocumentUpdatePayload = Omit<DocumentUpdateDto, 'updatedBy'>;

export interface UseDocumentEditDraft {
  editing: boolean;
  draft: DocumentEditDraft;
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setType: (value: string) => void;
  setValidFrom: (value: string) => void;
  setValidTo: (value: string) => void;
  setCaseNumber: (value: string) => void;
  setCaseUrl: (value: string) => void;
  stageDeleteFile: (fileId: string) => void;
  stageUploadFiles: (files: File[]) => void;
  removeStagedUpload: (index: number) => void;
  hasDocumentChanges: (doc: DocumentDto) => boolean;
  hasFileChanges: () => boolean;
  // Builds the PATCH payload, sending only the metadata entries whose draft
  // value differs from the document's current state. Backend allowlist
  // policy lives entirely upstream — this hook just owns the shape.
  buildUpdatePayload: (doc: DocumentDto) => DocumentUpdatePayload;
  startEditing: () => void;
  cancelEditing: () => void;
  finishEditing: () => void;
}

export const useDocumentEditDraft = (doc: DocumentDto | null): UseDocumentEditDraft => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DocumentEditDraft>(() => draftFromDocument(doc));

  // "Reset state when the source changes" — React 19's recommended pattern
  // avoids a useEffect by comparing the incoming prop against a snapshot in
  // state and resetting inline during render. Editing gets dropped too since
  // a revision switch is an explicit cancellation.
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [docSnapshot, setDocSnapshot] = useState(doc);
  if (doc !== docSnapshot) {
    setDocSnapshot(doc);
    setDraft(draftFromDocument(doc));
    setEditing(false);
  }

  const setTitle = useCallback(
    (value: string) => setDraft((prev) => ({ ...prev, title: value })),
    []
  );
  const setDescription = useCallback(
    (value: string) => setDraft((prev) => ({ ...prev, description: value })),
    []
  );
  const setType = useCallback(
    (value: string) => setDraft((prev) => ({ ...prev, type: value })),
    []
  );
  const setValidFrom = useCallback(
    (value: string) => setDraft((prev) => ({ ...prev, validFrom: value })),
    []
  );
  const setValidTo = useCallback(
    (value: string) => setDraft((prev) => ({ ...prev, validTo: value })),
    []
  );
  const setCaseNumber = useCallback(
    (value: string) => setDraft((prev) => ({ ...prev, caseNumber: value })),
    []
  );
  const setCaseUrl = useCallback(
    (value: string) => setDraft((prev) => ({ ...prev, caseUrl: value })),
    []
  );

  const stageDeleteFile = useCallback(
    (fileId: string) =>
      setDraft((prev) =>
        prev.pendingDeleteFileIds.includes(fileId)
          ? prev
          : { ...prev, pendingDeleteFileIds: [...prev.pendingDeleteFileIds, fileId] }
      ),
    []
  );

  const stageUploadFiles = useCallback(
    (files: File[]) =>
      setDraft((prev) => ({
        ...prev,
        pendingUploadFiles: [...prev.pendingUploadFiles, ...files],
      })),
    []
  );

  const removeStagedUpload = useCallback(
    (index: number) =>
      setDraft((prev) => ({
        ...prev,
        pendingUploadFiles: prev.pendingUploadFiles.filter((_, i) => i !== index),
      })),
    []
  );

  const hasDocumentChanges = useCallback(
    (current: DocumentDto) =>
      draft.title !== (current.title || '') ||
      draft.description !== (current.description || '') ||
      draft.type !== (current.type || '') ||
      draft.validFrom !== toDateInputValue(current.validFrom) ||
      draft.validTo !== toDateInputValue(current.validTo) ||
      // Trim-aware so trailing whitespace alone never produces a phantom
      // revision — buildUpdatePayload trims before sending.
      draft.caseNumber.trim() !==
        getMetadataValue(current.metadataList, METADATA_KEYS.caseNumber).trim() ||
      draft.caseUrl.trim() !== getMetadataValue(current.metadataList, METADATA_KEYS.caseUrl).trim(),
    [
      draft.title,
      draft.description,
      draft.type,
      draft.validFrom,
      draft.validTo,
      draft.caseNumber,
      draft.caseUrl,
    ]
  );

  const hasFileChanges = useCallback(
    () => draft.pendingDeleteFileIds.length > 0 || draft.pendingUploadFiles.length > 0,
    [draft.pendingDeleteFileIds, draft.pendingUploadFiles]
  );

  const buildUpdatePayload = useCallback(
    (current: DocumentDto): DocumentUpdatePayload => {
      const metadataList: DocumentMetadataDto[] = [];
      const nextCaseNumber = draft.caseNumber.trim();
      const nextCaseUrl = draft.caseUrl.trim();
      const currentCaseNumber = getMetadataValue(
        current.metadataList,
        METADATA_KEYS.caseNumber
      ).trim();
      const currentCaseUrl = getMetadataValue(current.metadataList, METADATA_KEYS.caseUrl).trim();
      if (nextCaseNumber !== currentCaseNumber) {
        metadataList.push({ key: METADATA_KEYS.caseNumber, value: nextCaseNumber });
      }
      if (nextCaseUrl !== currentCaseUrl) {
        metadataList.push({ key: METADATA_KEYS.caseUrl, value: nextCaseUrl });
      }
      return {
        title: draft.title,
        description: draft.description,
        type: draft.type,
        validFrom: draft.validFrom || undefined,
        validTo: draft.validTo || undefined,
        ...(metadataList.length > 0 ? { metadataList } : {}),
      };
    },
    [draft]
  );

  const startEditing = useCallback(() => {
    setDraft(draftFromDocument(doc));
    setEditing(true);
  }, [doc]);

  const cancelEditing = useCallback(() => {
    setDraft(draftFromDocument(doc));
    setEditing(false);
  }, [doc]);

  const finishEditing = useCallback(() => {
    setDraft(draftFromDocument(doc));
    setEditing(false);
  }, [doc]);

  return {
    editing,
    draft,
    setTitle,
    setDescription,
    setType,
    setValidFrom,
    setValidTo,
    setCaseNumber,
    setCaseUrl,
    stageDeleteFile,
    stageUploadFiles,
    removeStagedUpload,
    hasDocumentChanges,
    hasFileChanges,
    buildUpdatePayload,
    startEditing,
    cancelEditing,
    finishEditing,
  };
};
