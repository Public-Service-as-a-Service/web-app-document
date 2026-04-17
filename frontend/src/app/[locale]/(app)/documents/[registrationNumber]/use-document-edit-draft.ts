import { useCallback, useState } from 'react';
import type {
  Document as DocType,
  DocumentMetadata,
} from '@interfaces/document.interface';

export const isPublished = (metadataList: DocumentMetadata[] = []) =>
  metadataList.some(
    (m) => m.key === 'published' && m.value.trim().toLowerCase() === 'true'
  );

export function useDocumentEditDraft(currentDocument: DocType | null) {
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [published, setPublished] = useState(false);
  const [pendingUploadFiles, setPendingUploadFiles] = useState<File[]>([]);
  const [pendingDeleteFileIds, setPendingDeleteFileIds] = useState<string[]>([]);
  const [syncedDoc, setSyncedDoc] = useState<DocType | null>(null);

  if (currentDocument && currentDocument !== syncedDoc) {
    setSyncedDoc(currentDocument);
    setDescription(currentDocument.description || '');
    setType(currentDocument.type || '');
    setPublished(isPublished(currentDocument.metadataList));
    setPendingUploadFiles([]);
    setPendingDeleteFileIds([]);
  }

  const reset = useCallback(() => {
    if (!currentDocument) return;
    setDescription(currentDocument.description || '');
    setType(currentDocument.type || '');
    setPublished(isPublished(currentDocument.metadataList));
    setPendingUploadFiles([]);
    setPendingDeleteFileIds([]);
  }, [currentDocument]);

  const hasDocumentChanges = currentDocument
    ? description !== (currentDocument.description || '') ||
      type !== (currentDocument.type || '') ||
      published !== isPublished(currentDocument.metadataList)
    : false;
  const hasFileChanges =
    pendingUploadFiles.length > 0 || pendingDeleteFileIds.length > 0;
  const isDirty = hasDocumentChanges || hasFileChanges;

  return {
    description,
    setDescription,
    type,
    setType,
    published,
    setPublished,
    pendingUploadFiles,
    setPendingUploadFiles,
    pendingDeleteFileIds,
    setPendingDeleteFileIds,
    reset,
    isDirty,
    hasDocumentChanges,
    hasFileChanges,
  };
}
