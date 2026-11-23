'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { defaultLocale, localeInfo, locales, matchLocale, type SupportLocale } from '@ai-support/shared/locales';
import { loadCatalog, type Catalog } from './catalog';
import { workspaceApi } from './workspace-api';

type Values = Record<string, string | number>;
const LocaleContext = createContext({ locale: defaultLocale, select: async (_value: SupportLocale) => false, messages: {} as Catalog });

export function LocaleProvider({ initial, initialMessages, children }: { initial: SupportLocale; initialMessages: Catalog; children: ReactNode }) {
  const [selection, setSelection] = useState<{ base: SupportLocale; locale: SupportLocale; messages: Catalog }>();
  const sequence = useRef(0);
  const active = selection?.base === initial ? selection : { locale: initial, messages: initialMessages };
  const locale = active.locale;
  async function select(next: SupportLocale) {
    const request = ++sequence.current;
    try {
      const messages = next === initial ? initialMessages : await loadCatalog(next);
      if (request !== sequence.current) return false;
      setSelection({ base: initial, locale: next, messages });
      return true;
    } catch { return false; }
  }
  useEffect(() => {
    const info = localeInfo(locale);
    document.documentElement.lang = info.locale;
    document.documentElement.dir = info.dir;
  }, [locale]);
  return <LocaleContext.Provider value={{ locale, select, messages: active.messages }}>{children}</LocaleContext.Provider>;
}

export function useLocale() { return useContext(LocaleContext).locale; }
export function useRestoreLocale() { return useContext(LocaleContext).select; }

export function useT() {
  const { messages } = useContext(LocaleContext);
  return (message: string, values?: Values) => {
    const copy = Object.prototype.hasOwnProperty.call(messages, message) ? messages[message] : message;
    return values ? copy.replace(/\{([A-Za-z][\w]*)\}/g, (token, name) => String(values[name] ?? token)) : copy;
  };
}

export function L({ children, values }: { children: string; values?: Values }) {
  return useT()(children, values);
}

export function LanguagePicker() {
  const { locale, select } = useContext(LocaleContext);
  const t = useT();
  return <select aria-label={t('Language')} className="rounded border border-slate-500/60 bg-transparent px-2 py-1 text-sm"
    value={locale} onChange={async event => {
      const next = matchLocale(event.target.value);
      if (!next || !await select(next)) return;
      const url = new URL(window.location.href);
      url.searchParams.delete('lang');
      window.history.replaceState(null, '', url);
      document.cookie = `support_locale=${next}; Path=/; SameSite=Lax; Max-Age=31536000${url.protocol === 'https:' ? '; Secure' : ''}`;
      void workspaceApi.setLocale(next).catch(() => { /* guest preference is already persisted in the browser */ });
    }}>
    {Object.entries(locales).map(([tag, info]) => <option key={tag} className="text-slate-900" value={tag} lang={tag}>{info.name}</option>)}
  </select>;
}
