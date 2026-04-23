'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@components/ui/sheet';
import { apiService } from '@services/api-service';
import { cn } from '@lib/utils';
import type { FileMatch } from '@interfaces/document.interface';
import { FileExtractionStatus } from '@interfaces/document.interface';
import { HighlightOverlay } from './highlight-overlay';
import { MatchNavigator, type MatchNavigatorLabels } from './match-navigator';
import { PdfPageViewer } from './pdf-page-viewer';
import { usePreviewNavigation } from './use-preview-navigation';

const FilePreview = dynamic(() => import('@components/file-preview/file-preview'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
    </div>
  ),
});

interface FilePreviewSheetProps {
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

export function FilePreviewSheet({
  file,
  mimeType,
  registrationNumber,
  revision,
  queryTerms,
  open,
  onOpenChange,
}: FilePreviewSheetProps) {
  const { t } = useTranslation();
  const nav = usePreviewNavigation(file.matches);

  const fetchBlob = useCallback(async () => {
    const url = `documents/${encodeURIComponent(registrationNumber)}/revisions/${revision}/files/${file.id}`;
    const res = await apiService.getBlob(url);
    return res.data as Blob;
  }, [registrationNumber, revision, file.id]);

  const pdf = isPdf(mimeType, file.fileName);
  const paged = pdf || file.pageCount !== null;

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
        nav.next();
      } else if (e.key === 'p' || e.key === 'k') {
        e.preventDefault();
        nav.prev();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, nav]);

  const navigatorLabels: MatchNavigatorLabels = useMemo(
    () => ({
      heading: t('common:documents_preview_matches_heading'),
      pagedSummary: (matchCount, pageCount) =>
        t('common:documents_preview_matches_paged', {
          count: matchCount,
          matches: matchCount,
          pages: pageCount,
        }),
      flatSummary: (matchCount) =>
        t('common:documents_preview_matches_flat', { count: matchCount }),
      pageLabel: (page) => t('common:documents_preview_page_label', { page }),
      positionLabel: (current, total) => t('common:documents_preview_position', { current, total }),
      empty: t('common:documents_preview_no_matches'),
      prev: t('common:documents_preview_prev'),
      next: t('common:documents_preview_next'),
      gotoMatch: (index, page) =>
        page !== null
          ? t('common:documents_preview_goto_with_page', { index, page })
          : t('common:documents_preview_goto', { index }),
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
  // offer highlight navigation.
  const showNavigator =
    file.matches.length > 0 || file.extractionStatus === FileExtractionStatus.PENDING_REINDEX;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[min(92vw,1200px)]"
      >
        <SheetHeader className="border-b border-border/70 p-4">
          <SheetTitle className="truncate text-base" title={file.fileName}>
            {file.fileName}
          </SheetTitle>
          <SheetDescription className="truncate font-mono text-xs text-muted-foreground">
            {mimeType}
          </SheetDescription>
          {pdf && file.matches.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {t('common:documents_preview_pdf_highlight_note')}
            </p>
          )}
        </SheetHeader>
        <div
          className={cn(
            'grid min-h-0 flex-1 grid-cols-1 gap-0',
            showNavigator && 'md:grid-cols-[minmax(260px,320px)_1fr]'
          )}
        >
          {showNavigator && (
            <aside
              className="border-b border-border/70 bg-muted/30 p-4 md:border-b-0 md:border-r md:max-h-none max-h-64 md:overflow-hidden overflow-y-auto"
              aria-label={t('common:documents_preview_matches_heading')}
            >
              <MatchNavigator
                matches={file.matches}
                pagesWithMatches={nav.pagesWithMatches}
                matchesByPage={nav.matchesByPage}
                currentIndex={nav.currentIndex}
                onSelect={nav.goTo}
                onPrev={nav.prev}
                onNext={nav.next}
                paged={paged}
                labels={navigatorLabels}
              />
            </aside>
          )}
          <div className="min-h-0 overflow-auto p-4">
            {pdf ? (
              <PdfPageViewer
                fileName={file.fileName}
                fetchBlob={fetchBlob}
                page={nav.currentPage}
                labels={pdfLabels}
              />
            ) : (
              <HighlightOverlay terms={queryTerms} activeIndex={nav.currentIndex}>
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
