import { defaultLocale, matchLocale } from './locales.mjs';
import messages from './messages.json' with { type: 'json' };

export function messagesFor(input) {
  return messages[matchLocale(input) ?? defaultLocale] ?? messages[defaultLocale];
}
