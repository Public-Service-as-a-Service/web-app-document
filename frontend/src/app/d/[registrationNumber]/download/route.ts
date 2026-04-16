import { publicBackendUrl, proxyPublicFile } from '../../public-document-api';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ registrationNumber: string }> }
) {
  const { registrationNumber } = await params;
  return proxyPublicFile(publicBackendUrl(registrationNumber, 'download'));
}
