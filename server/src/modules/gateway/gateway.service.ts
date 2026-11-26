import { turnId } from './turn-identity.js';
import { eq, and, asc, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { cases, messages } from './gateway.schema.js';
import { NotFoundError } from '../../shared/errors.js';
import { safeText } from '../context/safe-content.js';
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
    userId: string,
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
    userId: string,
    requestId?: string,
  ): Promise<{ case: Case; messages: Message[] }>;

  addFeedback(
    caseId: string,
    tenantId: string,
    userId: string,
    feedback: 'positive' | 'negative',
    requestId?: string,
  ): Promise<void>;

  closeCase(
    caseId: string,
    tenantId: string,
    userId: string,
    resolution: 'resolved' | 'unresolved',
    rating: number | null,
    requestId?: string,
  ): Promise<void>;

  escalateCase(
    caseId: string,
    tenantId: string,
    userId: string,
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
      firstMessage = safeText(firstMessage);
      log.info('Creating case', requestId, { tenantId, userId });

      const caseId = turnId('cas') ?? genId('cas');
      const snapshotId = genId('scs');
      const msgId = genId('msg');
      const now = new Date();

      return db.transaction(async tx => {
        const inserted = await tx.insert(cases).values({
          id: caseId, tenantId, userId, status: 'active', snapshotId, createdAt: now, updatedAt: now, messageCount: 1,
        }).onConflictDoNothing().returning();
        const firstId = turnId('msg_user') ?? msgId;
        if (inserted.length) {
          await tx.insert(messages).values({ id: firstId, caseId, role: 'user', content: firstMessage, createdAt: now });
          await insertAudit(tx, tenantId, userId, caseId, 'case_created', { firstMessage: firstMessage.slice(0, 100) }, requestId);
        }
        const row = inserted[0] ?? await findCaseWithTenant(tx, caseId, tenantId, userId);
        const [first] = await tx.select().from(messages).where(and(eq(messages.id, firstId), eq(messages.caseId, caseId)));
        return { case: toCase(row), message: toMessage(first) };
      });
    },

    async addMessage(caseId, tenantId, userId, role, content, opts, requestId) {
      content = safeText(content);
      log.info('Adding message', requestId, { caseId, tenantId, userId, role });

      return db.transaction(async tx => {
        await findCaseWithTenant(tx, caseId, tenantId, userId);
        const id = turnId(`msg_${role}`) ?? genId('msg');
        const now = new Date();
        const [saved] = await tx.insert(messages).values({
          id, caseId, role, content, actions: opts?.actions ?? [], evidence: opts?.evidence ?? [],
          confidence: opts?.confidence ?? null, createdAt: now,
        }).onConflictDoNothing().returning();
        if (saved) {
          await tx.update(cases).set({ messageCount: sql`${cases.messageCount} + 1`, updatedAt: now })
            .where(and(eq(cases.id, caseId), eq(cases.tenantId, tenantId), eq(cases.userId, userId)));
          return toMessage(saved);
        }
        const [previous] = await tx.select().from(messages).where(and(eq(messages.id, id), eq(messages.caseId, caseId)));
        return toMessage(previous);
      });
    },

    async getCase(caseId, tenantId, userId, requestId) {
      log.info('Getting case', requestId, { caseId, tenantId, userId });
      const caseRow = await findCaseWithTenant(db, caseId, tenantId, userId);

      const msgRows = await db.select().from(messages)
        .where(eq(messages.caseId, caseId))
        .orderBy(asc(messages.createdAt));

      log.info('Case retrieved', requestId, { caseId, messageCount: msgRows.length });
      return { case: toCase(caseRow), messages: msgRows.map(toMessage) };
    },

    async addFeedback(caseId, tenantId, userId, feedback, requestId) {
      log.info('Adding feedback', requestId, { caseId, feedback });
      const caseRow = await findCaseWithTenant(db, caseId, tenantId, userId);

      await db.update(cases).set({ feedback, updatedAt: new Date() })
        .where(and(eq(cases.id, caseId), eq(cases.tenantId, tenantId), eq(cases.userId, userId)));

      await insertAudit(db, tenantId, caseRow.userId, caseId,
        'feedback_added', { feedback }, requestId);
      log.info('Feedback added', requestId, { caseId, feedback });
    },

    async closeCase(caseId, tenantId, userId, resolution, rating, requestId) {
      log.info('Closing case', requestId, { caseId, resolution, rating });
      const caseRow = await findCaseWithTenant(db, caseId, tenantId, userId);
      const now = new Date();
      const feedback = resolution === 'resolved' ? 'positive' : 'negative';

      await db.update(cases).set({
        status: resolution, feedback, rating,
        resolvedAt: now, updatedAt: now,
      }).where(and(eq(cases.id, caseId), eq(cases.tenantId, tenantId), eq(cases.userId, userId)));

      await insertAudit(db, tenantId, caseRow.userId, caseId,
        'case_closed', { resolution, rating }, requestId);
      log.info('Case closed', requestId, { caseId, resolution, rating });
    },

    async escalateCase(caseId, tenantId, userId, reason, requestId) {
      log.info('Escalating case', requestId, { caseId, reason });
      const caseRow = await findCaseWithTenant(db, caseId, tenantId, userId);

      await db.update(cases).set({ status: 'escalated', updatedAt: new Date() })
        .where(and(eq(cases.id, caseId), eq(cases.tenantId, tenantId), eq(cases.userId, userId)));

      await insertAudit(db, tenantId, caseRow.userId, caseId,
        'case_escalated', { reason: reason ?? 'No reason provided' }, requestId);
      log.info('Case escalated', requestId, { caseId });
    },

    async logAudit(tenantId, userId, caseId, action, details, requestId) {
      await insertAudit(db, tenantId, userId, caseId, action, details, requestId);
    },
  };
}
