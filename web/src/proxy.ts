import { NextResponse, type NextRequest } from 'next/server';
import { localizedArtifact } from './lib/artifact-path';
import { defaultLocale, matchAcceptLanguage, matchLocale } from '@ai-support/shared/locales';

export function proxy(request: NextRequest) {
  const locale = matchLocale(request.nextUrl.searchParams.get('lang'))
    ?? matchLocale(request.cookies.get('support_locale')?.value)
    ?? matchAcceptLanguage(request.headers.get('accept-language'))
    ?? defaultLocale;
  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith('/downloads/') || pathname.startsWith('/integration-v4/')) {
    const destination = localizedArtifact(pathname, locale);
    if (destination !== pathname) {
      return NextResponse.redirect(new URL(destination + search, request.url), { status: 307, headers: {
        Vary: 'Cookie, Accept-Language', 'Cache-Control': 'private, no-store',
      } });
    }
    const response = NextResponse.next();
    const tag = pathname.split('/')[2];
    if (tag && matchLocale(tag) === tag) response.headers.set('Content-Language', tag);
    return response;
  }
  const headers = new Headers(request.headers);
  headers.set('x-support-locale', locale);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Language', locale);
  return response;
}

export const config = {
  matcher: ['/downloads/:path*', '/integration-v4/:path*', '/((?!api/|_next/|downloads/|integration-v4/|starter/|.*\\.).*)'],
};
