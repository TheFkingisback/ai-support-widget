import { cache } from 'react';
import { headers } from 'next/headers';
import { defaultLocale, matchLocale } from '@ai-support/shared/locales';

export const requestLocale = cache(async () =>
  matchLocale((await headers()).get('x-support-locale')) ?? defaultLocale,
);
