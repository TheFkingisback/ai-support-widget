import { eq } from 'drizzle-orm';
import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { tenants } from '../admin/admin.schema.js';
import { decryptToken } from '../admin/encryption.js';
import type { McpClientOpts } from './mcp-client.js';

export const tenantMcp = pgTable('tenant_mcp', {
  tenantId: text('tenant_id').primaryKey().references(() => tenants.id, { onDelete: 'cascade' }),
  serverUrl: text('server_url').notNull(),
  encryptedToken: text('encrypted_token').notNull(),
  allowedTools: jsonb('allowed_tools').$type<string[]>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
export type McpRecord = typeof tenantMcp.$inferSelect;
export interface McpStore {
  find(tenantId: string): Promise<McpRecord | null>;
  save(record: McpRecord): Promise<void>;
  remove(tenantId: string): Promise<void>;
}
/** Stores each integration separately; secrets never enter the public tenant config. */
export function createMcpStore(db: PostgresJsDatabase): McpStore {
  return {
    async find(id) { return (await db.select().from(tenantMcp).where(eq(tenantMcp.tenantId, id)).limit(1))[0] ?? null; },
    async save(record) { await db.insert(tenantMcp).values(record).onConflictDoUpdate({ target: tenantMcp.tenantId, set: record }); },
    async remove(id) { await db.delete(tenantMcp).where(eq(tenantMcp.tenantId, id)); },
  };
}
/** Resolves only the authenticated tenant, with no global configuration or cache fallback. */
export function mcpResolver(store: McpStore): (tenantId: string) => Promise<McpClientOpts | undefined> {
  return async tenantId => {
    const record = await store.find(tenantId);
    if (!record || !record.allowedTools.length) return undefined;
    return { tenantId, serverUrl: record.serverUrl, serviceToken: decryptToken(record.encryptedToken), allowedTools: record.allowedTools };
  };
}
