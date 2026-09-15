import { deepRedactSecrets, deepStripInternalUrls, deepRemoveBinary } from './sanitizer-helpers.js';

const sensitiveKey = /^(authorization|cookie|set-cookie|password|passwd|secret|.*[_-](secret|token|password)|accessToken|refreshToken|apiKey|serviceToken|privateKey|connectionString)$/i;
/** Redacts explicit secret fields and known secret patterns without logging their values. */
export function redactContent(value: unknown): unknown {
  const fields = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(fields);
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item).map(([key, val]) =>
      [key, sensitiveKey.test(key) ? '[REDACTED]' : fields(val)]));
    return item;
  };
  const redacted = deepRedactSecrets(fields(value), '', { count: 0, fields: [] });
  return deepStripInternalUrls(deepRemoveBinary(redacted, '', { count: 0 }), { count: 0 });
}
/** Reduces model/tool/free-text content before storage and model use. Not an exhaustive DLP classifier. */
export function safeText(value: string): string {
  return String(deepStripInternalUrls(deepRedactSecrets(value, '', { count: 0, fields: [] }), { count: 0 }));
}
