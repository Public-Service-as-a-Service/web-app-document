'use client';

import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText as FileTextIcon, Trash2, Upload } from 'lucide-react';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Card } from '@components/ui/card';
import { ConfirmDialog } from '@components/ui/confirm-dialog';
import type { DocumentDataDto } from '@data-contracts/backend/data-contracts';
import { supportsPreview } from '@utils/file-preview-support';
import { formatFileSize } from './document-detail-helpers';
import { useDocumentDetail } from './document-detail-context';

interface DocumentFilesSectionProps {
  onDownload: (fileId: string, fileName: string) => void;
  onPreview: (file: DocumentDataDto) => void;
}

export const DocumentFilesSection = ({ onDownload, onPreview }: DocumentFilesSectionProps) => {
  const { t } = useTranslation();
  const { doc, canEdit, editDraft } = useDocumentDetail();
  const { editing, draft, stageDeleteFile, stageUploadFiles, removeStagedUpload } = editDraft;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingDeleteFileId, setPendingDeleteFileId] = useState<string | null>(null);

  const visibleDocumentFiles = (doc.documentData || []).filter(
    (file) => !draft.pendingDeleteFileIds.includes(file.id)
  );

  const displayCount = editing
    ? visibleDocumentFiles.length + draft.pendingUploadFiles.length
    : doc.documentData?.length || 0;

  const handleStageUploadFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(e.target.files || []);
    if (nextFiles.length > 0) stageUploadFiles(nextFiles);
    e.target.value = '';
  };

  return (
    <>
      <Card className="gap-0 p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <FileTextIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            {t('common:document_files')}
            <Badge variant="secondary" className="h-5 px-1.5 font-mono text-[0.7rem]">
              {displayCount}
            </Badge>
          </h3>
          {canEdit && editing && (
            <div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                {t('common:document_files_upload')}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleStageUploadFiles}
                aria-label={t('common:document_files_upload')}
              />
            </div>
          )}
        </div>
        {visibleDocumentFiles.length === 0 && draft.pendingUploadFiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('common:document_files_empty')}</p>
        ) : (
          <ul className="space-y-2">
            {visibleDocumentFiles.map((file) => {
              const canPreview = supportsPreview(file.mimeType, file.fileName);
              const primaryActionLabel = canPreview
                ? `${t('common:document_files_preview')}: ${file.fileName}`
                : `${t('common:document_files_download')}: ${file.fileName}`;
              const handlePrimary = () => {
                if (canPreview) onPreview(file);
                else onDownload(file.id, file.fileName);
              };
              return (
                <li
                  key={file.id}
                  className="group relative flex items-center gap-2 rounded-lg border border-border p-3 transition-[background-color,border-color] hover:border-primary/30 hover:bg-accent focus-within:border-primary/40 focus-within:ring-[3px] focus-within:ring-ring/40"
                >
                  <button
                    type="button"
                    onClick={handlePrimary}
                    aria-label={primaryActionLabel}
                    className="relative min-w-0 flex-1 text-left outline-none after:absolute after:inset-0 after:cursor-pointer after:rounded-lg after:content-[''] focus-visible:outline-none"
                  >
                    <p className="truncate text-sm font-medium" title={file.fileName}>
                      {file.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span>{file.mimeType}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="tabular-nums">
                        {formatFileSize(file.fileSizeInBytes)}
                      </span>
                    </p>
                  </button>
                  <div className="relative z-10 flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${t('common:document_files_download')}: ${file.fileName}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onDownload(file.id, file.fileName);
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {canEdit && editing && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`${t('common:document_files_delete')}: ${file.fileName}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setPendingDeleteFileId(file.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
            {editing &&
              draft.pendingUploadFiles.map((file, index) => (
                <li
                  key={`staged-${file.name}-${index}`}
                  className="flex items-center justify-between rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="tabular-nums">{formatFileSize(file.size)}</span>
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${t('common:documents_filter_chip_remove', {
                        label: file.name,
                      })}`}
                      onClick={() => removeStagedUpload(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={pendingDeleteFileId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteFileId(null);
        }}
        title={t('common:document_files_delete_confirm')}
        description={t('common:document_files_delete_confirm')}
        confirmLabel={t('common:delete')}
        cancelLabel={t('common:cancel')}
        variant="destructive"
        onConfirm={() => {
          if (pendingDeleteFileId) {
            stageDeleteFile(pendingDeleteFileId);
            setPendingDeleteFileId(null);
          }
        }}
      />
    </>
  );
};
