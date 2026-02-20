import type { KnowledgeDoc, SupportContextSnapshot } from '../../../../shared/types.js';
import { log } from '../../shared/logger.js';
import type { Retriever } from './retriever.js';

const DEFAULT_MAX_DOCS = 5;

const CATEGORY_PRIORITY: Record<string, number> = {
  runbook: 0,
  doc: 1,
  changelog: 2,
  faq: 3,
};

export interface KnowledgeService {
  getRelevantDocs(
    tenantId: string,
    userMessage: string,
    snapshot: SupportContextSnapshot | null,
    maxDocs?: number,
    requestId?: string,
  ): Promise<KnowledgeDoc[]>;
}

export function createKnowledgeService(retriever: Retriever): KnowledgeService {
  return {
    async getRelevantDocs(tenantId, userMessage, snapshot, maxDocs, requestId) {
      const limit = maxDocs ?? DEFAULT_MAX_DOCS;
      log.info('knowledgeService: getRelevantDocs', requestId, {
        tenantId,
        maxDocs: limit,
      });

      // Combine user message with active error codes for better search
      const errorCodes = snapshot?.productState.activeErrors
        .map((e) => e.errorCode)
        .join(' ') ?? '';
      const searchQuery = `${userMessage} ${errorCodes}`.trim();

      // Fetch more than limit so we can re-sort by category priority
      const fetchLimit = limit * 2;
      const docs = await retriever.search(tenantId, searchQuery, fetchLimit, requestId);

      // Sort by category priority (runbooks > docs > changelog > faq)
      docs.sort((a, b) => {
        const pa = CATEGORY_PRIORITY[a.category] ?? 99;
        const pb = CATEGORY_PRIORITY[b.category] ?? 99;
        return pa - pb;
      });

      const result = docs.slice(0, limit);

      log.info('knowledgeService: docs retrieved', requestId, {
        tenantId,
        count: result.length,
        categories: result.map((d) => d.category),
      });

      return result;
    },
  };
}
