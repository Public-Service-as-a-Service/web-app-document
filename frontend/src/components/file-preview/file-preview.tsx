'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@components/ui/alert';
import { cn } from '@lib/utils';
import { PdfPreview } from './pdf-preview';

export type FilePreviewLabels = {
  loading: string;
  error: string;
  unsupported: string;
  pptxFidelityWarning?: string;
};

export interface FilePreviewProps {
  fileName: string;
  mimeType: string;
  nativeUrl?: string;
  fetchBlob: () => Promise<Blob>;
  labels: FilePreviewLabels;
  className?: string;
  /** PDF-only: 1-based page to scroll into view. Ignored for other formats. */
  pdfPage?: number | null;
}

type RendererKind =
  | 'pdf'
  | 'image'
  | 'video'
  | 'audio'
  | 'text'
  | 'markdown'
  | 'csv'
  | 'docx'
  | 'xlsx'
  | 'pptx'
  | 'unsupported';

const MARKDOWN_MIME_TYPES = new Set(['text/markdown', 'text/x-markdown']);
const TEXT_LIKE_MIME_TYPES = new Set(['application/json', 'application/xml', 'text/xml']);

const resolveRenderer = (mimeType: string, fileName: string): RendererKind => {
  if (!mimeType) return 'unsupported';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';

  const lowerName = fileName.toLowerCase();
  if (MARKDOWN_MIME_TYPES.has(mimeType) || lowerName.endsWith('.md')) return 'markdown';
  if (mimeType === 'text/csv' || lowerName.endsWith('.csv')) return 'csv';

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword' ||
    lowerName.endsWith('.docx')
  ) {
    return 'docx';
  }
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    lowerName.endsWith('.xlsx')
  ) {
    return 'xlsx';
  }
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    mimeType === 'application/vnd.ms-powerpoint' ||
    lowerName.endsWith('.pptx')
  ) {
    return 'pptx';
  }

  if (mimeType.startsWith('text/') || TEXT_LIKE_MIME_TYPES.has(mimeType)) return 'text';
  return 'unsupported';
};

const Spinner = ({ label }: { label: string }) => (
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

const UnsupportedState = ({ label }: { label: string }) => (
  <div className="flex h-full min-h-64 w-full items-center justify-center rounded-md border border-dashed p-6 text-sm text-muted-foreground">
    {label}
  </div>
);

const InfoAlert = ({ label }: { label: string }) => (
  <Alert variant="info">
    <Info />
    <AlertDescription>{label}</AlertDescription>
  </Alert>
);

const FilePreview = ({
  fileName,
  mimeType,
  nativeUrl,
  fetchBlob,
  labels,
  className,
  pdfPage,
}: FilePreviewProps) => {
  const renderer = useMemo(() => resolveRenderer(mimeType, fileName), [mimeType, fileName]);

  return (
    <div className={cn('h-full w-full', className)}>
      {renderer === 'pdf' && (
        <PdfPreview
          fileName={fileName}
          nativeUrl={nativeUrl}
          fetchBlob={fetchBlob}
          page={pdfPage}
          labels={labels}
        />
      )}
      {renderer === 'image' && (
        <NativePreview
          kind="image"
          fileName={fileName}
          nativeUrl={nativeUrl}
          fetchBlob={fetchBlob}
          labels={labels}
        />
      )}
      {renderer === 'video' && (
        <NativePreview
          kind="video"
          fileName={fileName}
          nativeUrl={nativeUrl}
          fetchBlob={fetchBlob}
          labels={labels}
        />
      )}
      {renderer === 'audio' && (
        <NativePreview
          kind="audio"
          fileName={fileName}
          nativeUrl={nativeUrl}
          fetchBlob={fetchBlob}
          labels={labels}
        />
      )}
      {renderer === 'text' && <TextPreview fetchBlob={fetchBlob} labels={labels} />}
      {renderer === 'markdown' && <MarkdownPreview fetchBlob={fetchBlob} labels={labels} />}
      {renderer === 'csv' && <CsvPreview fetchBlob={fetchBlob} labels={labels} />}
      {renderer === 'docx' && <DocxPreview fetchBlob={fetchBlob} labels={labels} />}
      {renderer === 'xlsx' && <XlsxPreview fetchBlob={fetchBlob} labels={labels} />}
      {renderer === 'pptx' && <PptxPreview fetchBlob={fetchBlob} labels={labels} />}
      {renderer === 'unsupported' && <UnsupportedState label={labels.unsupported} />}
    </div>
  );
};

export default FilePreview;

const useObjectUrl = (nativeUrl: string | undefined, fetchBlob: () => Promise<Blob>) => {
  const [state, setState] = useState<{ url?: string; loading: boolean; error: boolean }>({
    loading: !nativeUrl,
    error: false,
  });

  useEffect(() => {
    if (nativeUrl) return;

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
        setState({ loading: false, error: true });
      });

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [nativeUrl, fetchBlob]);

  if (nativeUrl) return { url: nativeUrl, loading: false, error: false };
  return state;
};

const NativePreview = ({
  kind,
  fileName,
  nativeUrl,
  fetchBlob,
  labels,
}: {
  kind: 'image' | 'video' | 'audio';
  fileName: string;
  nativeUrl?: string;
  fetchBlob: () => Promise<Blob>;
  labels: FilePreviewLabels;
}) => {
  const { url, loading, error } = useObjectUrl(nativeUrl, fetchBlob);

  if (loading) return <Spinner label={labels.loading} />;
  if (error || !url) return <ErrorState label={labels.error} />;

  if (kind === 'image') {
    return (
      <div className="flex h-full w-full items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={fileName}
          className="max-h-[70vh] w-auto max-w-full rounded-md border border-border object-contain"
        />
      </div>
    );
  }
  if (kind === 'video') {
    return (
      <video controls src={url} className="max-h-[70vh] w-full rounded-md border border-border" />
    );
  }
  return <audio controls src={url} className="w-full" />;
};

const useBlobText = (fetchBlob: () => Promise<Blob>) => {
  const [state, setState] = useState<{ text: string; loading: boolean; error: boolean }>({
    text: '',
    loading: true,
    error: false,
  });

  useEffect(() => {
    let cancelled = false;
    fetchBlob()
      .then((blob) => blob.text())
      .then((content) => {
        if (cancelled) return;
        setState({ text: content, loading: false, error: false });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ text: '', loading: false, error: true });
      });

    return () => {
      cancelled = true;
    };
  }, [fetchBlob]);

  return state;
};

const useBlobArrayBuffer = (fetchBlob: () => Promise<Blob>) => {
  const [state, setState] = useState<{
    buffer: ArrayBuffer | null;
    loading: boolean;
    error: boolean;
  }>({ buffer: null, loading: true, error: false });

  useEffect(() => {
    let cancelled = false;
    fetchBlob()
      .then((blob) => blob.arrayBuffer())
      .then((ab) => {
        if (cancelled) return;
        setState({ buffer: ab, loading: false, error: false });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ buffer: null, loading: false, error: true });
      });

    return () => {
      cancelled = true;
    };
  }, [fetchBlob]);

  return state;
};

const TextPreview = ({
  fetchBlob,
  labels,
}: {
  fetchBlob: () => Promise<Blob>;
  labels: FilePreviewLabels;
}) => {
  const { text, loading, error } = useBlobText(fetchBlob);
  if (loading) return <Spinner label={labels.loading} />;
  if (error) return <ErrorState label={labels.error} />;
  return (
    <pre className="h-full max-h-[70vh] w-full overflow-auto rounded-md border border-border bg-muted p-4 text-sm whitespace-pre-wrap break-words">
      {text}
    </pre>
  );
};

const MarkdownPreview = ({
  fetchBlob,
  labels,
}: {
  fetchBlob: () => Promise<Blob>;
  labels: FilePreviewLabels;
}) => {
  const { text, loading, error } = useBlobText(fetchBlob);
  const [parseState, setParseState] = useState<{
    html: string;
    parsing: boolean;
    parseError: boolean;
  }>({ html: '', parsing: false, parseError: false });

  useEffect(() => {
    if (!text) return;
    let cancelled = false;
    import('marked')
      .then(({ marked }) => {
        if (cancelled) return;
        const parsed = marked.parse(text, { async: false }) as string;
        setParseState({ html: parsed, parsing: false, parseError: false });
      })
      .catch(() => {
        if (cancelled) return;
        setParseState({ html: '', parsing: false, parseError: true });
      });
    return () => {
      cancelled = true;
    };
  }, [text]);

  if (loading || parseState.parsing) return <Spinner label={labels.loading} />;
  if (error || parseState.parseError) return <ErrorState label={labels.error} />;
  return (
    <div
      className="prose prose-sm dark:prose-invert h-full max-h-[70vh] w-full max-w-none overflow-auto rounded-md border border-border bg-card p-6"
      dangerouslySetInnerHTML={{ __html: parseState.html }}
    />
  );
};

const CsvPreview = ({
  fetchBlob,
  labels,
}: {
  fetchBlob: () => Promise<Blob>;
  labels: FilePreviewLabels;
}) => {
  const { buffer, loading, error } = useBlobArrayBuffer(fetchBlob);
  const [parseState, setParseState] = useState<{
    html: string;
    parsing: boolean;
    parseError: boolean;
  }>({ html: '', parsing: false, parseError: false });

  useEffect(() => {
    if (!buffer) return;
    let cancelled = false;
    import('xlsx')
      .then((XLSX) => {
        if (cancelled) return;
        const wb = XLSX.read(buffer, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const table = XLSX.utils.sheet_to_html(sheet);
        setParseState({ html: table, parsing: false, parseError: false });
      })
      .catch(() => {
        if (cancelled) return;
        setParseState({ html: '', parsing: false, parseError: true });
      });
    return () => {
      cancelled = true;
    };
  }, [buffer]);

  if (loading || parseState.parsing) return <Spinner label={labels.loading} />;
  if (error || parseState.parseError) return <ErrorState label={labels.error} />;
  return (
    <div
      className="h-full max-h-[70vh] w-full overflow-auto rounded-md border border-border bg-card p-4 text-sm [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1"
      dangerouslySetInnerHTML={{ __html: parseState.html }}
    />
  );
};

const XlsxPreview = CsvPreview;

const DocxPreview = ({
  fetchBlob,
  labels,
}: {
  fetchBlob: () => Promise<Blob>;
  labels: FilePreviewLabels;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [blob, docx] = await Promise.all([fetchBlob(), import('docx-preview')]);
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = '';
        await docx.renderAsync(blob, containerRef.current, undefined, {
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
        });
        if (!cancelled) setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchBlob]);

  return (
    <div className="relative h-full w-full">
      {status === 'loading' && <Spinner label={labels.loading} />}
      {status === 'error' && <ErrorState label={labels.error} />}
      <div
        ref={containerRef}
        className={cn(
          'h-full max-h-[70vh] w-full overflow-auto rounded-md border border-border bg-white p-4 text-black',
          status !== 'ready' && 'hidden'
        )}
      />
    </div>
  );
};

const PptxPreview = ({
  fetchBlob,
  labels,
}: {
  fetchBlob: () => Promise<Blob>;
  labels: FilePreviewLabels;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [blob, pptxMod] = await Promise.all([fetchBlob(), import('pptx-preview')]);
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = '';
        const ab = await blob.arrayBuffer();
        const { init } = pptxMod as unknown as {
          init: (
            el: HTMLElement,
            opts: { width: number; height: number }
          ) => { preview: (buf: ArrayBuffer) => Promise<void> };
        };

        // pptx-preview needs real pixel dimensions. When the effect first runs
        // inside a modal that just opened, layout isn't settled yet and
        // clientWidth can be 0 — which renders a blank/black slide. Wait one
        // frame before measuring.
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        if (cancelled || !containerRef.current) return;

        // Render at the container's available width (capped) so the slide
        // never overflows and forces horizontal scroll. Fall back to 960 if
        // the container hasn't laid out yet.
        const available = containerRef.current.clientWidth;
        const width = Math.min(available || 960, 1200);
        const height = Math.round((width * 9) / 16);
        const pptx = init(containerRef.current, { width, height });
        await pptx.preview(ab);
        if (!cancelled) setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchBlob]);

  return (
    <div className="space-y-3">
      {labels.pptxFidelityWarning && status !== 'error' && (
        <InfoAlert label={labels.pptxFidelityWarning} />
      )}
      <div className="relative min-h-64 w-full">
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner label={labels.loading} />
          </div>
        )}
        {status === 'error' && <ErrorState label={labels.error} />}
        <div
          ref={containerRef}
          className={cn(
            'h-full max-h-[70vh] w-full overflow-auto rounded-md border border-border bg-white',
            status === 'error' && 'hidden'
          )}
        />
      </div>
    </div>
  );
};
