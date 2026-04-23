'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { cn } from '@lib/utils';

// Webpack turns this into an asset import at build time, bundling the worker
// beside the main chunk instead of forcing consumers to drop it in /public.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const MAX_PAGE_WIDTH = 1100;

export interface PdfPreviewLabels {
  loading: string;
  error: string;
}

export interface PdfPreviewProps {
  fileName: string;
  fetchBlob: () => Promise<Blob>;
  nativeUrl?: string;
  /** 1-based page to scroll into view whenever it changes. Null = leave scroll alone. */
  page?: number | null;
  className?: string;
  labels: PdfPreviewLabels;
}

const LoadingState = ({ label }: { label: string }) => (
  <div className="flex h-full min-h-64 w-full items-center justify-center gap-2 text-sm text-muted-foreground">
    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
    <span>{label}</span>
  </div>
);

const ErrorState = ({ label }: { label: string }) => (
  <div className="flex h-full min-h-64 w-full items-center justify-center gap-2 text-sm text-destructive">
    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
    <span>{label}</span>
  </div>
);

/**
 * Unified PDF renderer. Uses PDF.js (via react-pdf) to paint pages as canvas
 * + a text layer of real DOM nodes — the text layer is what lets the search
 * dialog's HighlightOverlay walk and wrap matches with `<mark>` the same way
 * it does for DOCX/PPTX. An iframe approach would have left us blind to the
 * viewer's internal DOM and unable to highlight at all.
 */
export function PdfPreview({
  fileName,
  fetchBlob,
  nativeUrl,
  page,
  className,
  labels,
}: PdfPreviewProps) {
  // react-pdf reloads the document when `file` identity changes. For native
  // URLs we derive the source directly; for blob-backed previews we fetch
  // lazily and swap it in via state.
  const [fetchedBlob, setFetchedBlob] = useState<{ data: Blob | null; error: boolean }>({
    data: null,
    error: false,
  });
  const [numPages, setNumPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (nativeUrl) return;
    let cancelled = false;
    fetchBlob()
      .then((blob) => {
        if (cancelled) return;
        setFetchedBlob({ data: blob, error: false });
      })
      .catch(() => {
        if (cancelled) return;
        setFetchedBlob({ data: null, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [nativeUrl, fetchBlob]);

  const source: { data: Blob | string | null; error: boolean } = nativeUrl
    ? { data: nativeUrl, error: false }
    : fetchedBlob;

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!page || !containerRef.current) return;
    const target = containerRef.current.querySelector<HTMLElement>(`[data-pdf-page="${page}"]`);
    if (!target) return;
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
  }, [page, numPages]);

  const documentOptions = useMemo(
    // Pinning these across renders avoids react-pdf re-parsing the PDF
    // every time a parent rerender produces a new props object.
    () => ({}),
    []
  );

  const pageWidth = containerWidth
    ? Math.min(Math.max(containerWidth - 16, 240), MAX_PAGE_WIDTH)
    : undefined;
  const pages = useMemo(() => Array.from({ length: numPages }, (_, i) => i + 1), [numPages]);

  if (source.error) return <ErrorState label={labels.error} />;
  if (!source.data) return <LoadingState label={labels.loading} />;

  return (
    <div
      ref={containerRef}
      aria-label={fileName}
      className={cn(
        'h-full max-h-[70vh] w-full overflow-auto rounded-md border border-border bg-muted',
        className
      )}
    >
      <Document
        file={source.data}
        options={documentOptions}
        loading={<LoadingState label={labels.loading} />}
        error={<ErrorState label={labels.error} />}
        onLoadSuccess={({ numPages: n }) => setNumPages(n)}
        onLoadError={() => setFetchedBlob({ data: null, error: true })}
      >
        {pages.map((pageNo) => (
          <div key={pageNo} data-pdf-page={pageNo} className="mx-auto my-2 w-fit shadow-sm">
            <Page
              pageNumber={pageNo}
              width={pageWidth}
              renderTextLayer
              renderAnnotationLayer={false}
              loading={<div className="h-[60vh] w-full bg-card" />}
            />
          </div>
        ))}
      </Document>
    </div>
  );
}
