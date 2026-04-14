import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export interface PublicDocumentFile {
  fileName: string;
  mimeType: string;
  fileSizeInBytes: number;
  downloadUrl: string;
  previewUrl?: string;
  previewSupported: boolean;
}

export interface PublicDocumentResponse {
  registrationNumber: string;
  revision: number;
  description: string;
  type: string;
  created: string;
  files: PublicDocumentFile[];
  downloadAllUrl?: string;
  metadataList: Array<{ key: string; value: string }>;
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3010';

export const publicBackendUrl = (...parts: string[]) =>
  `${BACKEND_URL}/api/public/d/${parts.map((part) => encodeURIComponent(part)).join('/')}`;

export async function fetchPublicDocument(
  registrationNumber: string,
  revision?: string
): Promise<PublicDocumentResponse | null> {
  const url =
    revision === undefined
      ? publicBackendUrl(registrationNumber)
      : publicBackendUrl(registrationNumber, 'v', revision);
  const response = await fetch(url, { cache: 'no-store' });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch public document: ${response.status}`);
  }

  return (await response.json()) as PublicDocumentResponse;
}

export async function proxyPublicFile(url: string) {
  const response = await fetch(url, {
    cache: 'no-store',
    redirect: 'manual',
  });

  const headers = new Headers();
  [
    'Cache-Control',
    'Content-Type',
    'Content-Disposition',
    'X-Content-Type-Options',
    'Content-Security-Policy',
  ].forEach((header) => {
    const value = response.headers.get(header);
    if (value) headers.set(header, value);
  });

  return new NextResponse(response.body, {
    status: response.status,
    headers,
  });
}
