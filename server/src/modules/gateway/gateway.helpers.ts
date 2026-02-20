import crypto from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { cases, auditLog } from './gateway.schema.js';
import { NotFoundError } from '../../shared/errors.js';
import { log } from '../../shared/logger.js';
import type {
  Case,
  SuggestedAction,
  Evidence,
} from '../../shared/types.js';

export function genId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

export function toCase(row: typeof cases.$inferSelect): Case {
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

export async function findCaseWithTenant(
  db: PostgresJsDatabase,
  caseId: string,
  tenantId: string,
): Promise<typeof cases.$inferSelect> {
  const rows = await db
    .select()
    .from(cases)
    .where(and(eq(cases.id, caseId), eq(cases.tenantId, tenantId)))
    .limit(1);

  if (rows.length === 0) {
    throw new NotFoundError('Case', caseId);
  }
  return rows[0];
}

export async function insertAudit(
  db: PostgresJsDatabase,
  tenantId: string,
  userId: string,
  caseId: string | null,
  action: string,
  details: Record<string, unknown>,
  requestId?: string,
): Promise<void> {
  log.debug('Logging audit', requestId, { tenantId, userId, caseId, action });
  await db.insert(auditLog).values({
    id: genId('aud'),
    tenantId,
    userId,
    caseId,
    action,
    details,
    createdAt: new Date(),
  });
}
