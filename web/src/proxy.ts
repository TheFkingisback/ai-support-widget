import { NextResponse, type NextRequest } from 'next/server';
import { defaultLocale, matchAcceptLanguage, matchLocale } from '@ai-support/shared/locales';

export function proxy(request: NextRequest) {
  const locale = matchLocale(request.nextUrl.searchParams.get('lang'))
    ?? matchLocale(request.cookies.get('support_locale')?.value)
    ?? matchAcceptLanguage(request.headers.get('accept-language'))
    ?? defaultLocale;
  const headers = new Headers(request.headers);
  headers.set('x-support-locale', locale);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Language', locale);
  return response;
}

export const config = {
  matcher: ['/((?!api/|_next/|downloads/|integration-v3/|actions-v1/|starter/|.*\\.).*)'],
};
