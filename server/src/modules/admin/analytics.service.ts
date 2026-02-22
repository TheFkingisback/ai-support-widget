import { log } from '../../shared/logger.js';
import type { AnalyticsSummary, Case, Message, SupportContextSnapshot } from '../../shared/types.js';

export interface AnalyticsDataSource {
  getCasesByTenant(tenantId: string): Promise<Case[]>;
  getMessagesByCases(caseIds: string[]): Promise<Message[]>;
  getSnapshotsByTenant(tenantId: string): Promise<SupportContextSnapshot[]>;
}

export interface AnalyticsService {
  getAnalytics(tenantId: string, requestId?: string): Promise<AnalyticsSummary>;
}

function topCountsFromMap<K extends string>(
  counts: Map<string, number>,
  keyName: K,
  limit = 10,
): (Record<K, string> & { count: number })[] {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ [keyName]: key, count }) as Record<K, string> & { count: number });
}

function extractIntents(messages: Message[]): { intent: string; count: number }[] {
  const counts = new Map<string, number>();
  const userMsgs = messages.filter((msg) => msg.role === 'user');

  for (const msg of userMsgs) {
    const words = msg.content.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length > 3) {
        counts.set(word, (counts.get(word) ?? 0) + 1);
      }
    }
  }

  return topCountsFromMap(counts, 'intent');
}

function extractTopErrors(
  snapshots: SupportContextSnapshot[],
): { errorCode: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const snap of snapshots) {
    for (const err of snap.productState.activeErrors) {
      counts.set(err.errorCode, (counts.get(err.errorCode) ?? 0) + 1);
    }
  }

  return topCountsFromMap(counts, 'errorCode');
}

export function createAnalyticsService(
  dataSource: AnalyticsDataSource,
): AnalyticsService {
  return {
    async getAnalytics(tenantId, requestId) {
      log.info('Computing analytics', requestId, { tenantId });

      const cases = await dataSource.getCasesByTenant(tenantId);
      const caseIds = cases.map((c) => c.id);
      const messages = caseIds.length > 0
        ? await dataSource.getMessagesByCases(caseIds)
        : [];
      const snapshots = await dataSource.getSnapshotsByTenant(tenantId);

      const totalCases = cases.length;
      const resolved = cases.filter((c) => c.status === 'resolved');
      const escalated = cases.filter((c) => c.status === 'escalated');
      const resolvedWithoutHuman = resolved.length;
      const resolutionRate = totalCases > 0
        ? resolvedWithoutHuman / totalCases
        : 0;

      const resolvedMsgCounts = resolved.map((c) => c.messageCount);
      const avgMessagesPerResolution = resolvedMsgCounts.length > 0
        ? resolvedMsgCounts.reduce((a, b) => a + b, 0) / resolvedMsgCounts.length
        : 0;

      // Approximate time to first response: diff between case creation and first assistant msg
      const firstResponseTimes: number[] = [];
      const resolutionTimes: number[] = [];
      for (const resolvedCase of resolved) {
        const caseMsgs = messages
          .filter((m) => m.caseId === resolvedCase.id)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const firstAssistant = caseMsgs.find((m) => m.role === 'assistant');
        if (firstAssistant) {
          const diff = new Date(firstAssistant.createdAt).getTime() -
            new Date(resolvedCase.createdAt).getTime();
          firstResponseTimes.push(diff);
        }
        if (resolvedCase.resolvedAt) {
          resolutionTimes.push(
            new Date(resolvedCase.resolvedAt).getTime() - new Date(resolvedCase.createdAt).getTime(),
          );
        }
      }

      const avgTimeToFirstResponse = firstResponseTimes.length > 0
        ? firstResponseTimes.reduce((a, b) => a + b, 0) / firstResponseTimes.length
        : 0;
      const avgTimeToResolution = resolutionTimes.length > 0
        ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
        : 0;

      const positive = cases.filter((c) => c.feedback === 'positive').length;
      const negative = cases.filter((c) => c.feedback === 'negative').length;

      const ratings = cases
        .map((c) => c.rating)
        .filter((r): r is number => r !== null && r !== undefined);
      const avgRating = ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : 0;

      const summary: AnalyticsSummary = {
        totalCases,
        resolvedWithoutHuman,
        resolutionRate,
        avgMessagesPerResolution,
        avgTimeToFirstResponse,
        avgTimeToResolution,
        topIntents: extractIntents(messages),
        topErrors: extractTopErrors(snapshots),
        csat: { positive, negative, total: positive + negative },
        avgRating,
      };

      log.info('Analytics computed', requestId, { tenantId, totalCases });
      return summary;
    },
  };
}
