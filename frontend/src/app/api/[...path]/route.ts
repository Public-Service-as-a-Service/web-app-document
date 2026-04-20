import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3010';

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  const path = pathSegments.join('/');
  const search = request.nextUrl.search;
  const url = `${BACKEND_URL}/api/${path}${search}`;

  const headers = new Headers();
  const contentType = request.headers.get('Content-Type');
  if (contentType) {
    headers.set('Content-Type', contentType);
  }

  // Forward auth-related headers
  const cookie = request.headers.get('Cookie');
  if (cookie) {
    headers.set('Cookie', cookie);
  }
  const authorization = request.headers.get('Authorization');
  if (authorization) {
    headers.set('Authorization', authorization);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    if (contentType?.includes('multipart/form-data')) {
      init.body = await request.arrayBuffer();
    } else {
      init.body = await request.text();
    }
  }

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 500;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);

      const responseContentType = response.headers.get('Content-Type') || '';
      const setCookieHeaders = response.headers.getSetCookie?.() || [];

      if (!responseContentType.includes('application/json')) {
        const responseHeaders = new Headers();
        const ct = response.headers.get('Content-Type');
        const cd = response.headers.get('Content-Disposition');
        const location = response.headers.get('Location');
        if (ct) responseHeaders.set('Content-Type', ct);
        if (cd) responseHeaders.set('Content-Disposition', cd);
        if (location) responseHeaders.set('Location', location);
        for (const sc of setCookieHeaders) {
          responseHeaders.append('Set-Cookie', sc);
        }

        return new NextResponse(response.body, {
          status: response.status,
          headers: responseHeaders,
        });
      }

      const data = await response.json();
      const jsonResponse = NextResponse.json(data, { status: response.status });
      for (const sc of setCookieHeaders) {
        jsonResponse.headers.append('Set-Cookie', sc);
      }
      return jsonResponse;
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        console.warn(`Proxy attempt ${attempt} failed for ${url}, retrying in ${RETRY_DELAY}ms...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY * attempt));
        continue;
      }
      console.error(`Proxy error for ${url} after ${MAX_RETRIES} attempts:`, error);
      return NextResponse.json({ message: 'Backend unavailable' }, { status: 502 });
    }
  }

  return NextResponse.json({ message: 'Backend unavailable' }, { status: 502 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}
