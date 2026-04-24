'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { HighlightSnippet } from './highlight-snippet';
import { extractQueryTerms, FilePreviewDialog } from './file-preview-dialog';
import { useDocumentStore } from '@stores/document-store';
import { FileExtractionStatus, type FileMatch } from '@interfaces/document.interface';

interface FileMatchBlockProps {
  file: FileMatch;
  registrationNumber: string;
  revision: number;
  mimeType: string;
}

interface Snippet {
  field: string;
  text: string;
  /** Sequential number for `extractedText` snippets, null for one-off fields. */
  excerptIndex: number | null;
}

const FIELD_ORDER: readonly string[] = ['title', 'description', 'fileName', 'extractedText'];

const FIELD_LABEL_KEYS: Record<string, string> = {
  title: 'common:documents_match_field_title',
  description: 'common:documents_match_field_description',
  fileName: 'common:documents_match_field_filename',
};

// How many snippets to show before collapsing the rest behind a toggle. Three
// lets the most informative fields (title, description, extractedText) each
// be represented on at least one row for the common case where ES returns
// highlights across multiple fields — the `FIELD_ORDER` sort above makes sure
// that "which field matched" is preserved even after the cap.
const DEFAULT_SNIPPET_CAP = 3;

const flattenSnippets = (highlights: FileMatch['highlights']): Snippet[] => {
  const entries = Object.entries(highlights ?? {}).sort(([a], [b]) => {
    const ai = FIELD_ORDER.indexOf(a);
    const bi = FIELD_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  let excerptCount = 0;
  return entries.flatMap(([field, arr]) =>
    arr.map((text) => {
      const isExcerpt = field === 'extractedText';
      return {
        field,
        text,
        excerptIndex: isExcerpt ? ++excerptCount : null,
      };
    })
  );
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
  const [expanded, setExpanded] = useState(false);

  const snippets = useMemo(() => flattenSnippets(file.highlights), [file.highlights]);
  const totalSnippets = snippets.length;
  const hiddenCount = Math.max(0, totalSnippets - DEFAULT_SNIPPET_CAP);
  const visibleSnippets = expanded ? snippets : snippets.slice(0, DEFAULT_SNIPPET_CAP);
  const queryTerms = useMemo(() => extractQueryTerms([query]), [query]);

  const canPreview = file.extractionStatus === FileExtractionStatus.SUCCESS && Boolean(mimeType);
  const isPending = file.extractionStatus === FileExtractionStatus.PENDING_REINDEX;

  return (
    <div className="flex min-w-0 flex-col gap-2 py-3">
      <div className="flex items-center gap-2 text-[13px] font-medium text-foreground">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 break-words sm:truncate">{file.fileName}</span>
        <span
          className="ml-auto font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground"
          aria-label={t('common:documents_match_count', { count: totalSnippets })}
        >
          {totalSnippets}
        </span>
      </div>
      <ul className="flex min-w-0 flex-col gap-2 pl-0 sm:pl-6">
        {visibleSnippets.map((snippet, i) => {
          const label =
            snippet.excerptIndex !== null
              ? t('common:documents_match_field_excerpt', { index: snippet.excerptIndex })
              : FIELD_LABEL_KEYS[snippet.field]
                ? t(FIELD_LABEL_KEYS[snippet.field])
                : null;
          return (
            <li
              key={`${snippet.field}-${i}`}
              className="flex min-w-0 flex-col gap-1.5 rounded-md border border-border bg-muted px-3 py-2.5 text-sm leading-relaxed shadow-xs sm:flex-row sm:gap-3"
            >
              {label && (
                <span className="mt-0.5 shrink-0 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  {label}
                </span>
              )}
              <HighlightSnippet
                text={snippet.text}
                className="min-w-0 break-words text-muted-foreground"
              />
            </li>
          );
        })}
      </ul>

      {(canPreview || isPending || hiddenCount > 0) && (
        <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-6">
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
          {hiddenCount > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 text-xs"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              {expanded ? (
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {expanded
                ? t('common:documents_match_show_less')
                : t('common:documents_match_show_all', { count: totalSnippets })}
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
        <FilePreviewDialog
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
