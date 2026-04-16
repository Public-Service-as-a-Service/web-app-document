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
  const document = await fetchPublicDocument(registrationNumber, revision);

  if (!document) {
    notFound();
  }

  return <PublicDocumentView document={document} labels={await getPublicDocumentLabels()} />;
};

export default PublicDocumentRevisionPage;
