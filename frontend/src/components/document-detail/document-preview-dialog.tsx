'use client';

import dynamic from 'next/dynamic';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { apiService } from '@services/api-service';
import { useDocumentDetail } from './document-detail-context';

const FilePreview = dynamic(() => import('@components/file-preview/file-preview'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
    </div>
  ),
});

export interface PreviewTarget {
  id: string;
  fileName: string;
  mimeType: string;
}

interface DocumentPreviewDialogProps {
  previewFile: PreviewTarget | null;
  onOpenChange: (open: boolean) => void;
  onDownload: (fileId: string, fileName: string) => void;
}

export const DocumentPreviewDialog = ({
  previewFile,
  onOpenChange,
  onDownload,
}: DocumentPreviewDialogProps) => {
  const { t } = useTranslation();
  const { doc, registrationNumber } = useDocumentDetail();
  const previewFileId = previewFile?.id;
  // Scope the preview read to the displayed revision; the bare endpoint
  // resolves to upstream's absolute latest, which may be a DRAFT that no
  // longer contains this file.
  const displayRevision = doc.revision;

  const fetchPreviewBlob = useCallback(async () => {
    if (!previewFileId) throw new Error('No preview file');
    const fileUrl = `documents/${registrationNumber}/revisions/${displayRevision}/files/${previewFileId}`;
    const res = await apiService.getBlob(fileUrl);
    return res.data as Blob;
  }, [previewFileId, registrationNumber, displayRevision]);

  return (
    <Dialog open={previewFile !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-6xl gap-4 overflow-hidden sm:max-w-6xl">
        <DialogHeader className="pr-10">
          <div className="flex flex-wrap items-start justify-between gap-2 sm:flex-nowrap">
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate" title={previewFile?.fileName}>
                {previewFile?.fileName}
              </DialogTitle>
              <DialogDescription className="truncate">{previewFile?.mimeType}</DialogDescription>
            </div>
            {previewFile && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => onDownload(previewFile.id, previewFile.fileName)}
              >
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                {t('common:document_files_download')}
              </Button>
            )}
          </div>
        </DialogHeader>
        {previewFile && (
          <FilePreview
            key={previewFile.id}
            fileName={previewFile.fileName}
            mimeType={previewFile.mimeType}
            fetchBlob={fetchPreviewBlob}
            labels={{
              loading: t('common:document_files_preview_loading'),
              error: t('common:document_files_preview_error'),
              unsupported: t('common:document_files_preview_unsupported'),
              pptxFidelityWarning: t('common:document_files_preview_pptx_warning'),
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
