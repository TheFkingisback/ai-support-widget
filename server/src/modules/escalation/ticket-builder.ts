import { log } from '../../shared/logger.js';
import type { Case, Message, SupportContextSnapshot } from '../../../../shared/types.js';
import type { TicketPayload } from './connectors/connector.js';

const PRIORITY_BY_ERROR_CLASS: Record<string, TicketPayload['priority']> = {
  infra: 'high',
  permission: 'normal',
  business: 'normal',
  validation: 'low',
};

function extractEvidence(messages: Message[]): string[] {
  const evidence: string[] = [];
  for (const msg of messages) {
    for (const ev of msg.evidence) {
      evidence.push(`${ev.label}: ${ev.value}`);
    }
  }
  return evidence;
}

function buildClickTimelineSection(snapshot: SupportContextSnapshot | null): string {
  if (!snapshot?.recentActivity?.clickTimeline?.length) {
    return 'No click timeline available.';
  }
  return snapshot.recentActivity.clickTimeline
    .map((entry) => `[${entry.ts}] ${entry.page} — ${entry.action}`)
    .join('\n');
}

function buildSystemStateSection(snapshot: SupportContextSnapshot | null): string {
  if (!snapshot) return 'No snapshot available.';
  const parts: string[] = [];
  const { activeErrors } = snapshot.productState;
  if (activeErrors.length > 0) {
    parts.push('Active errors: ' + activeErrors.map((e) => e.errorCode).join(', '));
  }
  const { limitsReached } = snapshot.productState;
  if (limitsReached.length > 0) {
    parts.push('Limits: ' + limitsReached.map((l) => `${l.limit} ${l.current}/${l.max}`).join(', '));
  }
  parts.push(`Plan: ${snapshot.identity.plan}`);
  parts.push(`Roles: ${snapshot.identity.roles.join(', ') || 'none'}`);
  return parts.join('\n') || 'No system state available.';
}

function determinePriority(snapshot: SupportContextSnapshot | null): TicketPayload['priority'] {
  if (!snapshot) return 'normal';
  const errors = snapshot.productState.activeErrors;
  if (errors.length === 0) return 'normal';

  let highest: TicketPayload['priority'] = 'low';
  const order: TicketPayload['priority'][] = ['low', 'normal', 'high', 'urgent'];
  for (const err of errors) {
    const p = PRIORITY_BY_ERROR_CLASS[err.errorClass] ?? 'normal';
    if (order.indexOf(p) > order.indexOf(highest)) {
      highest = p;
    }
  }
  return highest;
}

function extractTags(snapshot: SupportContextSnapshot | null): string[] {
  if (!snapshot) return [];
  return snapshot.productState.activeErrors.map((e) => e.errorCode);
}

export function buildTicket(
  caseData: Case,
  messages: Message[],
  snapshot: SupportContextSnapshot | null,
  requestId?: string,
): TicketPayload {
  log.info('Building ticket payload', requestId, { caseId: caseData.id });

  const firstUserMsg = messages.find((m) => m.role === 'user');
  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');
  const evidence = extractEvidence(messages);
  const clickTimeline = buildClickTimelineSection(snapshot);
  const systemState = buildSystemStateSection(snapshot);

  const summary = firstUserMsg
    ? firstUserMsg.content.slice(0, 120)
    : `Support case ${caseData.id}`;

  const descriptionParts = [
    '## User Reported',
    firstUserMsg?.content ?? 'No user message.',
    '',
    '## AI Diagnosis',
    lastAssistantMsg?.content ?? 'No AI diagnosis available.',
    '',
    '## Evidence',
    evidence.length > 0 ? evidence.join('\n') : 'No evidence extracted.',
    '',
    '## Click Timeline',
    clickTimeline,
    '',
    '## System State',
    systemState,
  ];

  const payload: TicketPayload = {
    summary,
    description: descriptionParts.join('\n'),
    tags: extractTags(snapshot),
    priority: determinePriority(snapshot),
    caseId: caseData.id,
    tenantId: caseData.tenantId,
  };

  log.info('Ticket payload built', requestId, {
    caseId: caseData.id,
    priority: payload.priority,
    tagCount: payload.tags.length,
  });

  return payload;
}
