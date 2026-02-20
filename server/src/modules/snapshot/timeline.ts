import { log } from '../../shared/logger.js';
import type { UserEvent, ClickTimelineEntry } from '../../shared/types.js';

export function buildClickTimeline(
  events: UserEvent[],
  requestId?: string,
): ClickTimelineEntry[] {
  const timeline: ClickTimelineEntry[] = events.map((event) => {
    const timeOnly = event.ts.includes('T')
      ? event.ts.split('T')[1].split('.')[0]
      : event.ts;

    const elementLabel = event.elementId
      ? ` ${event.elementId}${event.intent ? ` (${event.intent})` : ''}`
      : '';

    const action = `${event.event}${elementLabel}`;

    return {
      ts: timeOnly,
      page: event.page,
      action,
    };
  });

  log.debug('Timeline entries generated', requestId, {
    count: timeline.length,
  });

  return timeline;
}
