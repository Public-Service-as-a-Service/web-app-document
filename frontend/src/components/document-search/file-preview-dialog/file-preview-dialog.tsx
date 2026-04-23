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
import type { FileMatch, FileMatchPosition } from '@interfaces/document.interface';
import { FileExtractionStatus } from '@interfaces/document.interface';
import { HighlightOverlay } from './highlight-overlay';
import { MatchToolbar, type MatchToolbarLabels } from './match-toolbar';
import { PdfPageViewer } from './pdf-page-viewer';
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

const isPdf = (mimeType: string, fileName: string) =>
  mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

interface PagedMeta {
  pagesWithMatches: number[];
  matchesByPage: Map<number, FileMatchPosition[]>;
  currentPage: number | null;
}

const emptyPagedMeta: PagedMeta = {
  pagesWithMatches: [],
  matchesByPage: new Map(),
  currentPage: null,
};

const derivePagedMeta = (matches: FileMatchPosition[], currentIndex: number): PagedMeta => {
  const pages = new Set<number>();
  const byPage = new Map<number, FileMatchPosition[]>();
  for (const m of matches) {
    if (typeof m.page !== 'number') continue;
    pages.add(m.page);
    const bucket = byPage.get(m.page);
    if (bucket) bucket.push(m);
    else byPage.set(m.page, [m]);
  }
  return {
    pagesWithMatches: [...pages].sort((a, b) => a - b),
    matchesByPage: byPage,
    currentPage: matches[currentIndex]?.page ?? null,
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
  const pdf = isPdf(mimeType, file.fileName);
  const paged = pdf || file.pageCount !== null;

  // Two distinct sources of truth depending on renderer:
  //   - PDF: backend match positions (we can't see into the native viewer's
  //     DOM, so we drive navigation by page number instead of highlight).
  //   - Everything else: the count of <mark> nodes HighlightOverlay actually
  //     produced against the rendered HTML. Tika's extracted text diverges
  //     from docx-preview/pptx output often enough that reusing backend
  //     indexes would jump to phantom hits.
  const [domMarkCount, setDomMarkCount] = useState(0);
  const total = pdf ? file.matches.length : domMarkCount;

  const { currentIndex, next, prev, goTo } = usePreviewNavigation(total);

  const pagedMeta = useMemo<PagedMeta>(
    () => (pdf ? derivePagedMeta(file.matches, currentIndex) : emptyPagedMeta),
    [pdf, file.matches, currentIndex]
  );

  const fetchBlob = useCallback(async () => {
    const url = `documents/${encodeURIComponent(registrationNumber)}/revisions/${revision}/files/${file.id}`;
    const res = await apiService.getBlob(url);
    return res.data as Blob;
  }, [registrationNumber, revision, file.id]);

  const jumpToPage = useCallback(
    (page: number) => {
      const firstOnPage = file.matches.findIndex((m) => m.page === page);
      if (firstOnPage >= 0) goTo(firstOnPage);
    },
    [file.matches, goTo]
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

  const pdfLabels = useMemo(
    () => ({
      loading: t('common:document_files_preview_loading'),
      error: t('common:document_files_preview_error'),
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
      <DialogContent className="flex h-[min(92vh,1000px)] w-[min(96vw,1400px)] max-w-none flex-col gap-0 p-0 sm:max-w-none">
        <DialogHeader className="border-b border-border/70 p-4 pr-12">
          <DialogTitle className="truncate text-base" title={file.fileName}>
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
            matchesByPage={pagedMeta.matchesByPage}
            currentPage={pagedMeta.currentPage}
            onSelectPage={jumpToPage}
            labels={toolbarLabels}
          />
        )}
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {pdf ? (
            <PdfPageViewer
              fileName={file.fileName}
              fetchBlob={fetchBlob}
              page={pagedMeta.currentPage}
              searchTerms={queryTerms}
              labels={pdfLabels}
            />
          ) : (
            <HighlightOverlay
              terms={queryTerms}
              activeIndex={currentIndex}
              onMatchCount={setDomMarkCount}
            >
              <FilePreview
                key={file.id}
                fileName={file.fileName}
                mimeType={mimeType}
                fetchBlob={fetchBlob}
                labels={filePreviewLabels}
              />
            </HighlightOverlay>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
