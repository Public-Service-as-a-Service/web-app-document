import { publicBackendUrl, proxyPublicFile } from '../../../../public-document-api';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ registrationNumber: string; revision: string }> }
) {
  const { registrationNumber, revision } = await params;
  return proxyPublicFile(publicBackendUrl(registrationNumber, 'v', revision, 'download'));
}
