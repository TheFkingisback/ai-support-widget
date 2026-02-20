import type { SupportContextSnapshot } from '@shared/types.js';
import { log } from '../../shared/logger.js';
import { sanitize, type SanitizationAudit } from './sanitizer.js';
import { rankByRelevance } from './ranker.js';
import { trimToSize, type TruncationInfo } from './trimmer.js';

export interface ContextAudit {
  sanitization: SanitizationAudit;
  truncation: TruncationInfo;
  inputBytes: number;
  outputBytes: number;
}

export interface ContextService {
  processContext(
    snapshot: SupportContextSnapshot,
    maxBytes: number,
    requestId?: string,
  ): { processed: SupportContextSnapshot; audit: ContextAudit };
}

export function createContextService(): ContextService {
  return {
    processContext(
      snapshot: SupportContextSnapshot,
      maxBytes: number,
      requestId?: string,
    ): { processed: SupportContextSnapshot; audit: ContextAudit } {
      log.info('processContext: starting pipeline', requestId, {
        inputBytes: Buffer.byteLength(JSON.stringify(snapshot), 'utf-8'),
      });

      // Step 1: Sanitize
      const { sanitized, audit: sanitizationAudit } = sanitize(snapshot, requestId);

      // Step 2: Rank
      const ranked = rankByRelevance(sanitized, requestId);

      // Step 3: Trim
      const { trimmed, truncation } = trimToSize(ranked, maxBytes, requestId);

      const inputBytes = Buffer.byteLength(JSON.stringify(snapshot), 'utf-8');
      const outputBytes = Buffer.byteLength(JSON.stringify(trimmed), 'utf-8');

      const audit: ContextAudit = {
        sanitization: sanitizationAudit,
        truncation,
        inputBytes,
        outputBytes,
      };

      log.info('processContext: pipeline complete', requestId, {
        inputBytes,
        outputBytes,
        truncationSummary: truncation,
      });

      return { processed: trimmed, audit };
    },
  };
}
