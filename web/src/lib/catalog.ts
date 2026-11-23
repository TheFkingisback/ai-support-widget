import type { SupportLocale } from '@ai-support/shared/locales';

export type Catalog = Record<string, string>;

export async function loadCatalog(locale: SupportLocale): Promise<Catalog> {
  return (await import(`./locales/${locale}.json`)).default as Catalog;
}
