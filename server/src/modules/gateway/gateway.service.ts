import { eq, and, asc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { cases, messages } from './gateway.schema.js';
import { NotFoundError } from '../../shared/errors.js';
import { log } from '../../shared/logger.js';
import { genId, toCase, findCaseWithTenant, insertAudit } from './gateway.helpers.js';
import type {
  Case,
  Message,
  SuggestedAction,
  Evidence,
} from '../../shared/types.js';

function toMessage(row: typeof messages.$inferSelect): Message {
  return {
    id: row.id,
    caseId: row.caseId,
    role: row.role as Message['role'],
    content: row.content,
    actions: (row.actions ?? []) as SuggestedAction[],
    evidence: (row.evidence ?? []) as Evidence[],
    confidence: row.confidence ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface GatewayService {
  createCase(
    tenantId: string,
    userId: string,
    firstMessage: string,
    requestId?: string,
  ): Promise<{ case: Case; message: Message }>;

  addMessage(
    caseId: string,
    tenantId: string,
    role: Message['role'],
    content: string,
    opts?: {
      actions?: SuggestedAction[];
      evidence?: Evidence[];
      confidence?: number | null;
    },
    requestId?: string,
  ): Promise<Message>;

  getCase(
    caseId: string,
    tenantId: string,
    requestId?: string,
  ): Promise<{ case: Case; messages: Message[] }>;

  addFeedback(
    caseId: string,
    tenantId: string,
    feedback: 'positive' | 'negative',
    requestId?: string,
  ): Promise<void>;

  closeCase(
    caseId: string,
    tenantId: string,
    resolution: 'resolved' | 'unresolved',
    rating: number,
    requestId?: string,
  ): Promise<void>;

  escalateCase(
    caseId: string,
    tenantId: string,
    reason: string | undefined,
    requestId?: string,
  ): Promise<void>;

  logAudit(
    tenantId: string,
    userId: string,
    caseId: string | null,
    action: string,
    details: Record<string, unknown>,
    requestId?: string,
  ): Promise<void>;
}

export function createGatewayService(
  db: PostgresJsDatabase,
): GatewayService {
  return {
    async createCase(tenantId, userId, firstMessage, requestId) {
      log.info('Creating case', requestId, { tenantId, userId });

      const caseId = genId('cas');
      const snapshotId = genId('scs');
      const msgId = genId('msg');
      const now = new Date();

      await db.insert(cases).values({
        id: caseId, tenantId, userId, status: 'active',
        snapshotId, createdAt: now, updatedAt: now, messageCount: 1,
      });

      await db.insert(messages).values({
        id: msgId, caseId, role: 'user', content: firstMessage,
        actions: [], evidence: [], createdAt: now,
      });

      await insertAudit(db, tenantId, userId, caseId, 'case_created',
        { firstMessage: firstMessage.slice(0, 100) }, requestId);

      log.info('Case created', requestId, { caseId, tenantId, userId });

      const caseRow = await db.select().from(cases)
        .where(eq(cases.id, caseId)).limit(1);
      const msgRow = await db.select().from(messages)
        .where(eq(messages.id, msgId)).limit(1);

      return { case: toCase(caseRow[0]), message: toMessage(msgRow[0]) };
    },

    async addMessage(caseId, tenantId, role, content, opts, requestId) {
      log.info('Adding message', requestId, { caseId, tenantId, role });

      const caseRow = await findCaseWithTenant(db, caseId, tenantId);

      const msgId = genId('msg');
      const now = new Date();

      await db.insert(messages).values({
        id: msgId, caseId, role, content,
        actions: opts?.actions ?? [], evidence: opts?.evidence ?? [],
        confidence: opts?.confidence ?? null, createdAt: now,
      });

      await db.update(cases).set({
        messageCount: caseRow.messageCount + 1, updatedAt: now,
      }).where(and(eq(cases.id, caseId), eq(cases.tenantId, tenantId)));

      log.info('Message added', requestId, { caseId, msgId, role });

      const msgRow = await db.select().from(messages)
        .where(eq(messages.id, msgId)).limit(1);
      return toMessage(msgRow[0]);
    },

    async getCase(caseId, tenantId, requestId) {
      log.info('Getting case', requestId, { caseId, tenantId });
      const caseRow = await findCaseWithTenant(db, caseId, tenantId);

      const msgRows = await db.select().from(messages)
        .where(eq(messages.caseId, caseId))
        .orderBy(asc(messages.createdAt));

      log.info('Case retrieved', requestId, { caseId, messageCount: msgRows.length });
      return { case: toCase(caseRow), messages: msgRows.map(toMessage) };
    },

    async addFeedback(caseId, tenantId, feedback, requestId) {
      log.info('Adding feedback', requestId, { caseId, feedback });
      const caseRow = await findCaseWithTenant(db, caseId, tenantId);

      await db.update(cases).set({ feedback, updatedAt: new Date() })
        .where(and(eq(cases.id, caseId), eq(cases.tenantId, tenantId)));

      await insertAudit(db, tenantId, caseRow.userId, caseId,
        'feedback_added', { feedback }, requestId);
      log.info('Feedback added', requestId, { caseId, feedback });
    },

    async closeCase(caseId, tenantId, resolution, rating, requestId) {
      log.info('Closing case', requestId, { caseId, resolution, rating });
      const caseRow = await findCaseWithTenant(db, caseId, tenantId);
      const now = new Date();
      const feedback = resolution === 'resolved' ? 'positive' : 'negative';

      await db.update(cases).set({
        status: resolution, feedback, rating,
        resolvedAt: now, updatedAt: now,
      }).where(and(eq(cases.id, caseId), eq(cases.tenantId, tenantId)));

      await insertAudit(db, tenantId, caseRow.userId, caseId,
        'case_closed', { resolution, rating }, requestId);
      log.info('Case closed', requestId, { caseId, resolution, rating });
    },

    async escalateCase(caseId, tenantId, reason, requestId) {
      log.info('Escalating case', requestId, { caseId, reason });
      const caseRow = await findCaseWithTenant(db, caseId, tenantId);

      await db.update(cases).set({ status: 'escalated', updatedAt: new Date() })
        .where(and(eq(cases.id, caseId), eq(cases.tenantId, tenantId)));

      await insertAudit(db, tenantId, caseRow.userId, caseId,
        'case_escalated', { reason: reason ?? 'No reason provided' }, requestId);
      log.info('Case escalated', requestId, { caseId });
    },

    async logAudit(tenantId, userId, caseId, action, details, requestId) {
      await insertAudit(db, tenantId, userId, caseId, action, details, requestId);
    },
  };
}
