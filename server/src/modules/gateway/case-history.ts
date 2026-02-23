import { eq, and, desc, ne, sql } from 'drizzle-orm';
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

const MAX_PREVIOUS_CASES = 5;
const MAX_MSG_LENGTH = 200;

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '...' : text;
}

/**
 * Returns compressed summaries of a user's previous support cases.
 * Only fetches cases for the same tenant+user, excluding the current case.
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
      id: cases.id,
      status: cases.status,
      createdAt: cases.createdAt,
      messageCount: cases.messageCount,
    })
    .from(cases)
    .where(
      and(
        eq(cases.tenantId, tenantId),
        eq(cases.userId, userId),
        ne(cases.id, currentCaseId),
      ),
    )
    .orderBy(desc(cases.createdAt))
    .limit(MAX_PREVIOUS_CASES);

  if (prevCases.length === 0) return [];

  const summaries: CaseSummary[] = [];
  for (const c of prevCases) {
    const firstUser = await db
      .select({ content: messages.content })
      .from(messages)
      .where(and(eq(messages.caseId, c.id), eq(messages.role, 'user')))
      .orderBy(messages.createdAt)
      .limit(1);

    const lastAssistant = await db
      .select({ content: messages.content })
      .from(messages)
      .where(and(eq(messages.caseId, c.id), eq(messages.role, 'assistant')))
      .orderBy(desc(messages.createdAt))
      .limit(1);

    summaries.push({
      caseId: c.id,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      messageCount: c.messageCount,
      firstUserMessage: truncate(firstUser[0]?.content ?? '', MAX_MSG_LENGTH),
      lastAssistantMessage: truncate(lastAssistant[0]?.content ?? '', MAX_MSG_LENGTH),
    });
  }

  log.debug('getPreviousCaseSummaries: done', requestId, { count: summaries.length });
  return summaries;
}
