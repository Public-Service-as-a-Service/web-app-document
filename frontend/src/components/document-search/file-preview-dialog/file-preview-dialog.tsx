'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { apiService } from '@services/api-service';
import type { FileMatch } from '@interfaces/document.interface';
import { FileExtractionStatus } from '@interfaces/document.interface';
import { HighlightOverlay, type MarkMetadata } from './highlight-overlay';
import { MatchToolbar, type MatchToolbarLabels } from './match-toolbar';
import { usePreviewNavigation } from './use-preview-navigation';

const FilePreview = dynamic(() => import('@components/file-preview/file-preview'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
    </div>
  ),
});

interface FilePreviewDialogProps {
  file: FileMatch;
  mimeType: string;
  registrationNumber: string;
  revision: number;
  queryTerms: readonly string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PagedMeta {
  pagesWithMatches: number[];
  countsByPage: Map<number, number>;
  currentPage: number | null;
}

const derivePagedMeta = (marks: MarkMetadata[], currentIndex: number): PagedMeta => {
  const counts = new Map<number, number>();
  for (const mark of marks) {
    if (mark.page === null) continue;
    counts.set(mark.page, (counts.get(mark.page) ?? 0) + 1);
  }
  return {
    pagesWithMatches: [...counts.keys()].sort((a, b) => a - b),
    countsByPage: counts,
    currentPage: marks[currentIndex]?.page ?? null,
  };
};

export function FilePreviewDialog({
  file,
  mimeType,
  registrationNumber,
  revision,
  queryTerms,
  open,
  onOpenChange,
}: FilePreviewDialogProps) {
  const { t } = useTranslation();

  // Single source of truth for both match count and per-match page metadata:
  // the actual DOM marks HighlightOverlay produced. PDFs expose a page number
  // via `data-pdf-page` on the react-pdf page wrapper; DOCX and friends just
  // report null and the page-select dropdown stays hidden.
  const [marks, setMarks] = useState<MarkMetadata[]>([]);
  const total = marks.length;

  const { currentIndex, next, prev, goTo } = usePreviewNavigation(total);

  const pagedMeta = useMemo(() => derivePagedMeta(marks, currentIndex), [marks, currentIndex]);
  const paged = pagedMeta.pagesWithMatches.length > 0;

  const fetchBlob = useCallback(async () => {
    const url = `documents/${encodeURIComponent(registrationNumber)}/revisions/${revision}/files/${file.id}`;
    const res = await apiService.getBlob(url);
    return res.data as Blob;
  }, [registrationNumber, revision, file.id]);

  const jumpToPage = useCallback(
    (page: number) => {
      const firstOnPage = marks.findIndex((m) => m.page === page);
      if (firstOnPage >= 0) goTo(firstOnPage);
    },
    [marks, goTo]
  );

  // j / k / n / p match GitHub + Gov.uk search conventions. Arrow keys are
  // avoided because they conflict with the PDF viewer's own scroll bindings.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;
      if (e.key === 'n' || e.key === 'j') {
        e.preventDefault();
        next();
      } else if (e.key === 'p' || e.key === 'k') {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, next, prev]);

  const toolbarLabels: MatchToolbarLabels = useMemo(
    () => ({
      positionLabel: (current, totalCount) =>
        t('common:documents_preview_position', { current, total: totalCount }),
      pageOptionLabel: (page, count) => t('common:documents_preview_page_option', { page, count }),
      prev: t('common:documents_preview_prev'),
      next: t('common:documents_preview_next'),
      empty: t('common:documents_preview_no_matches'),
      pageSelectLabel: t('common:documents_preview_page_select'),
    }),
    [t]
  );

  const filePreviewLabels = useMemo(
    () => ({
      loading: t('common:document_files_preview_loading'),
      error: t('common:document_files_preview_error'),
      unsupported: t('common:document_files_preview_unsupported'),
      pptxFidelityWarning: t('common:document_files_preview_pptx_warning'),
    }),
    [t]
  );

  // Legacy rows indexed before the page-offset backfill won't have any matches
  // even on a successful extraction. The preview still works — we just can't
  // offer highlight navigation, so only render the toolbar when there's
  // something to navigate or the backfill is still pending.
  const showToolbar = total > 0 || file.extractionStatus === FileExtractionStatus.PENDING_REINDEX;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-6xl gap-4 overflow-hidden sm:max-w-6xl">
        <DialogHeader className="pr-10">
          <DialogTitle className="truncate" title={file.fileName}>
            {file.fileName}
          </DialogTitle>
          <DialogDescription className="truncate font-mono text-xs text-muted-foreground">
            {mimeType}
          </DialogDescription>
        </DialogHeader>
        {showToolbar && (
          <MatchToolbar
            total={total}
            currentIndex={currentIndex}
            onPrev={prev}
            onNext={next}
            paged={paged}
            pagesWithMatches={pagedMeta.pagesWithMatches}
            countsByPage={pagedMeta.countsByPage}
            currentPage={pagedMeta.currentPage}
            onSelectPage={jumpToPage}
            labels={toolbarLabels}
          />
        )}
        <HighlightOverlay terms={queryTerms} activeIndex={currentIndex} onMarks={setMarks}>
          <FilePreview
            key={file.id}
            fileName={file.fileName}
            mimeType={mimeType}
            fetchBlob={fetchBlob}
            labels={filePreviewLabels}
          />
        </HighlightOverlay>
      </DialogContent>
    </Dialog>
  );
}
