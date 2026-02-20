import type { SupportContextSnapshot } from '@shared/types.js';
import { ValidationError } from '../../shared/errors.js';
import { log } from '../../shared/logger.js';

export interface SanitizationAudit {
  secretsRedacted: number;
  piiMasked: number;
  binaryRemoved: number;
  internalUrlsStripped: number;
  fieldsRemoved: string[];
}

// Regex patterns for secrets
const SECRET_PATTERNS: RegExp[] = [
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, // JWT
  /(?:sk|pk|api|key|token|secret|password)[_-]?[A-Za-z0-9_-]{16,}/gi, // API keys
  /(?:mongodb|postgres|mysql|redis):\/\/[^\s"',}]+/gi, // Connection strings
  /https?:\/\/[^\s"',}]*(?:X-Amz-Signature|Signature|token=)[^\s"',}]*/gi, // Pre-signed URLs
  /(?:Bearer\s+)[A-Za-z0-9._~+/=-]{20,}/gi, // Bearer tokens
  /-----BEGIN (?:RSA |EC )?(?:PRIVATE|PUBLIC) KEY-----[\s\S]*?-----END/g, // PEM keys
];

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(\+?\d{1,3})[\s-]?\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/g;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g;
const CC_RE = /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g;
const BASE64_RE = /(?:[A-Za-z0-9+/]{4}){10,}(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?/g;
const INTERNAL_URL_RE = /https?:\/\/(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|localhost|127\.0\.0\.1)(?::\d+)?[^\s"',}]*/gi;
const INTERNAL_HOST_RE = /(?:[a-z0-9-]+\.internal|[a-z0-9-]+\.local|[a-z0-9-]+\.corp)(?::\d+)?/gi;

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

function deepRedactSecrets(
  obj: unknown,
  fieldPath: string,
  audit: { count: number; fields: string[] },
): unknown {
  if (typeof obj === 'string') {
    let result = obj;
    for (const pattern of SECRET_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(result)) {
        audit.count++;
        if (!audit.fields.includes(fieldPath)) audit.fields.push(fieldPath);
        result = result.replace(new RegExp(pattern.source, pattern.flags), '[REDACTED]');
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
      const path = fieldPath ? `${fieldPath}.${key}` : key;
      // Always recurse into values — safe fields protect the key name, not nested content
      result[key] = deepRedactSecrets(value, path, audit);
    }
    return result;
  }
  return obj;
}

export function redactSecrets(
  snapshot: SupportContextSnapshot,
  requestId?: string,
): SupportContextSnapshot {
  const audit = { count: 0, fields: [] as string[] };
  const result = deepRedactSecrets(snapshot, '', audit) as SupportContextSnapshot;
  log.info(`redactSecrets: ${audit.count} secrets redacted`, requestId, {
    fieldsRedacted: audit.count,
    fields: audit.fields,
  });
  return result;
}

function deepMaskPII(
  obj: unknown,
  fieldPath: string,
  audit: { count: number; fields: string[] },
): unknown {
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

export function maskPII(
  snapshot: SupportContextSnapshot,
  requestId?: string,
): SupportContextSnapshot {
  const audit = { count: 0, fields: [] as string[] };
  const result = deepMaskPII(snapshot, '', audit) as SupportContextSnapshot;
  log.info(`maskPII: ${audit.count} PII fields masked`, requestId, {
    piiMasked: audit.count,
    fields: audit.fields,
  });
  return result;
}

function deepRemoveBinary(
  obj: unknown,
  fieldPath: string,
  audit: { count: number },
): unknown {
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

export function removeBinary(
  snapshot: SupportContextSnapshot,
  requestId?: string,
): SupportContextSnapshot {
  const audit = { count: 0 };
  const result = deepRemoveBinary(snapshot, '', audit) as SupportContextSnapshot;
  log.info(`removeBinary: ${audit.count} binary payloads removed`, requestId, {
    binaryRemoved: audit.count,
  });
  return result;
}

function deepStripInternalUrls(
  obj: unknown,
  audit: { count: number },
): unknown {
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

export function stripInternalUrls(
  snapshot: SupportContextSnapshot,
  requestId?: string,
): SupportContextSnapshot {
  const audit = { count: 0 };
  const result = deepStripInternalUrls(snapshot, audit) as SupportContextSnapshot;
  log.info(`stripInternalUrls: ${audit.count} internal URLs stripped`, requestId, {
    internalUrlsStripped: audit.count,
  });
  return result;
}

export function validateSchema(
  snapshot: SupportContextSnapshot,
  requestId?: string,
): SupportContextSnapshot {
  const errors: string[] = [];

  if (!snapshot.meta?.snapshotId) errors.push('meta.snapshotId is required');
  if (!snapshot.meta?.createdAt) errors.push('meta.createdAt is required');
  if (!snapshot.identity?.tenantId) errors.push('identity.tenantId is required');
  if (!snapshot.identity?.userId) errors.push('identity.userId is required');
  if (!snapshot.productState) errors.push('productState is required');
  if (!snapshot.recentActivity) errors.push('recentActivity is required');
  if (!snapshot.backend) errors.push('backend is required');
  if (!snapshot.knowledgePack) errors.push('knowledgePack is required');
  if (!snapshot.privacy) errors.push('privacy is required');

  if (!Array.isArray(snapshot.productState?.entities)) {
    errors.push('productState.entities must be an array');
  }
  if (!Array.isArray(snapshot.productState?.activeErrors)) {
    errors.push('productState.activeErrors must be an array');
  }
  if (!Array.isArray(snapshot.recentActivity?.events)) {
    errors.push('recentActivity.events must be an array');
  }
  if (!Array.isArray(snapshot.backend?.recentRequests)) {
    errors.push('backend.recentRequests must be an array');
  }

  if (errors.length > 0) {
    log.error(`validateSchema: ${errors.length} validation errors`, requestId, { errors });
    throw new ValidationError(`SCS validation failed: ${errors.join('; ')}`);
  }

  log.info('validateSchema: SCS schema valid', requestId);
  return snapshot;
}

export function sanitize(
  snapshot: SupportContextSnapshot,
  requestId?: string,
): { sanitized: SupportContextSnapshot; audit: SanitizationAudit } {
  log.info('sanitize: starting sanitization pipeline', requestId);

  let current = redactSecrets(snapshot, requestId);
  const afterSecrets = JSON.stringify(current);

  current = maskPII(current, requestId);
  const afterPII = JSON.stringify(current);

  current = removeBinary(current, requestId);
  const afterBinary = JSON.stringify(current);

  current = stripInternalUrls(current, requestId);

  current = validateSchema(current, requestId);

  // Count changes by comparing field-level diffs
  const origStr = JSON.stringify(snapshot);
  const finalStr = JSON.stringify(current);

  const secretsRedacted = countPatternMatches(JSON.stringify(snapshot), SECRET_PATTERNS);
  const piiMasked = countOccurrences(origStr, EMAIL_RE) + countOccurrences(origStr, PHONE_RE)
    + countOccurrences(origStr, SSN_RE) + countOccurrences(origStr, CC_RE);
  const binaryRemoved = countLongBase64(origStr) - countLongBase64(afterBinary);
  const internalUrlsStripped =
    countOccurrences(afterBinary, INTERNAL_URL_RE) + countOccurrences(afterBinary, INTERNAL_HOST_RE);

  const fieldsRemoved: string[] = [];
  if (secretsRedacted > 0) fieldsRemoved.push('secrets');
  if (piiMasked > 0) fieldsRemoved.push('pii');
  if (binaryRemoved > 0) fieldsRemoved.push('binary');
  if (internalUrlsStripped > 0) fieldsRemoved.push('internal_urls');

  // Update privacy section
  current = {
    ...current,
    privacy: {
      redactionVersion: '1.0.0',
      fieldsRemoved,
    },
  };

  const audit: SanitizationAudit = {
    secretsRedacted,
    piiMasked,
    binaryRemoved,
    internalUrlsStripped,
    fieldsRemoved,
  };

  log.info('sanitize: pipeline complete', requestId, {
    inputBytes: origStr.length,
    outputBytes: finalStr.length,
    audit,
  });

  return { sanitized: current, audit };
}

function countPatternMatches(text: string, patterns: RegExp[]): number {
  let count = 0;
  for (const pattern of patterns) {
    const re = new RegExp(pattern.source, pattern.flags);
    const matches = text.match(re);
    if (matches) count += matches.length;
  }
  return count;
}

function countOccurrences(text: string, pattern: RegExp): number {
  const re = new RegExp(pattern.source, pattern.flags);
  const matches = text.match(re);
  return matches ? matches.length : 0;
}

function countLongBase64(text: string): number {
  const re = new RegExp(BASE64_RE.source, BASE64_RE.flags);
  const matches = text.match(re);
  if (!matches) return 0;
  return matches.filter((m) => m.length > 100).length;
}
