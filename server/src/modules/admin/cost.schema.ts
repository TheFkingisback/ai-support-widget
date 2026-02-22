import {
  pgTable,
  text,
  timestamp,
  integer,
  real,
} from 'drizzle-orm/pg-core';

export const llmCosts = pgTable('llm_costs', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  model: text('model').notNull(),
  tokensIn: integer('tokens_in').notNull().default(0),
  tokensOut: integer('tokens_out').notNull().default(0),
  estimatedCost: real('estimated_cost').notNull().default(0),
  caseId: text('case_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
