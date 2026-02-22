import { eq, and, desc, asc, inArray, lt, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { cases, messages, auditLog } from '../modules/gateway/gateway.schema.js';
import { snapshots } from '../modules/snapshot/snapshot.schema.js';
import { llmCosts } from '../modules/admin/cost.schema.js';
import type { AnalyticsDataSource } from '../modules/admin/analytics.service.js';
import type { SessionDataSource } from '../modules/admin/session-admin.routes.js';
import type { Case, Message, SupportContextSnapshot, LLMCostEntry } from './types.js';

function toCase(row: typeof cases.$inferSelect): Case {
  return {
    id: row.id, tenantId: row.tenantId, userId: row.userId,
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
    id: row.id, caseId: row.caseId,
    role: row.role as Message['role'],
    content: row.content,
    actions: (row.actions ?? []) as Message['actions'],
    evidence: (row.evidence ?? []) as Message['evidence'],
    confidence: row.confidence ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function toCostEntry(row: typeof llmCosts.$inferSelect): LLMCostEntry {
  return {
    id: row.id, tenantId: row.tenantId, model: row.model,
    tokensIn: row.tokensIn, tokensOut: row.tokensOut,
    estimatedCost: row.estimatedCost, caseId: row.caseId,
    createdAt: row.createdAt.toISOString(),
  };
}

export function createDbAnalyticsDataSource(db: PostgresJsDatabase): AnalyticsDataSource {
  return {
    async getCasesByTenant(tenantId) {
      const rows = await db.select().from(cases)
        .where(eq(cases.tenantId, tenantId))
        .orderBy(desc(cases.createdAt));
      return rows.map(toCase);
    },
    async getMessagesByCases(caseIds) {
      if (caseIds.length === 0) return [];
      const rows = await db.select().from(messages)
        .where(inArray(messages.caseId, caseIds))
        .orderBy(asc(messages.createdAt));
      return rows.map(toMessage);
    },
    async getSnapshotsByTenant(tenantId) {
      const rows = await db.select().from(snapshots)
        .where(eq(snapshots.tenantId, tenantId));
      return rows.map((r) => r.data as SupportContextSnapshot);
    },
  };
}

export function createDbSessionDataSource(db: PostgresJsDatabase): SessionDataSource {
  return {
    async getAllCases() {
      const rows = await db.select().from(cases).orderBy(desc(cases.createdAt)).limit(200);
      return rows.map(toCase);
    },
    async getMessages(caseId) {
      const rows = await db.select().from(messages)
        .where(eq(messages.caseId, caseId))
        .orderBy(asc(messages.createdAt));
      return rows.map(toMessage);
    },
    async getSnapshotByCaseId(caseId) {
      const rows = await db.select().from(snapshots)
        .where(eq(snapshots.caseId, caseId)).limit(1);
      return rows.length > 0 ? (rows[0].data as SupportContextSnapshot) : null;
    },
    async getCostsByCaseId(caseId) {
      const rows = await db.select().from(llmCosts)
        .where(eq(llmCosts.caseId, caseId))
        .orderBy(desc(llmCosts.createdAt));
      return rows.map(toCostEntry);
    },
    async purgeOlderThan(olderThan) {
      const cutoff = new Date(olderThan);
      const oldCases = await db.select({ id: cases.id }).from(cases)
        .where(lt(cases.createdAt, cutoff));
      if (oldCases.length === 0) return 0;
      const ids = oldCases.map((c) => c.id);
      await db.delete(messages).where(inArray(messages.caseId, ids));
      await db.delete(snapshots).where(inArray(snapshots.caseId, ids));
      await db.delete(llmCosts).where(inArray(llmCosts.caseId, ids));
      await db.delete(auditLog).where(inArray(auditLog.caseId, ids));
      await db.delete(cases).where(inArray(cases.id, ids));
      return ids.length;
    },
  };
}
