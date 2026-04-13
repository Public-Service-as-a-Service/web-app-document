import { NextRequest, NextResponse } from 'next/server';
import { i18nRouter } from 'next-i18n-router';
import i18nConfig from '@app/i18nConfig';

const isTokenMode = process.env.NEXT_PUBLIC_AUTH_TYPE === 'token';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3010';
const publicPaths = ['/login', '/logout'];

export async function proxy(req: NextRequest) {
  const { pathname, origin } = req.nextUrl;

  const isPublicPath = publicPaths.some((p) => pathname.includes(p));

  if (!isPublicPath && !isTokenMode) {
    // SAML mode: validate session cookie server-side
    const cookieName = 'connect.sid';
    const sessionCookie = req.cookies.get(cookieName)?.value;

    let authenticated = false;

    if (sessionCookie) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/me`, {
          cache: 'no-cache',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Cookie: `${cookieName}=${sessionCookie}`,
          },
        });
        authenticated = response.ok;
      } catch {
        authenticated = false;
      }
    }

    if (!authenticated) {
      const defaultLocale = i18nConfig.defaultLocale;
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const loginUrl = new URL(`${basePath}/${defaultLocale}/login`, origin);
      loginUrl.searchParams.set('path', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  req.headers.set('x-path', pathname);
  return i18nRouter(req, i18nConfig);
}

export const config = {
  matcher: '/((?!api|static|.*\\..*|_next).*)',
};
