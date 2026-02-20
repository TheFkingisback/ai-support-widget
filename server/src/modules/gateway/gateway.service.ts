import crypto from 'node:crypto';
import { eq, and, asc } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { cases, messages, auditLog } from './gateway.schema.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors.js';
import { log } from '../../shared/logger.js';
import type {
  Case,
  Message,
  SuggestedAction,
  Evidence,
} from '../../../../shared/types.js';

function genId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

function toCase(row: typeof cases.$inferSelect): Case {
  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    status: row.status as Case['status'],
    snapshotId: row.snapshotId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    messageCount: row.messageCount,
    feedback: (row.feedback as Case['feedback']) ?? null,
  };
}

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
      const now = new Date();

      await db.insert(cases).values({
        id: caseId,
        tenantId,
        userId,
        status: 'active',
        snapshotId,
        createdAt: now,
        updatedAt: now,
        messageCount: 1,
      });

      const msgId = genId('msg');
      await db.insert(messages).values({
        id: msgId,
        caseId,
        role: 'user',
        content: firstMessage,
        actions: [],
        evidence: [],
        createdAt: now,
      });

      await db.insert(auditLog).values({
        id: genId('aud'),
        tenantId,
        userId,
        caseId,
        action: 'case_created',
        details: { firstMessage: firstMessage.slice(0, 100) },
        createdAt: now,
      });

      log.info('Case created', requestId, { caseId, tenantId, userId });

      const caseRow = await db
        .select()
        .from(cases)
        .where(eq(cases.id, caseId))
        .limit(1);
      const msgRow = await db
        .select()
        .from(messages)
        .where(eq(messages.id, msgId))
        .limit(1);

      return {
        case: toCase(caseRow[0]),
        message: toMessage(msgRow[0]),
      };
    },

    async addMessage(caseId, role, content, opts, requestId) {
      log.info('Adding message', requestId, { caseId, role });

      const caseRows = await db
        .select()
        .from(cases)
        .where(eq(cases.id, caseId))
        .limit(1);
      if (caseRows.length === 0) {
        throw new NotFoundError('Case', caseId);
      }

      const msgId = genId('msg');
      const now = new Date();

      await db.insert(messages).values({
        id: msgId,
        caseId,
        role,
        content,
        actions: opts?.actions ?? [],
        evidence: opts?.evidence ?? [],
        confidence: opts?.confidence ?? null,
        createdAt: now,
      });

      await db
        .update(cases)
        .set({
          messageCount: caseRows[0].messageCount + 1,
          updatedAt: now,
        })
        .where(eq(cases.id, caseId));

      log.info('Message added', requestId, { caseId, msgId, role });

      const msgRow = await db
        .select()
        .from(messages)
        .where(eq(messages.id, msgId))
        .limit(1);

      return toMessage(msgRow[0]);
    },

    async getCase(caseId, tenantId, requestId) {
      log.info('Getting case', requestId, { caseId, tenantId });

      const caseRows = await db
        .select()
        .from(cases)
        .where(and(eq(cases.id, caseId), eq(cases.tenantId, tenantId)))
        .limit(1);

      if (caseRows.length === 0) {
        throw new NotFoundError('Case', caseId);
      }

      const msgRows = await db
        .select()
        .from(messages)
        .where(eq(messages.caseId, caseId))
        .orderBy(asc(messages.createdAt));

      log.info('Case retrieved', requestId, {
        caseId,
        messageCount: msgRows.length,
      });

      return {
        case: toCase(caseRows[0]),
        messages: msgRows.map(toMessage),
      };
    },

    async addFeedback(caseId, tenantId, feedback, requestId) {
      log.info('Adding feedback', requestId, { caseId, feedback });

      const caseRows = await db
        .select()
        .from(cases)
        .where(and(eq(cases.id, caseId), eq(cases.tenantId, tenantId)))
        .limit(1);

      if (caseRows.length === 0) {
        throw new NotFoundError('Case', caseId);
      }

      await db
        .update(cases)
        .set({ feedback, updatedAt: new Date() })
        .where(and(eq(cases.id, caseId), eq(cases.tenantId, tenantId)));

      await db.insert(auditLog).values({
        id: genId('aud'),
        tenantId,
        userId: caseRows[0].userId,
        caseId,
        action: 'feedback_added',
        details: { feedback },
        createdAt: new Date(),
      });

      log.info('Feedback added', requestId, { caseId, feedback });
    },

    async escalateCase(caseId, tenantId, reason, requestId) {
      log.info('Escalating case', requestId, { caseId, reason });

      const caseRows = await db
        .select()
        .from(cases)
        .where(and(eq(cases.id, caseId), eq(cases.tenantId, tenantId)))
        .limit(1);

      if (caseRows.length === 0) {
        throw new NotFoundError('Case', caseId);
      }

      await db
        .update(cases)
        .set({ status: 'escalated', updatedAt: new Date() })
        .where(and(eq(cases.id, caseId), eq(cases.tenantId, tenantId)));

      await db.insert(auditLog).values({
        id: genId('aud'),
        tenantId,
        userId: caseRows[0].userId,
        caseId,
        action: 'case_escalated',
        details: { reason: reason ?? 'No reason provided' },
        createdAt: new Date(),
      });

      log.info('Case escalated', requestId, { caseId });
    },

    async logAudit(tenantId, userId, caseId, action, details, requestId) {
      log.debug('Logging audit', requestId, {
        tenantId,
        userId,
        caseId,
        action,
      });

      await db.insert(auditLog).values({
        id: genId('aud'),
        tenantId,
        userId,
        caseId,
        action,
        details,
        createdAt: new Date(),
      });
    },
  };
}
