import type { SupportContextSnapshot } from '@shared/types.js';
import { ValidationError } from '../../shared/errors.js';
import { log } from '../../shared/logger.js';
import {
  deepRedactSecrets, deepMaskPII, deepRemoveBinary, deepStripInternalUrls,
  countPatternMatches, countOccurrences, countLongBase64,
  SECRET_PATTERNS, EMAIL_RE, PHONE_RE, SSN_RE, CC_RE, INTERNAL_URL_RE, INTERNAL_HOST_RE,
} from './sanitizer-helpers.js';

export interface SanitizationAudit {
  secretsRedacted: number;
  piiMasked: number;
  binaryRemoved: number;
  internalUrlsStripped: number;
  fieldsRemoved: string[];
}

export function redactSecrets(
  snapshot: SupportContextSnapshot, requestId?: string,
): SupportContextSnapshot {
  const audit = { count: 0, fields: [] as string[] };
  const result = deepRedactSecrets(snapshot, '', audit) as SupportContextSnapshot;
  log.info(`redactSecrets: ${audit.count} secrets redacted`, requestId, {
    fieldsRedacted: audit.count, fields: audit.fields,
  });
  return result;
}

export function maskPII(
  snapshot: SupportContextSnapshot, requestId?: string,
): SupportContextSnapshot {
  const audit = { count: 0, fields: [] as string[] };
  const result = deepMaskPII(snapshot, '', audit) as SupportContextSnapshot;
  log.info(`maskPII: ${audit.count} PII fields masked`, requestId, {
    piiMasked: audit.count, fields: audit.fields,
  });
  return result;
}

export function removeBinary(
  snapshot: SupportContextSnapshot, requestId?: string,
): SupportContextSnapshot {
  const audit = { count: 0 };
  const result = deepRemoveBinary(snapshot, '', audit) as SupportContextSnapshot;
  log.info(`removeBinary: ${audit.count} binary payloads removed`, requestId, {
    binaryRemoved: audit.count,
  });
  return result;
}

export function stripInternalUrls(
  snapshot: SupportContextSnapshot, requestId?: string,
): SupportContextSnapshot {
  const audit = { count: 0 };
  const result = deepStripInternalUrls(snapshot, audit) as SupportContextSnapshot;
  log.info(`stripInternalUrls: ${audit.count} internal URLs stripped`, requestId, {
    internalUrlsStripped: audit.count,
  });
  return result;
}

export function validateSchema(
  snapshot: SupportContextSnapshot, requestId?: string,
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
  if (!Array.isArray(snapshot.productState?.entities)) errors.push('productState.entities must be an array');
  if (!Array.isArray(snapshot.productState?.activeErrors)) errors.push('productState.activeErrors must be an array');
  if (!Array.isArray(snapshot.recentActivity?.events)) errors.push('recentActivity.events must be an array');
  if (!Array.isArray(snapshot.backend?.recentRequests)) errors.push('backend.recentRequests must be an array');

  if (errors.length > 0) {
    log.error(`validateSchema: ${errors.length} validation errors`, requestId, { errors });
    throw new ValidationError(`SCS validation failed: ${errors.join('; ')}`);
  }
  log.info('validateSchema: SCS schema valid', requestId);
  return snapshot;
}

export function sanitize(
  snapshot: SupportContextSnapshot, requestId?: string,
): { sanitized: SupportContextSnapshot; audit: SanitizationAudit } {
  log.info('sanitize: starting sanitization pipeline', requestId);

  let current = redactSecrets(snapshot, requestId);
  current = maskPII(current, requestId);
  current = removeBinary(current, requestId);
  const afterBinary = JSON.stringify(current);
  current = stripInternalUrls(current, requestId);
  current = validateSchema(current, requestId);

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

  current = { ...current, privacy: { redactionVersion: '1.0.0', fieldsRemoved } };

  const audit: SanitizationAudit = { secretsRedacted, piiMasked, binaryRemoved, internalUrlsStripped, fieldsRemoved };
  log.info('sanitize: pipeline complete', requestId, {
    inputBytes: origStr.length, outputBytes: finalStr.length, audit,
  });
  return { sanitized: current, audit };
}
