import { publicBackendUrl, proxyPublicFile } from '../../../../../public-document-api';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ registrationNumber: string; revision: string; fileToken: string }> }
) {
  const { registrationNumber, revision, fileToken } = await params;
  return proxyPublicFile(publicBackendUrl(registrationNumber, 'v', revision, 'preview', fileToken));
}
