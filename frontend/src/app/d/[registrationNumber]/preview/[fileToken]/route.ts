import { publicBackendUrl, proxyPublicFile } from '../../../public-document-api';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ registrationNumber: string; fileToken: string }> }
) {
  const { registrationNumber, fileToken } = await params;
  return proxyPublicFile(publicBackendUrl(registrationNumber, 'preview', fileToken));
}
