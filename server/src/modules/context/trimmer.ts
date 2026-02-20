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

function popUntilFits(
  arr: unknown[],
  current: unknown,
  maxBytes: number,
): number {
  let removed = 0;
  while (byteSize(current) > maxBytes && arr.length > 0) {
    arr.pop();
    removed++;
  }
  return removed;
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
  const asRecord = current as unknown as Record<string, unknown>;
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

  // Priority 3: Remove knowledge pack entries (oldest first = end of array)
  docsRemoved += popUntilFits(current.knowledgePack.changelog, current, maxBytes);
  docsRemoved += popUntilFits(current.knowledgePack.runbooks, current, maxBytes);
  docsRemoved += popUntilFits(current.knowledgePack.docs, current, maxBytes);

  // Priority 2: Cut recentActivity and backend (oldest first)
  eventsRemoved += popUntilFits(current.recentActivity.clickTimeline, current, maxBytes);
  eventsRemoved += popUntilFits(current.recentActivity.events, current, maxBytes);

  // Trim backend logs (oldest first)
  const requestsTrimmed = popUntilFits(current.backend.recentRequests, current, maxBytes);
  const jobsTrimmed = popUntilFits(current.backend.jobs, current, maxBytes);
  const errorsTrimmed = popUntilFits(current.backend.errors, current, maxBytes);
  logsTrimmed = requestsTrimmed + jobsTrimmed + errorsTrimmed > 0;

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
