import './globals.css';
import type { Metadata } from 'next';
import { localeInfo } from '@ai-support/shared/locales';
import { requestLocale } from '@/lib/locale-server';
import { LocaleProvider } from '@/lib/localization';
import { loadCatalog } from '@/lib/catalog';

export async function generateMetadata(): Promise<Metadata> {
  const messages = await loadCatalog(await requestLocale());
  const title = 'Support AI | AI Customer Support for SaaS and Digital Products';
  const description = 'Scale customer support with answers tailored to each account, right inside your product. Get started free with Support AI.';
  return { title: messages[title] ?? title, description: messages[description] ?? description };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = localeInfo(await requestLocale());
  const messages = await loadCatalog(locale.locale);
  return (
    <html lang={locale.locale} dir={locale.dir}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-surface-0 text-surface-900 antialiased"><LocaleProvider initial={locale.locale} initialMessages={messages}>{children}</LocaleProvider></body>
    </html>
  );
}
