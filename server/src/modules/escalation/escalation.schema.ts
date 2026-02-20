import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const tickets = pgTable('tickets', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  caseId: text('case_id').notNull(),
  externalId: text('external_id').notNull(),
  externalUrl: text('external_url').notNull(),
  connector: varchar('connector', { length: 30 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
