'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface PdfPageViewerProps {
  fileName: string;
  fetchBlob: () => Promise<Blob>;
  page: number | null;
  labels: {
    loading: string;
    error: string;
  };
}

// Native PDF viewers (Chrome/Edge/Safari) honour these hash params. The
// hidden toolbar + view-fit settings match how the existing FilePreview
// renders PDFs, so users see the same chrome whether they open from detail
// or search.
const pdfHash = (page: number | null) => {
  const parts = ['toolbar=0', 'navpanes=0', 'scrollbar=1', 'view=FitH'];
  if (typeof page === 'number' && page > 0) parts.unshift(`page=${page}`);
  return parts.join('&');
};

export function PdfPageViewer({ fileName, fetchBlob, page, labels }: PdfPageViewerProps) {
  const [state, setState] = useState<{ url: string | null; loading: boolean; error: boolean }>({
    url: null,
    loading: true,
    error: false,
  });
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | undefined;

    fetchBlob()
      .then((blob) => {
        if (cancelled) return;
        createdUrl = URL.createObjectURL(blob);
        setState({ url: createdUrl, loading: false, error: false });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ url: null, loading: false, error: true });
      });

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [fetchBlob]);

  useEffect(() => {
    if (!state.url || !iframeRef.current) return;
    // Re-assigning src with only the hash changed triggers a fresh page seek
    // in the native viewer; on Chromium the PDF itself is served from the
    // same blob URL and stays cached, so the user sees the jump rather than
    // a full reload.
    iframeRef.current.src = `${state.url}#${pdfHash(page)}`;
  }, [state.url, page]);

  if (state.loading) {
    return (
      <div className="flex h-full min-h-64 w-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>{labels.loading}</span>
      </div>
    );
  }
  if (state.error || !state.url) {
    return (
      <div className="flex h-full min-h-64 w-full items-center justify-center gap-2 text-sm text-destructive">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        <span>{labels.error}</span>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      title={fileName}
      className="h-full min-h-[70vh] w-full rounded-md border border-border bg-muted"
    />
  );
}
