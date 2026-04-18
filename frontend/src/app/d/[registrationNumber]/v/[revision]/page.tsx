import { notFound } from 'next/navigation';
import { getPublicDocumentLabels } from '../../page';
import PublicDocumentView from '../../public-document-view';
import { fetchPublicDocument } from '../../../public-document-api';

export const dynamic = 'force-dynamic';

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

interface PublicDocumentRevisionPageProps {
  params: Promise<{ registrationNumber: string; revision: string }>;
}

const PublicDocumentRevisionPage = async ({ params }: PublicDocumentRevisionPageProps) => {
  const { registrationNumber, revision } = await params;
  const [revisionDoc, latestDoc] = await Promise.all([
    fetchPublicDocument(registrationNumber, revision),
    fetchPublicDocument(registrationNumber),
  ]);

  if (!revisionDoc) {
    notFound();
  }

  const isHistorical = Boolean(latestDoc && latestDoc.revision !== revisionDoc.revision);
  const latestUrl = `/d/${encodeURIComponent(registrationNumber)}`;

  return (
    <PublicDocumentView
      document={revisionDoc}
      labels={await getPublicDocumentLabels()}
      isHistorical={isHistorical}
      latestUrl={latestUrl}
    />
  );
};

export default PublicDocumentRevisionPage;
