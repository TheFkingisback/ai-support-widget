import { eq } from 'drizzle-orm';
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { tenants } from '../admin/admin.schema.js';

export const integrationCredentials = pgTable('integration_credentials', {
  tenantId: text('tenant_id').primaryKey().references(() => tenants.id, { onDelete: 'cascade' }),
  id: text('id').notNull().unique(),
  tokenHash: text('token_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
export interface IntegrationCredential { tenantId: string; id: string; tokenHash: string; createdAt: Date }
export interface SessionStore {
  findByTenant(tenantId: string): Promise<IntegrationCredential | null>;
  findById(id: string): Promise<IntegrationCredential | null>;
  replace(credential: IntegrationCredential): Promise<void>;
  revoke(tenantId: string): Promise<void>;
}
export function createSessionStore(db: PostgresJsDatabase): SessionStore {
  return {
    async findByTenant(id) {
      return (await db.select().from(integrationCredentials).where(eq(integrationCredentials.tenantId, id)).limit(1))[0] ?? null;
    },
    async findById(id) {
      return (await db.select().from(integrationCredentials).where(eq(integrationCredentials.id, id)).limit(1))[0] ?? null;
    },
    async replace(record) {
      await db.insert(integrationCredentials).values(record).onConflictDoUpdate({
        target: integrationCredentials.tenantId, set: record,
      });
    },
    async revoke(id) { await db.delete(integrationCredentials).where(eq(integrationCredentials.tenantId, id)); },
  };
}
