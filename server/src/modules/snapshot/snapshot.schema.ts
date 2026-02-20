import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core';

export const snapshots = pgTable('snapshots', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  userId: text('user_id').notNull(),
  caseId: text('case_id').notNull(),
  data: jsonb('data').notNull(),
  bytesTotal: integer('bytes_total').notNull().default(0),
  truncation: jsonb('truncation').notNull().default({
    eventsRemoved: 0,
    logsTrimmed: false,
    docsRemoved: 0,
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
