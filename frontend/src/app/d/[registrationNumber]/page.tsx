import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { Badge } from '@components/ui/badge';
import { Button } from '@components/ui/button';
import { Download, Eye, FileArchive, FileText } from 'lucide-react';
import dayjs from 'dayjs';
import { fetchPublicDocument, type PublicDocumentResponse } from '../public-document-api';

export const dynamic = 'force-dynamic';

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

interface PublicDocumentPageProps {
  params: Promise<{ registrationNumber: string }>;
}

const labels = {
  sv: {
    document: 'Dokument',
    latest: 'Senaste revision',
    files: 'Filer',
    metadata: 'Information',
    downloadAll: 'Ladda ner allt',
    downloadFile: 'Ladda ner',
    preview: 'Visa',
    noFiles: 'Det finns inga filer att ladda ner.',
    unsupportedPreview: 'Förhandsvisning saknas för filtypen.',
    created: 'Skapat',
    type: 'Typ',
    revision: 'Revision',
  },
  en: {
    document: 'Document',
    latest: 'Latest revision',
    files: 'Files',
    metadata: 'Information',
    downloadAll: 'Download all',
    downloadFile: 'Download',
    preview: 'View',
    noFiles: 'There are no files to download.',
    unsupportedPreview: 'Preview is not available for this file type.',
    created: 'Created',
    type: 'Type',
    revision: 'Revision',
  },
};

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getLocale = async () => {
  const acceptLanguage = (await headers()).get('accept-language') || '';
  return acceptLanguage.toLowerCase().startsWith('en') ? 'en' : 'sv';
};

export const PublicDocumentView = async ({ document }: { document: PublicDocumentResponse }) => {
  const locale = await getLocale();
  const t = labels[locale];
  const previewFile = document.files.find((file) => file.previewSupported);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="border-b border-border pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{t.document}</Badge>
            <Badge variant="secondary">{t.latest}</Badge>
          </div>
          <h1 className="mt-4 break-words text-3xl font-bold">{document.description}</h1>
          <dl className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <div>
              <dt className="font-semibold text-foreground">Registreringsnummer</dt>
              <dd className="font-mono">{document.registrationNumber}</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">{t.revision}</dt>
              <dd>{document.revision}</dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">{t.created}</dt>
              <dd>{dayjs(document.created).format('YYYY-MM-DD HH:mm')}</dd>
            </div>
          </dl>
        </header>

        {previewFile?.previewUrl && (
          <section aria-label="Förhandsvisning" className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">{previewFile.fileName}</h2>
              <Button asChild variant="secondary" size="sm">
                <Link href={previewFile.downloadUrl}>
                  <Download className="h-4 w-4" />
                  {t.downloadFile}
                </Link>
              </Button>
            </div>
            {previewFile.mimeType === 'application/pdf' ? (
              <iframe
                title={previewFile.fileName}
                src={previewFile.previewUrl}
                sandbox="allow-same-origin"
                className="h-[70vh] w-full rounded-md border border-border"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewFile.previewUrl}
                alt={previewFile.fileName}
                className="max-h-[70vh] w-auto max-w-full rounded-md border border-border object-contain"
              />
            )}
          </section>
        )}

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">
              {t.files} ({document.files.length})
            </h2>
            {document.downloadAllUrl && (
              <Button asChild>
                <Link href={document.downloadAllUrl}>
                  <FileArchive className="h-4 w-4" />
                  {t.downloadAll}
                </Link>
              </Button>
            )}
          </div>

          {document.files.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noFiles}</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {document.files.map((file) => (
                <li key={file.downloadUrl} className="flex flex-wrap items-center gap-3 p-4">
                  <FileText className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium">{file.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.mimeType} · {formatFileSize(file.fileSizeInBytes)}
                    </p>
                    {!file.previewSupported && (
                      <p className="mt-1 text-xs text-muted-foreground">{t.unsupportedPreview}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {file.previewUrl && (
                      <Button asChild variant="secondary" size="sm">
                        <Link href={file.previewUrl}>
                          <Eye className="h-4 w-4" />
                          {t.preview}
                        </Link>
                      </Button>
                    )}
                    <Button asChild variant="outline" size="sm">
                      <Link href={file.downloadUrl}>
                        <Download className="h-4 w-4" />
                        {t.downloadFile}
                      </Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t.metadata}</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-md border border-border p-3">
              <dt className="font-semibold">{t.type}</dt>
              <dd className="mt-1 text-muted-foreground">{document.type}</dd>
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
  );
};

const PublicDocumentPage = async ({ params }: PublicDocumentPageProps) => {
  const { registrationNumber } = await params;
  const document = await fetchPublicDocument(registrationNumber);

  if (!document) {
    notFound();
  }

  return <PublicDocumentView document={document} />;
};

export default PublicDocumentPage;
