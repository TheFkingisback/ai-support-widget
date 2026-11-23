export type SupportLocale =
  | 'en-US' | 'en-GB' | 'zh-Hans' | 'zh-Hant' | 'hi' | 'es' | 'ar' | 'fr' | 'bn'
  | 'pt-BR' | 'id' | 'ur' | 'ru' | 'de' | 'ja' | 'pcm' | 'arz' | 'mr' | 'vi'
  | 'te' | 'sw' | 'ha' | 'sr-Cyrl' | 'sr-Latn';

export const locales: Readonly<Record<SupportLocale, { name: string; prompt: string; rtl?: boolean; formatting?: string }>>;
export const defaultLocale: SupportLocale;
export function matchLocale(input: unknown): SupportLocale | undefined;
export function matchAcceptLanguage(header: unknown): SupportLocale | undefined;
export function localeInfo(input: unknown): {
  locale: SupportLocale;
  name: string;
  prompt: string;
  dir: 'ltr' | 'rtl';
  formatting: string;
};
