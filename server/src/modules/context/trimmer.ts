import type { SupportContextSnapshot } from '@shared/types.js';
import { log } from '../../shared/logger.js';

export interface TruncationInfo {
  originalBytes: number;
  finalBytes: number;
  eventsRemoved: number;
  logsTrimmed: boolean;
  docsRemoved: number;
}

function byteSize(obj: unknown): number {
  return Buffer.byteLength(JSON.stringify(obj), 'utf-8');
}

function compressText(text: string, maxChars = 200): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '...';
}

export function trimToSize(
  snapshot: SupportContextSnapshot,
  maxBytes: number,
  requestId?: string,
): { trimmed: SupportContextSnapshot; truncation: TruncationInfo } {
  const originalBytes = byteSize(snapshot);
  let eventsRemoved = 0;
  let logsTrimmed = false;
  let docsRemoved = 0;

  if (originalBytes <= maxBytes) {
    log.info(`trimToSize: already under limit (${originalBytes}/${maxBytes} bytes)`, requestId);
    return {
      trimmed: snapshot,
      truncation: { originalBytes, finalBytes: originalBytes, eventsRemoved, logsTrimmed, docsRemoved },
    };
  }

  // Work on a deep copy
  let current: SupportContextSnapshot = JSON.parse(JSON.stringify(snapshot));

  // Remove _ranking metadata if present (from ranker)
  const asRecord = current as Record<string, unknown>;
  if ('_ranking' in asRecord) {
    delete asRecord['_ranking'];
  }

  // Priority 4: No attachments section in current type, skip

  // Priority 3: Cut knowledgePack — oldest/last items first
  // Compress long doc content first
  if (byteSize(current) > maxBytes) {
    for (const doc of current.knowledgePack.docs) {
      doc.content = compressText(doc.content);
    }
    for (const doc of current.knowledgePack.runbooks) {
      doc.content = compressText(doc.content);
    }
  }

  // Remove changelog entries (oldest first = end of array)
  while (byteSize(current) > maxBytes && current.knowledgePack.changelog.length > 0) {
    current.knowledgePack.changelog.pop();
    docsRemoved++;
  }

  // Remove runbooks (oldest first = end of array)
  while (byteSize(current) > maxBytes && current.knowledgePack.runbooks.length > 0) {
    current.knowledgePack.runbooks.pop();
    docsRemoved++;
  }

  // Remove docs (oldest first = end of array)
  while (byteSize(current) > maxBytes && current.knowledgePack.docs.length > 0) {
    current.knowledgePack.docs.pop();
    docsRemoved++;
  }

  // Priority 2: Cut recentActivity and backend — oldest items first (end of sorted arrays)
  // Remove click timeline entries (oldest first)
  while (byteSize(current) > maxBytes && current.recentActivity.clickTimeline.length > 0) {
    current.recentActivity.clickTimeline.pop();
    eventsRemoved++;
  }

  // Remove events (oldest first)
  while (byteSize(current) > maxBytes && current.recentActivity.events.length > 0) {
    current.recentActivity.events.pop();
    eventsRemoved++;
  }

  // Trim backend recent requests (oldest first)
  while (byteSize(current) > maxBytes && current.backend.recentRequests.length > 0) {
    current.backend.recentRequests.pop();
    logsTrimmed = true;
  }

  // Trim backend jobs (oldest first)
  while (byteSize(current) > maxBytes && current.backend.jobs.length > 0) {
    current.backend.jobs.pop();
    logsTrimmed = true;
  }

  // Trim backend errors (oldest first)
  while (byteSize(current) > maxBytes && current.backend.errors.length > 0) {
    current.backend.errors.pop();
    logsTrimmed = true;
  }

  // Update meta truncation
  current = {
    ...current,
    meta: {
      ...current.meta,
      maxBytes,
      truncation: {
        eventsRemoved,
        logsTrimmed,
        docsRemoved,
      },
    },
  };

  const finalBytes = byteSize(current);

  log.info(`trimToSize: trimmed from ${originalBytes} to ${finalBytes} bytes`, requestId, {
    originalBytes,
    finalBytes,
    maxBytes,
    eventsRemoved,
    logsTrimmed,
    docsRemoved,
  });

  return {
    trimmed: current,
    truncation: { originalBytes, finalBytes, eventsRemoved, logsTrimmed, docsRemoved },
  };
}
