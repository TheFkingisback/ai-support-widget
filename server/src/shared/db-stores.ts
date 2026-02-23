import { eq, and, desc, lt, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { tenants } from '../modules/admin/admin.schema.js';
import { auditLog } from '../modules/gateway/gateway.schema.js';
import { llmCosts } from '../modules/admin/cost.schema.js';
import type { TenantStore, TenantRecord } from '../modules/admin/tenant.service.js';
import type { CostStore } from '../modules/admin/cost.service.js';
import type { AuditStore } from '../modules/admin/audit.service.js';
import type { TenantConfig, LLMCostEntry, AuditEntry } from './types.js';

function toTenantRecord(row: typeof tenants.$inferSelect): TenantRecord {
  return {
    id: row.id, name: row.name, plan: row.plan,
    config: row.config as TenantConfig,
    apiBaseUrl: row.apiBaseUrl,
    serviceToken: row.serviceToken,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function createDbTenantStore(db: PostgresJsDatabase): TenantStore {
  return {
    async save(rec) {
      await db.insert(tenants).values({
        id: rec.id, name: rec.name, plan: rec.plan,
        config: rec.config,
        apiBaseUrl: rec.apiBaseUrl,
        serviceToken: rec.serviceToken,
        createdAt: new Date(rec.createdAt),
        updatedAt: new Date(rec.updatedAt),
      });
    },
    async update(id, fields) {
      const updates: Record<string, unknown> = {};
      if (fields.name !== undefined) updates.name = fields.name;
      if (fields.plan !== undefined) updates.plan = fields.plan;
      if (fields.config !== undefined) updates.config = fields.config;
      if (fields.updatedAt !== undefined) updates.updatedAt = new Date(fields.updatedAt);
      await db.update(tenants).set(updates).where(eq(tenants.id, id));
    },
    async findById(id) {
      const rows = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
      return rows.length > 0 ? toTenantRecord(rows[0]) : null;
    },
    async delete(id) {
      await db.delete(tenants).where(eq(tenants.id, id));
    },
    async findAll() {
      const rows = await db.select().from(tenants).orderBy(desc(tenants.createdAt));
      return rows.map(toTenantRecord);
    },
    async findByAdminKeyHash(hash) {
      const rows = await db.select().from(tenants)
        .where(sql`${tenants.config}->>'adminApiKeyHash' = ${hash}`)
        .limit(1);
      return rows.length > 0 ? toTenantRecord(rows[0]) : null;
    },
  };
}

function toLLMCostEntry(row: typeof llmCosts.$inferSelect): LLMCostEntry {
  return {
    id: row.id, tenantId: row.tenantId, model: row.model,
    tokensIn: row.tokensIn, tokensOut: row.tokensOut,
    estimatedCost: row.estimatedCost,
    caseId: row.caseId,
    createdAt: row.createdAt.toISOString(),
  };
}

export function createDbCostStore(db: PostgresJsDatabase): CostStore {
  return {
    async insert(entry) {
      await db.insert(llmCosts).values({
        id: entry.id, tenantId: entry.tenantId, model: entry.model,
        tokensIn: entry.tokensIn, tokensOut: entry.tokensOut,
        estimatedCost: entry.estimatedCost,
        caseId: entry.caseId,
        createdAt: new Date(entry.createdAt),
      });
    },
    async findByTenantAndMonth(tenantId, month) {
      const rows = await db.select().from(llmCosts)
        .where(and(
          eq(llmCosts.tenantId, tenantId),
          sql`to_char(${llmCosts.createdAt}, 'YYYY-MM') = ${month}`,
        ))
        .orderBy(desc(llmCosts.createdAt));
      return rows.map(toLLMCostEntry);
    },
  };
}

function toAuditEntry(row: typeof auditLog.$inferSelect): AuditEntry {
  return {
    id: row.id, tenantId: row.tenantId, userId: row.userId,
    caseId: row.caseId, action: row.action,
    details: row.details as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
  };
}

export function createDbAuditStore(db: PostgresJsDatabase): AuditStore {
  return {
    async findByTenant(tenantId, page, pageSize) {
      const offset = (page - 1) * pageSize;
      const rows = await db.select().from(auditLog)
        .where(eq(auditLog.tenantId, tenantId))
        .orderBy(desc(auditLog.createdAt))
        .limit(pageSize).offset(offset);

      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(auditLog).where(eq(auditLog.tenantId, tenantId));
      const total = Number(countResult[0]?.count ?? 0);

      return { entries: rows.map(toAuditEntry), total };
    },
    async purgeOlderThan(tenantId, olderThan) {
      const cutoff = new Date(olderThan);
      const result = await db.delete(auditLog).where(
        and(eq(auditLog.tenantId, tenantId), lt(auditLog.createdAt, cutoff)),
      );
      return Number(result?.length ?? 0);
    },
  };
}
