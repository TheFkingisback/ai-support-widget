// The PartyHost.ai launch register contains 21 languages and 24 locale bundles.
export const locales = Object.freeze({
  'en-US': { name: 'English (US)', prompt: 'American English' },
  'en-GB': { name: 'English (UK)', prompt: 'British English' },
  'zh-Hans': { name: '简体中文', prompt: 'Mandarin Chinese in Simplified characters' },
  'zh-Hant': { name: '繁體中文', prompt: 'Mandarin Chinese in Traditional characters' },
  hi: { name: 'हिन्दी', prompt: 'Hindi' },
  es: { name: 'Español', prompt: 'Spanish' },
  ar: { name: 'العربية', prompt: 'Modern Standard Arabic', rtl: true },
  fr: { name: 'Français', prompt: 'French' },
  bn: { name: 'বাংলা', prompt: 'Bengali' },
  'pt-BR': { name: 'Português (Brasil)', prompt: 'Brazilian Portuguese' },
  id: { name: 'Bahasa Indonesia', prompt: 'Indonesian' },
  ur: { name: 'اردو', prompt: 'Urdu', rtl: true },
  ru: { name: 'Русский', prompt: 'Russian' },
  de: { name: 'Deutsch', prompt: 'German' },
  ja: { name: '日本語', prompt: 'Japanese' },
  pcm: { name: 'Naijá', prompt: 'Nigerian Pidgin' },
  arz: { name: 'مصري', prompt: 'Egyptian Arabic', rtl: true, formatting: 'ar-EG' },
  mr: { name: 'मराठी', prompt: 'Marathi' },
  vi: { name: 'Tiếng Việt', prompt: 'Vietnamese' },
  te: { name: 'తెలుగు', prompt: 'Telugu' },
  sw: { name: 'Kiswahili', prompt: 'Swahili' },
  ha: { name: 'Hausa', prompt: 'Hausa in Latin script' },
  'sr-Cyrl': { name: 'Српски (ћирилица)', prompt: 'Serbian in Cyrillic script' },
  'sr-Latn': { name: 'Srpski (latinica)', prompt: 'Serbian in Latin script' },
});

export const defaultLocale = 'en-US';

export function matchLocale(input) {
  if (typeof input !== 'string' || !input.trim() || input.length > 100) return undefined;
  let tag;
  try { tag = new Intl.Locale(input.trim().replace(/_/g, '-')); }
  catch { return undefined; }
  const { language, region, script, baseName } = tag;
  if (Object.prototype.hasOwnProperty.call(locales, baseName)) return baseName;
  if (language === 'zh') {
    if (script) return script === 'Hant' ? 'zh-Hant' : script === 'Hans' ? 'zh-Hans' : undefined;
    return ['TW', 'HK', 'MO'].includes(region) ? 'zh-Hant' : 'zh-Hans';
  }
  if (language === 'sr') {
    if (script && script !== 'Latn' && script !== 'Cyrl') return undefined;
    return script === 'Latn' ? 'sr-Latn' : 'sr-Cyrl';
  }
  if (language === 'en') return ['GB', 'IE', 'AU', 'NZ'].includes(region) ? 'en-GB' : 'en-US';
  if (language === 'pt') return 'pt-BR';
  if (language === 'ar' && region === 'EG') return 'arz';
  return Object.prototype.hasOwnProperty.call(locales, language) ? language : undefined;
}

export function matchAcceptLanguage(header) {
  if (typeof header !== 'string') return undefined;
  const ranges = header.slice(0, 4096).split(',').map((candidate, index) => {
    const [tag, quality] = candidate.trim().split(';');
    const q = quality === undefined ? 1 : Number(quality.trim().match(/^q\s*=\s*(0(?:\.\d{1,3})?|1(?:\.0{1,3})?)$/i)?.[1]);
    return { tag: tag.toLowerCase(), locale: matchLocale(tag), q, index };
  });
  for (const range of ranges.filter(entry => entry.q > 0 && entry.locale)
    .sort((a, b) => b.q - a.q || a.index - b.index)) {
    const match = range.locale.toLowerCase();
    const excluded = ranges.some(entry => {
      if (entry.q !== 0) return false;
      if (entry.tag === '*') return false; // An explicit positive match is more specific.
      if (range.tag === entry.tag || match === entry.tag) return true;
      return match.startsWith(entry.tag + '-') && !range.tag.startsWith(entry.tag + '-');
    });
    if (!excluded) return range.locale;
  }
  return undefined;
}

export function localeInfo(input) {
  const locale = matchLocale(input) ?? defaultLocale;
  const info = locales[locale];
  return { locale, name: info.name, prompt: info.prompt, dir: info.rtl ? 'rtl' : 'ltr', formatting: info.formatting ?? locale };
}
