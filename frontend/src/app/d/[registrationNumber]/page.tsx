import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { fetchPublicDocument } from '../public-document-api';
import PublicDocumentView from './public-document-view';

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
    validFrom: 'Börjar gälla',
    validTo: 'Slutar gälla',
    validOpenEnded: 'Tills vidare',
    type: 'Typ',
    revision: 'Revision',
    previewTitle: 'Förhandsvisning',
    noPreview: 'Ingen fil kan förhandsvisas.',
    registrationNumber: 'Registreringsnummer',
    previewLoading: 'Laddar förhandsvisning…',
    previewError: 'Kunde inte ladda förhandsvisning.',
    pptxFidelityWarning: 'Förhandsvisning av PPTX kan skilja sig från originalet. Ladda ner för full trohet.',
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
    validFrom: 'Valid from',
    validTo: 'Valid to',
    validOpenEnded: 'Open-ended',
    type: 'Type',
    revision: 'Revision',
    previewTitle: 'Preview',
    noPreview: 'No file can be previewed.',
    registrationNumber: 'Registration number',
    previewLoading: 'Loading preview…',
    previewError: 'Could not load preview.',
    pptxFidelityWarning: 'PPTX preview may differ from the original. Download for full fidelity.',
  },
};

const getLocale = async () => {
  const acceptLanguage = (await headers()).get('accept-language') || '';
  return acceptLanguage.toLowerCase().startsWith('en') ? 'en' : 'sv';
};

export const getPublicDocumentLabels = async () => {
  const locale = await getLocale();
  return labels[locale];
};

const PublicDocumentPage = async ({ params }: PublicDocumentPageProps) => {
  const { registrationNumber } = await params;
  const document = await fetchPublicDocument(registrationNumber);

  if (!document) {
    notFound();
  }

  return <PublicDocumentView document={document} labels={await getPublicDocumentLabels()} />;
};

export default PublicDocumentPage;
