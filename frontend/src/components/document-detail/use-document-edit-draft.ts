'use client';

import { useCallback, useState } from 'react';
import type { DocumentDto } from '@data-contracts/backend/data-contracts';
import { toDateInputValue } from './document-detail-helpers';

export interface DocumentEditDraft {
  description: string;
  type: string;
  validFrom: string;
  validTo: string;
  pendingDeleteFileIds: string[];
  pendingUploadFiles: File[];
}

const emptyDraft: DocumentEditDraft = {
  description: '',
  type: '',
  validFrom: '',
  validTo: '',
  pendingDeleteFileIds: [],
  pendingUploadFiles: [],
};

const draftFromDocument = (doc: DocumentDto | null): DocumentEditDraft => {
  if (!doc) return emptyDraft;
  return {
    description: doc.description || '',
    type: doc.type || '',
    validFrom: toDateInputValue(doc.validFrom),
    validTo: toDateInputValue(doc.validTo),
    pendingDeleteFileIds: [],
    pendingUploadFiles: [],
  };
};

export interface UseDocumentEditDraft {
  editing: boolean;
  draft: DocumentEditDraft;
  setDescription: (value: string) => void;
  setType: (value: string) => void;
  setValidFrom: (value: string) => void;
  setValidTo: (value: string) => void;
  stageDeleteFile: (fileId: string) => void;
  stageUploadFiles: (files: File[]) => void;
  removeStagedUpload: (index: number) => void;
  hasDocumentChanges: (doc: DocumentDto) => boolean;
  hasFileChanges: () => boolean;
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
      draft.description !== (current.description || '') ||
      draft.type !== (current.type || '') ||
      draft.validFrom !== toDateInputValue(current.validFrom) ||
      draft.validTo !== toDateInputValue(current.validTo),
    [draft.description, draft.type, draft.validFrom, draft.validTo]
  );

  const hasFileChanges = useCallback(
    () => draft.pendingDeleteFileIds.length > 0 || draft.pendingUploadFiles.length > 0,
    [draft.pendingDeleteFileIds, draft.pendingUploadFiles]
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
    setDescription,
    setType,
    setValidFrom,
    setValidTo,
    stageDeleteFile,
    stageUploadFiles,
    removeStagedUpload,
    hasDocumentChanges,
    hasFileChanges,
    startEditing,
    cancelEditing,
    finishEditing,
  };
};
