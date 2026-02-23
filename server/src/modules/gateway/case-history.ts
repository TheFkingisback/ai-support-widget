import { eq, and, desc, ne, gte, asc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { cases, messages } from './gateway.schema.js';
import { log } from '../../shared/logger.js';

export interface CaseSummary {
  caseId: string;
  status: string;
  createdAt: string;
  messageCount: number;
  firstUserMessage: string;
  lastAssistantMessage: string;
}

export interface CaseHistoryMessage {
  role: string;
  content: string;
  createdAt: string;
}

export interface CaseHistoryEntry {
  caseId: string;
  status: string;
  createdAt: string;
  messages: CaseHistoryMessage[];
}

const MAX_PREVIOUS_CASES = 5;
const MAX_MSG_LENGTH = 200;
const MAX_HISTORY_CASES = 20;
const MAX_MSG_CONTENT = 500;
const HISTORY_WINDOW_DAYS = 30;

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '...' : text;
}

/**
 * Returns compressed summaries of a user's previous support cases.
 */
export async function getPreviousCaseSummaries(
  db: PostgresJsDatabase,
  tenantId: string,
  userId: string,
  currentCaseId: string,
  requestId?: string,
): Promise<CaseSummary[]> {
  log.debug('getPreviousCaseSummaries: fetching', requestId, { tenantId, userId, currentCaseId });

  const prevCases = await db
    .select({
      id: cases.id, status: cases.status,
      createdAt: cases.createdAt, messageCount: cases.messageCount,
    })
    .from(cases)
    .where(and(eq(cases.tenantId, tenantId), eq(cases.userId, userId), ne(cases.id, currentCaseId)))
    .orderBy(desc(cases.createdAt))
    .limit(MAX_PREVIOUS_CASES);

  if (prevCases.length === 0) return [];

  const summaries: CaseSummary[] = [];
  for (const c of prevCases) {
    const firstUser = await db.select({ content: messages.content }).from(messages)
      .where(and(eq(messages.caseId, c.id), eq(messages.role, 'user')))
      .orderBy(messages.createdAt).limit(1);
    const lastAssistant = await db.select({ content: messages.content }).from(messages)
      .where(and(eq(messages.caseId, c.id), eq(messages.role, 'assistant')))
      .orderBy(desc(messages.createdAt)).limit(1);

    summaries.push({
      caseId: c.id, status: c.status,
      createdAt: c.createdAt.toISOString(), messageCount: c.messageCount,
      firstUserMessage: truncate(firstUser[0]?.content ?? '', MAX_MSG_LENGTH),
      lastAssistantMessage: truncate(lastAssistant[0]?.content ?? '', MAX_MSG_LENGTH),
    });
  }

  log.debug('getPreviousCaseSummaries: done', requestId, { count: summaries.length });
  return summaries;
}

/**
 * Returns full conversation threads from the last 30 days for this user.
 * Includes all messages per case (truncated at 500 chars each).
 */
export async function getFullCaseHistory(
  db: PostgresJsDatabase,
  tenantId: string,
  userId: string,
  currentCaseId: string,
  requestId?: string,
): Promise<CaseHistoryEntry[]> {
  log.debug('getFullCaseHistory: fetching', requestId, { tenantId, userId });

  const cutoff = new Date(Date.now() - HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const prevCases = await db
    .select({ id: cases.id, status: cases.status, createdAt: cases.createdAt })
    .from(cases)
    .where(and(
      eq(cases.tenantId, tenantId), eq(cases.userId, userId),
      ne(cases.id, currentCaseId), gte(cases.createdAt, cutoff),
    ))
    .orderBy(desc(cases.createdAt))
    .limit(MAX_HISTORY_CASES);

  if (prevCases.length === 0) return [];

  const result: CaseHistoryEntry[] = [];
  for (const c of prevCases) {
    const msgs = await db
      .select({ role: messages.role, content: messages.content, createdAt: messages.createdAt })
      .from(messages)
      .where(eq(messages.caseId, c.id))
      .orderBy(asc(messages.createdAt));

    result.push({
      caseId: c.id,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      messages: msgs.map((m) => ({
        role: m.role,
        content: truncate(m.content, MAX_MSG_CONTENT),
        createdAt: m.createdAt.toISOString(),
      })),
    });
  }

  log.debug('getFullCaseHistory: done', requestId, {
    cases: result.length,
    totalMessages: result.reduce((sum, c) => sum + c.messages.length, 0),
  });
  return result;
}
