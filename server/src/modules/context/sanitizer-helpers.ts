// Regex patterns for sanitization
export const SECRET_PATTERNS: RegExp[] = [
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, // JWT
  /(?:sk|pk|api|key|token|secret|password)[_-]?[A-Za-z0-9_-]{16,}/gi, // API keys
  /(?:mongodb|postgres|mysql|redis):\/\/[^\s"',}]+/gi, // Connection strings
  /https?:\/\/[^\s"',}]*(?:X-Amz-Signature|Signature|token=)[^\s"',}]*/gi, // Pre-signed URLs
  /(?:Bearer\s+)[A-Za-z0-9._~+/=-]{20,}/gi, // Bearer tokens
  /-----BEGIN (?:RSA |EC )?(?:PRIVATE|PUBLIC) KEY-----[\s\S]*?-----END/g, // PEM keys
];

export const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
export const PHONE_RE = /(\+?\d{1,3})[\s-]?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/g;
export const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g;
export const CC_RE = /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g;
export const BASE64_RE = /(?:[A-Za-z0-9+/]{4}){10,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/g;
export const INTERNAL_URL_RE = /https?:\/\/(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|localhost|127\.0\.0\.1)(?::\d+)?[^\s"',}]*/gi;
export const INTERNAL_HOST_RE = /(?:[a-z0-9-]+\.internal|[a-z0-9-]+\.local|[a-z0-9-]+\.corp)(?::\d+)?/gi;

interface FieldAudit { count: number; fields: string[] }
interface CountAudit { count: number }

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '[REDACTED_EMAIL]';
  const domParts = domain.split('.');
  const domName = domParts[0] || 'd';
  const tld = domParts.slice(1).join('.') || 'com';
  return `${local[0]}***@${domName[0]}***.${tld}`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return '[REDACTED_PHONE]';
  return `+${digits.slice(0, 1)}***${digits.slice(-3)}`;
}

export function deepRedactSecrets(obj: unknown, fieldPath: string, audit: FieldAudit): unknown {
  if (typeof obj === 'string') {
    let result = obj;
    for (const pattern of SECRET_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(result)) {
        audit.count++;
        if (!audit.fields.includes(fieldPath)) audit.fields.push(fieldPath);
        pattern.lastIndex = 0;
        result = result.replace(pattern, '[REDACTED]');
      }
    }
    return result;
  }
  if (Array.isArray(obj)) {
    return obj.map((item, i) => deepRedactSecrets(item, `${fieldPath}[${i}]`, audit));
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = deepRedactSecrets(value, fieldPath ? `${fieldPath}.${key}` : key, audit);
    }
    return result;
  }
  return obj;
}

export function deepMaskPII(obj: unknown, fieldPath: string, audit: FieldAudit): unknown {
  if (typeof obj === 'string') {
    let result = obj;
    const emails = result.match(EMAIL_RE);
    if (emails) {
      for (const email of emails) {
        result = result.replace(email, maskEmail(email));
        audit.count++;
        if (!audit.fields.includes(fieldPath)) audit.fields.push(fieldPath);
      }
    }
    const phones = result.match(PHONE_RE);
    if (phones) {
      for (const phone of phones) {
        result = result.replace(phone, maskPhone(phone));
        audit.count++;
        if (!audit.fields.includes(fieldPath)) audit.fields.push(fieldPath);
      }
    }
    const ssns = result.match(SSN_RE);
    if (ssns) {
      for (const ssn of ssns) {
        result = result.replace(ssn, `***-**-${ssn.slice(-4)}`);
        audit.count++;
        if (!audit.fields.includes(fieldPath)) audit.fields.push(fieldPath);
      }
    }
    const ccs = result.match(CC_RE);
    if (ccs) {
      for (const cc of ccs) {
        const digits = cc.replace(/\D/g, '');
        result = result.replace(cc, `****-****-****-${digits.slice(-4)}`);
        audit.count++;
        if (!audit.fields.includes(fieldPath)) audit.fields.push(fieldPath);
      }
    }
    return result;
  }
  if (Array.isArray(obj)) {
    return obj.map((item, i) => deepMaskPII(item, `${fieldPath}[${i}]`, audit));
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = deepMaskPII(value, fieldPath ? `${fieldPath}.${key}` : key, audit);
    }
    return result;
  }
  return obj;
}

export function deepRemoveBinary(obj: unknown, fieldPath: string, audit: CountAudit): unknown {
  if (typeof obj === 'string') {
    BASE64_RE.lastIndex = 0;
    if (BASE64_RE.test(obj) && obj.length > 100) {
      audit.count++;
      return '[BINARY_REMOVED]';
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item, i) => deepRemoveBinary(item, `${fieldPath}[${i}]`, audit));
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = deepRemoveBinary(value, fieldPath ? `${fieldPath}.${key}` : key, audit);
    }
    return result;
  }
  return obj;
}

export function deepStripInternalUrls(obj: unknown, audit: CountAudit): unknown {
  if (typeof obj === 'string') {
    let result = obj;
    const internalUrls = result.match(INTERNAL_URL_RE);
    if (internalUrls) {
      for (const url of internalUrls) {
        result = result.replace(url, '[INTERNAL_URL_REMOVED]');
        audit.count++;
      }
    }
    INTERNAL_HOST_RE.lastIndex = 0;
    const internalHosts = result.match(INTERNAL_HOST_RE);
    if (internalHosts) {
      for (const host of internalHosts) {
        result = result.replace(host, '[INTERNAL_HOST_REMOVED]');
        audit.count++;
      }
    }
    return result;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => deepStripInternalUrls(item, audit));
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = deepStripInternalUrls(value, audit);
    }
    return result;
  }
  return obj;
}

export function countPatternMatches(text: string, patterns: RegExp[]): number {
  let count = 0;
  for (const pattern of patterns) {
    const re = new RegExp(pattern.source, pattern.flags);
    const matches = text.match(re);
    if (matches) count += matches.length;
  }
  return count;
}

export function countOccurrences(text: string, pattern: RegExp): number {
  const re = new RegExp(pattern.source, pattern.flags);
  const matches = text.match(re);
  return matches ? matches.length : 0;
}

export function countLongBase64(text: string): number {
  const re = new RegExp(BASE64_RE.source, BASE64_RE.flags);
  const matches = text.match(re);
  if (!matches) return 0;
  return matches.filter((m) => m.length > 100).length;
}
