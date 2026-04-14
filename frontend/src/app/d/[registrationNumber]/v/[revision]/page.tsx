import { notFound } from 'next/navigation';
import { PublicDocumentView } from '../../page';
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

  return <PublicDocumentView document={document} />;
};

export default PublicDocumentRevisionPage;
