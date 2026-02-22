import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  real,
  varchar,
} from 'drizzle-orm/pg-core';

export const cases = pgTable('cases', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  userId: text('user_id').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  snapshotId: text('snapshot_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  messageCount: integer('message_count').notNull().default(0),
  feedback: varchar('feedback', { length: 10 }),
  rating: integer('rating'),
});

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  caseId: text('case_id').notNull(),
  role: varchar('role', { length: 20 }).notNull(),
  content: text('content').notNull(),
  actions: jsonb('actions').notNull().default([]),
  evidence: jsonb('evidence').notNull().default([]),
  confidence: real('confidence'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable('audit_log', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  userId: text('user_id').notNull(),
  caseId: text('case_id'),
  action: text('action').notNull(),
  details: jsonb('details').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
