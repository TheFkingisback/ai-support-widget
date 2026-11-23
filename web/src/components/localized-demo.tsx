'use client';

import { defaultLocale } from '@ai-support/shared/locales';
import { useLocale, useT } from '@/lib/localization';

export function LocalizedDemo() {
  const locale = useLocale();
  const t = useT();
  const src = '/starter/index.html' + (locale === defaultLocale ? '' : `?lang=${locale}`);
  return <iframe title={t('Support chat in a sample product')} src={src} className="mt-7 h-[760px] w-full rounded-xl border border-slate-700 bg-[#101922] min-[380px]:h-[620px]" />;
}
