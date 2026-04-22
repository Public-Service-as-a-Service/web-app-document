'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { Button } from '@components/ui/button';
import ThemeToggle from '@components/theme-toggle/theme-toggle';
import { useTenant } from '@components/tenant-provider/tenant-provider';
import FilePreview from '@components/file-preview/file-preview';
import { cn } from '@lib/utils';
import { toDisplayRevision } from '@utils/document-revision';
import { friendlyMetadataLabel, visibleMetadata } from '@utils/document-metadata';
import { Check, Copy, Download, Eye, FileArchive, FileText } from 'lucide-react';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import type { PublicDocumentFile, PublicDocumentResponse } from '../public-document-api';

type PublicDocumentLabels = {
  document: string;
  latest: string;
  files: string;
  metadata: string;
  downloadAll: string;
  downloadFile: string;
  preview: string;
  previewTitle: string;
  noFiles: string;
  noPreview: string;
  unsupportedPreview: string;
  validFrom: string;
  validTo: string;
  validOpenEnded: string;
  type: string;
  revision: string;
  registrationNumber: string;
  previewLoading: string;
  previewError: string;
  pptxFidelityWarning: string;
  headerSubtitle: string;
  published: string;
  historical: string;
  historicalMessage: string;
  viewLatest: string;
  cite: string;
  citationTemplate: string;
  copyLink: string;
  copied: string;
  officialNotice: string;
};

interface PublicDocumentViewProps {
  document: PublicDocumentResponse;
  labels: PublicDocumentLabels;
  isHistorical?: boolean;
  latestUrl?: string;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const interpolate = (template: string, values: Record<string, string>) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? '');

const PublicHeader = ({ subtitle }: { subtitle: string }) => {
  const tenant = useTenant();

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-4 py-5 sm:px-8 sm:py-6">
        <Link href="/" className="inline-flex min-w-0 items-center gap-3 no-underline">
          <span
            role="img"
            aria-label={tenant.logo.alt}
            className="block shrink-0 bg-foreground"
            style={{
              width: tenant.logo.width,
              height: tenant.logo.height,
              maskImage: `url(${tenant.logo.src})`,
              maskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskImage: `url(${tenant.logo.src})`,
              WebkitMaskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
            }}
          />
          <span className="min-w-0">
            <span className="block truncate text-[15.5px] font-semibold leading-tight tracking-[-0.01em] text-foreground">
              {tenant.appName}
            </span>
            <span className="mt-0.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              {subtitle}
            </span>
          </span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
};

const HistoricalBanner = ({
  revision,
  date,
  labels,
  latestUrl,
}: {
  revision: number;
  date: string;
  labels: PublicDocumentLabels;
  latestUrl?: string;
}) => {
  return (
    <div role="status" className="border-b border-chart-4/40 bg-chart-4/10">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-8">
        <p className="font-serif text-[14px] leading-[1.55] text-foreground">
          <span className="mr-3 font-mono text-[11px] uppercase tracking-[0.08em] text-chart-4">
            {labels.historical}
          </span>
          {interpolate(labels.historicalMessage, {
            rev: String(toDisplayRevision(revision)),
            date,
          })}
        </p>
        {latestUrl && (
          <Link
            href={latestUrl}
            className="border-b border-border pb-0.5 text-[13.5px] font-medium text-foreground no-underline transition-colors hover:border-foreground"
          >
            {labels.viewLatest}{' '}
            <span className="font-serif" aria-hidden="true">
              →
            </span>
          </Link>
        )}
      </div>
    </div>
  );
};

// Chrome's PDF viewer ignores Cache-Control: no-store and re-fetches the
// URL once the plugin takes over — so rendering a PDF via an iframe to the
// backend route logs two VIEWs per visit. Buffering the PDF client-side
// once and handing the viewer a blob:-URL collapses that to a single
// upstream read. Images/video/audio don't have the double-fetch and keep
// streaming via nativeUrl to avoid holding large media files in memory.
const BUFFER_SIZE_LIMIT = 50 * 1024 * 1024;
const shouldBufferForStats = (file: PublicDocumentFile): boolean =>
  file.mimeType === 'application/pdf' && file.fileSizeInBytes <= BUFFER_SIZE_LIMIT;

const PreviewPane = ({
  file,
  labels,
}: {
  file: PublicDocumentFile | undefined;
  labels: PublicDocumentLabels;
}) => {
  const previewUrl = file?.previewUrl;
  const fetchBlob = useCallback(async () => {
    if (!previewUrl) throw new Error('No preview URL');
    const res = await fetch(previewUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed: ${res.status}`);
    return res.blob();
  }, [previewUrl]);

  if (!file?.previewUrl) {
    return (
      <section
        aria-label={labels.previewTitle}
        className="rounded-md border border-dashed border-border p-6"
      >
        <p className="text-sm text-muted-foreground">{labels.noPreview}</p>
      </section>
    );
  }

  const nativeUrl = shouldBufferForStats(file) ? undefined : file.previewUrl;

  return (
    <section aria-label={labels.previewTitle} className="space-y-3">
      <h2 className="break-words font-serif text-[20px] font-normal leading-[1.2] tracking-[-0.005em] text-foreground">
        {file.fileName}
      </h2>
      <FilePreview
        fileName={file.fileName}
        mimeType={file.mimeType}
        nativeUrl={nativeUrl}
        fetchBlob={fetchBlob}
        labels={{
          loading: labels.previewLoading,
          error: labels.previewError,
          unsupported: labels.unsupportedPreview,
          pptxFidelityWarning: labels.pptxFidelityWarning,
        }}
      />
    </section>
  );
};

const CiteBlock = ({
  document,
  labels,
}: {
  document: PublicDocumentResponse;
  labels: PublicDocumentLabels;
}) => {
  const [copied, setCopied] = useState(false);
  const publishedDate = document.validFrom || document.created;
  const year = publishedDate ? dayjs(publishedDate).format('YYYY') : '';
  const retrieved = dayjs().format('YYYY-MM-DD');

  const citation = interpolate(labels.citationTemplate, {
    year,
    title: document.title || document.description || document.registrationNumber,
    type: document.typeDisplayName || document.type,
    reg: document.registrationNumber,
    rev: String(toDisplayRevision(document.revision)),
    date: retrieved,
  });

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(
        typeof window !== 'undefined' ? window.location.href : citation
      );
      setCopied(true);
      toast.success(labels.copied);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // swallow — toast not critical on public view
    }
  }, [citation, labels.copied]);

  return (
    <section className="rounded-md bg-muted/60 px-5 py-5 sm:px-7 sm:py-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
        {labels.cite}
      </p>
      <p className="mt-2 font-serif text-[15.5px] italic leading-[1.55] text-foreground">
        {citation}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <code className="flex-1 truncate rounded border border-border bg-background px-3 py-2 font-mono text-[12.5px] text-muted-foreground">
          {typeof window !== 'undefined' ? window.location.href : ''}
        </code>
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          {copied ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
          {copied ? labels.copied : labels.copyLink}
        </Button>
      </div>
    </section>
  );
};

const MetaDefinition = ({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) => (
  <>
    <dt className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
      {label}
    </dt>
    <dd className={cn('m-0 text-[14px] text-foreground', mono && 'font-mono tabular-nums')}>
      {value}
    </dd>
  </>
);

const PublicDocumentView = ({
  document,
  labels,
  isHistorical = false,
  latestUrl,
}: PublicDocumentViewProps) => {
  const previewFiles = useMemo(
    () => document.files.filter((file) => file.previewSupported && file.previewUrl),
    [document.files]
  );
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState(previewFiles[0]?.previewUrl);
  const selectedPreviewFile =
    previewFiles.find((file) => file.previewUrl === selectedPreviewUrl) ?? previewFiles[0];
  const showDownloadAll = Boolean(document.downloadAllUrl && document.files.length > 1);

  const typeLabel = document.typeDisplayName || document.type;
  const publishedDate = document.validFrom || document.created;
  const publishedFormatted = publishedDate ? dayjs(publishedDate).format('YYYY-MM-DD') : '—';
  const validToFormatted = document.validTo
    ? dayjs(document.validTo).format('YYYY-MM-DD')
    : labels.validOpenEnded;
  const validFromFormatted = document.validFrom
    ? dayjs(document.validFrom).format('YYYY-MM-DD')
    : '—';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader subtitle={labels.headerSubtitle} />
      {isHistorical && (
        <HistoricalBanner
          revision={document.revision}
          date={publishedFormatted}
          labels={labels}
          latestUrl={latestUrl}
        />
      )}
      <main>
        <div className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-10 sm:px-8 sm:py-14 lg:py-16">
          <section>
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              {typeLabel}{' '}
              <span aria-hidden="true" className="mx-2">
                ·
              </span>{' '}
              <span className="tabular-nums">{document.registrationNumber}</span>
            </p>
            <h1
              title={document.title || undefined}
              className="mt-3 line-clamp-4 break-words font-serif text-[30px] font-normal leading-[1.1] tracking-[-0.015em] text-foreground md:text-[40px] xl:text-[44px]"
              style={{ maxWidth: '28ch' }}
            >
              {document.title || document.registrationNumber}
            </h1>
            {document.description && (
              <p className="mt-4 max-w-[60ch] text-[15.5px] leading-relaxed text-muted-foreground">
                {document.description}
              </p>
            )}
            <dl className="mt-7 flex flex-wrap items-baseline gap-x-7 gap-y-2 border-t border-border pt-4 text-[13.5px]">
              <div className="flex items-baseline gap-2">
                <dt className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                  {labels.revision}
                </dt>
                <dd className="m-0 font-mono tabular-nums text-foreground">
                  {toDisplayRevision(document.revision)}
                </dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                  {labels.published}
                </dt>
                <dd className="m-0 font-mono tabular-nums text-foreground">{publishedFormatted}</dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                  {labels.validTo}
                </dt>
                <dd className="m-0 font-mono tabular-nums text-foreground">{validToFormatted}</dd>
              </div>
            </dl>
          </section>

          <PreviewPane file={selectedPreviewFile} labels={labels} />

          <section className="space-y-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              {labels.files} <span className="tabular-nums">({document.files.length})</span>
            </p>
            {document.files.length === 0 ? (
              <p className="text-sm text-muted-foreground">{labels.noFiles}</p>
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {showDownloadAll && (
                  <li className="flex flex-wrap items-center gap-3 bg-muted/40 px-4 py-4 sm:px-5">
                    <FileArchive className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-[14px] font-medium text-foreground">
                        {labels.downloadAll}
                      </p>
                      <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                        ZIP
                      </p>
                    </div>
                    {/* Plain <a> — Next.js <Link> would prefetch this URL on
                        render, which streams the real files from upstream and
                        inflates download counters. Downloads are not router
                        navigation. */}
                    <Button asChild variant="outline" size="sm">
                      <a href={document.downloadAllUrl!} download>
                        <Download className="h-4 w-4" aria-hidden="true" />
                        {labels.downloadAll}
                      </a>
                    </Button>
                  </li>
                )}
                {document.files.map((file) => {
                  const isSelected = file.previewUrl === selectedPreviewFile?.previewUrl;

                  return (
                    <li
                      key={file.downloadUrl}
                      className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5"
                    >
                      <FileText className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-[14px] font-medium text-foreground">
                          {file.fileName}
                        </p>
                        <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                          {file.mimeType} <span aria-hidden="true">·</span>{' '}
                          {formatFileSize(file.fileSizeInBytes)}
                        </p>
                        {!file.previewSupported && (
                          <p className="mt-1 text-[12.5px] text-muted-foreground">
                            {labels.unsupportedPreview}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {file.previewUrl && (
                          <Button
                            type="button"
                            variant={isSelected ? 'default' : 'secondary'}
                            size="sm"
                            aria-current={isSelected ? 'true' : undefined}
                            className={cn(isSelected && 'pointer-events-none')}
                            onClick={() => setSelectedPreviewUrl(file.previewUrl)}
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                            {labels.preview}
                          </Button>
                        )}
                        <Button asChild variant="outline" size="sm">
                          <a href={file.downloadUrl} download={file.fileName}>
                            <Download className="h-4 w-4" aria-hidden="true" />
                            {labels.downloadFile}
                          </a>
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <footer className="border-t border-border pt-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              {labels.metadata}
            </p>
            <dl className="mt-5 grid gap-x-10 gap-y-3 sm:grid-cols-[max-content_1fr_max-content_1fr]">
              <MetaDefinition
                label={labels.registrationNumber}
                value={document.registrationNumber}
                mono
              />
              <MetaDefinition label={labels.type} value={typeLabel} />
              <MetaDefinition
                label={labels.revision}
                value={toDisplayRevision(document.revision)}
                mono
              />
              <MetaDefinition label={labels.published} value={publishedFormatted} mono />
              <MetaDefinition label={labels.validFrom} value={validFromFormatted} mono />
              <MetaDefinition label={labels.validTo} value={validToFormatted} mono />
              {visibleMetadata(document.metadataList).map((item) => (
                <MetaDefinition
                  key={item.key}
                  label={friendlyMetadataLabel(item.key)}
                  value={item.value}
                />
              ))}
            </dl>

            <div className="mt-10">
              <CiteBlock document={document} labels={labels} />
            </div>

            <p className="mt-9 max-w-[56ch] font-serif text-[13px] italic leading-[1.55] text-muted-foreground">
              {labels.officialNotice}
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
};

export default PublicDocumentView;
