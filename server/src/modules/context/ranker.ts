import type { SupportContextSnapshot } from '@shared/types.js';
import { log } from '../../shared/logger.js';

export interface RankedSnapshot extends SupportContextSnapshot {
  _ranking: {
    priority1Count: number;
    priority2Count: number;
    priority3Count: number;
    priority4Count: number;
  };
}

function sortByTimestamp<T extends { ts?: string; createdAt?: string; occurredAt?: string }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const tsA = a.ts ?? a.createdAt ?? a.occurredAt ?? '';
    const tsB = b.ts ?? b.createdAt ?? b.occurredAt ?? '';
    return tsB.localeCompare(tsA); // newest first
  });
}

export function rankByRelevance(
  snapshot: SupportContextSnapshot,
  requestId?: string,
): RankedSnapshot {
  // Priority 1 (never removed): identity, productState (active errors)
  // These stay as-is, just count them
  const priority1Count =
    1 + // identity section
    snapshot.productState.activeErrors.length +
    snapshot.productState.entities.length +
    snapshot.productState.limitsReached.length;

  // Priority 2: recentActivity, backend - sort by recency
  const rankedEvents = sortByTimestamp(snapshot.recentActivity.events);
  const rankedClickTimeline = sortByTimestamp(snapshot.recentActivity.clickTimeline);
  const rankedRequests = sortByTimestamp(snapshot.backend.recentRequests);
  const rankedJobs = sortByTimestamp(snapshot.backend.jobs);
  const rankedErrors = sortByTimestamp(snapshot.backend.errors);

  const priority2Count =
    rankedEvents.length +
    rankedClickTimeline.length +
    rankedRequests.length +
    rankedJobs.length +
    rankedErrors.length;

  // Priority 3: knowledgePack
  const priority3Count =
    snapshot.knowledgePack.docs.length +
    snapshot.knowledgePack.runbooks.length +
    snapshot.knowledgePack.changelog.length;

  // Priority 4: no attachments section in current SCS type, so 0
  const priority4Count = 0;

  const ranked: RankedSnapshot = {
    ...snapshot,
    recentActivity: {
      ...snapshot.recentActivity,
      events: rankedEvents,
      clickTimeline: rankedClickTimeline,
    },
    backend: {
      ...snapshot.backend,
      recentRequests: rankedRequests,
      jobs: rankedJobs,
      errors: rankedErrors,
    },
    _ranking: {
      priority1Count,
      priority2Count,
      priority3Count,
      priority4Count,
    },
  };

  log.debug('rankByRelevance: ranking applied', requestId, {
    priority1Count,
    priority2Count,
    priority3Count,
    priority4Count,
  });

  return ranked;
}
