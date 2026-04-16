'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import ThemeToggle from '@components/theme-toggle/theme-toggle';
import { useTenant } from '@components/tenant-provider/tenant-provider';
import { cn } from '@lib/utils';
import { toDisplayRevision } from '@utils/document-revision';
import { Download, Eye, FileArchive, FileText } from 'lucide-react';
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
  created: string;
  type: string;
  revision: string;
  registrationNumber: string;
};

interface PublicDocumentViewProps {
  document: PublicDocumentResponse;
  labels: PublicDocumentLabels;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getPdfPreviewUrl = (url: string) =>
  `${url}${url.includes('#') ? '&' : '#'}toolbar=0&navpanes=0&scrollbar=1&view=FitH`;

const PublicHeader = () => {
  const tenant = useTenant();

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
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
          <span className="truncate text-base font-bold text-foreground">{tenant.appName}</span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
};

const PreviewPane = ({
  file,
  labels,
}: {
  file: PublicDocumentFile | undefined;
  labels: PublicDocumentLabels;
}) => {
  if (!file?.previewUrl) {
    return (
      <section aria-label={labels.previewTitle} className="rounded-md border border-dashed p-6">
        <p className="text-sm text-muted-foreground">{labels.noPreview}</p>
      </section>
    );
  }

  return (
    <section aria-label={labels.previewTitle} className="space-y-3">
      <h2 className="break-words text-xl font-semibold">{file.fileName}</h2>
      {file.mimeType === 'application/pdf' ? (
        <iframe
          title={file.fileName}
          src={getPdfPreviewUrl(file.previewUrl)}
          className="h-[72vh] w-full rounded-md border border-border bg-muted"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={file.previewUrl}
          alt={file.fileName}
          className="max-h-[72vh] w-auto max-w-full rounded-md border border-border object-contain"
        />
      )}
    </section>
  );
};

const PublicDocumentView = ({ document, labels }: PublicDocumentViewProps) => {
  const previewFiles = useMemo(
    () => document.files.filter((file) => file.previewSupported && file.previewUrl),
    [document.files]
  );
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState(previewFiles[0]?.previewUrl);
  const selectedPreviewFile =
    previewFiles.find((file) => file.previewUrl === selectedPreviewUrl) ?? previewFiles[0];
  const showDownloadAll = Boolean(document.downloadAllUrl && document.files.length > 1);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />
      <main>
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
          <section className="border-b border-border pb-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{labels.document}</Badge>
              <Badge variant="secondary">{labels.latest}</Badge>
            </div>
            <h1 className="mt-4 break-words text-3xl font-bold">{document.description}</h1>
            <dl className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              <div>
                <dt className="font-semibold text-foreground">{labels.registrationNumber}</dt>
                <dd className="font-mono">{document.registrationNumber}</dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">{labels.revision}</dt>
                <dd>{toDisplayRevision(document.revision)}</dd>
              </div>
              <div>
                <dt className="font-semibold text-foreground">{labels.created}</dt>
                <dd>{dayjs(document.created).format('YYYY-MM-DD HH:mm')}</dd>
              </div>
            </dl>
          </section>

          <PreviewPane file={selectedPreviewFile} labels={labels} />

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">
                {labels.files} ({document.files.length})
              </h2>
            </div>

            {document.files.length === 0 ? (
              <p className="text-sm text-muted-foreground">{labels.noFiles}</p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {showDownloadAll && (
                  <li className="flex flex-wrap items-center gap-3 bg-muted/30 p-4">
                    <FileArchive className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-medium">{labels.downloadAll}</p>
                      <p className="text-xs text-muted-foreground">ZIP</p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={document.downloadAllUrl!}>
                        <Download className="h-4 w-4" />
                        {labels.downloadAll}
                      </Link>
                    </Button>
                  </li>
                )}
                {document.files.map((file) => {
                  const isSelected = file.previewUrl === selectedPreviewFile?.previewUrl;

                  return (
                    <li key={file.downloadUrl} className="flex flex-wrap items-center gap-3 p-4">
                      <FileText className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-medium">{file.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {file.mimeType} · {formatFileSize(file.fileSizeInBytes)}
                        </p>
                        {!file.previewSupported && (
                          <p className="mt-1 text-xs text-muted-foreground">
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
                            <Eye className="h-4 w-4" />
                            {labels.preview}
                          </Button>
                        )}
                        <Button asChild variant="outline" size="sm">
                          <Link href={file.downloadUrl}>
                            <Download className="h-4 w-4" />
                            {labels.downloadFile}
                          </Link>
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{labels.metadata}</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-md border border-border p-3">
                <dt className="font-semibold">{labels.type}</dt>
                <dd className="mt-1 text-muted-foreground">
                  {document.typeDisplayName || document.type}
                </dd>
              </div>
              {document.metadataList.map((item) => (
                <div key={item.key} className="rounded-md border border-border p-3">
                  <dt className="font-semibold">{item.key}</dt>
                  <dd className="mt-1 break-words text-muted-foreground">{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PublicDocumentView;
