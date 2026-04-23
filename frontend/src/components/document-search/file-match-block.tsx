'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Eye } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { HighlightSnippet } from './highlight-snippet';
import { extractQueryTerms, FilePreviewSheet } from './file-preview-sheet';
import { useDocumentStore } from '@stores/document-store';
import { FileExtractionStatus, type FileMatch } from '@interfaces/document.interface';

interface FileMatchBlockProps {
  file: FileMatch;
  registrationNumber: string;
  revision: number;
  mimeType: string;
}

const FIELD_ORDER: readonly string[] = ['title', 'description', 'fileName', 'extractedText'];

const FIELD_LABEL_KEYS: Record<string, string> = {
  title: 'common:documents_match_field_title',
  description: 'common:documents_match_field_description',
  fileName: 'common:documents_match_field_filename',
  extractedText: 'common:documents_match_field_text',
};

const orderFields = (highlights: FileMatch['highlights']): Array<[string, string[]]> => {
  return Object.entries(highlights ?? {}).sort(([a], [b]) => {
    const ai = FIELD_ORDER.indexOf(a);
    const bi = FIELD_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
};

export function FileMatchBlock({
  file,
  registrationNumber,
  revision,
  mimeType,
}: FileMatchBlockProps) {
  const { t } = useTranslation();
  const query = useDocumentStore((s) => s.query);
  const [previewOpen, setPreviewOpen] = useState(false);

  const fields = orderFields(file.highlights);
  const totalSnippets = fields.reduce((sum, [, arr]) => sum + arr.length, 0);
  const queryTerms = useMemo(() => extractQueryTerms([query]), [query]);

  const canPreview = file.extractionStatus === FileExtractionStatus.SUCCESS && Boolean(mimeType);
  const isPending = file.extractionStatus === FileExtractionStatus.PENDING_REINDEX;

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex items-center gap-2 text-[13px] font-medium text-foreground">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="truncate">{file.fileName}</span>
        <span
          className="ml-auto font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground"
          aria-label={t('common:documents_match_count', { count: totalSnippets })}
        >
          {totalSnippets}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5 pl-6">
        {fields.map(([field, snippets]) =>
          snippets.map((snippet, i) => (
            <li key={`${field}-${i}`} className="flex gap-2 text-sm leading-relaxed">
              {FIELD_LABEL_KEYS[field] && (
                <span className="mt-0.5 shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  {t(FIELD_LABEL_KEYS[field])}
                </span>
              )}
              <HighlightSnippet text={snippet} className="min-w-0 text-muted-foreground" />
            </li>
          ))
        )}
      </ul>

      {(canPreview || isPending) && (
        <div className="flex items-center gap-2 pl-6">
          {canPreview && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              {t('common:documents_match_preview')}
            </Button>
          )}
          {isPending && (
            <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-[0.08em]">
              {t('common:documents_match_preview_pending')}
            </Badge>
          )}
        </div>
      )}

      {canPreview && previewOpen && (
        <FilePreviewSheet
          file={file}
          mimeType={mimeType}
          registrationNumber={registrationNumber}
          revision={revision}
          queryTerms={queryTerms}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      )}
    </div>
  );
}
