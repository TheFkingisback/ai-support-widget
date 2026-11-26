import { ValidationError } from './errors.js';
import { sessionRetention } from '../modules/admin/session-retention.js';
import type { PlatformTotals } from '../modules/admin/session-admin.routes.js';
import { eq, and, desc, asc, inArray, sql } from 'drizzle-orm';
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
    rating: row.rating ?? null,
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
    ...sessionRetention(db),
    async findCase(id) {
      const [row] = await db.select().from(cases).where(eq(cases.id, id));
      return row ? toCase(row) : null;
    },
    async list({ before, limit, status, search }) {
      let position: { time: string; id: string } | undefined;
      if (before) {
        try {
          const value = JSON.parse(Buffer.from(before, 'base64url').toString('utf8'));
          if (typeof value.id !== 'string' || typeof value.time !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(value.time) || !Number.isFinite(Date.parse(value.time))) throw new Error();
          position = value;
        } catch { throw new ValidationError('Invalid pagination cursor', 'before'); }
      }
      const rows = await db.select({
        entry: cases,
        time: sql<string>`to_char(${cases.createdAt} at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
        count: sql<number>`(select count(*)::int from messages m where m.case_id=${cases.id})`,
        hasSnapshot: sql<boolean>`exists(select 1 from snapshots s where s.case_id=${cases.id})`,
        llmCalls: sql<number>`(select count(*)::int from llm_costs l where l.case_id=${cases.id})`,
        totalCost: sql<number>`(select coalesce(sum(l.estimated_cost),0)::float8 from llm_costs l where l.case_id=${cases.id})`,
      }).from(cases).where(and(
        position ? sql`(${cases.createdAt},${cases.id}) < (${position.time}::timestamptz,${position.id})` : undefined,
        status ? eq(cases.status,status) : undefined,
        search ? sql`(strpos(${cases.id},${search})>0 or strpos(${cases.userId},${search})>0)` : undefined,
      )).orderBy(desc(cases.createdAt),desc(cases.id)).limit(limit + 1);
      const sessions = rows.slice(0,limit).map(r => ({ ...toCase(r.entry), messageCount: r.count, hasSnapshot: r.hasSnapshot, llmCalls: r.llmCalls, totalCost: r.totalCost }));
      const last = rows[limit - 1];
      const next = rows.length > limit ? Buffer.from(JSON.stringify({ time: last.time, id: last.entry.id })).toString('base64url') : null;
      return { sessions, next };
    },
    async totals() {
      const [row] = await db.execute<PlatformTotals & Record<string, unknown>>(sql`select
        count(*) filter(where status='active')::int as "activeSessions",
        count(*) filter(where status='resolved')::int as "resolvedSessions",
        coalesce(avg((status='resolved')::int),0)::float8 as "resolutionRate",
        coalesce(avg(message_count),0)::float8 as "avgMessages",
        coalesce(avg(extract(epoch from (first_reply - c.created_at))*1000),0)::float8 as "avgResponseMs",
        (select coalesce(sum(estimated_cost),0)::float8 from llm_costs) as "totalCost"
        from cases c left join lateral (select min(m.created_at) as first_reply from messages m
          where m.case_id=c.id and m.role='assistant') replies on true`);
      return row;
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
  };
}
