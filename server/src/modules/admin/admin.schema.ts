import {
  pgTable,
  text,
  timestamp,
  jsonb,
  varchar,
} from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  plan: varchar('plan', { length: 20 }).notNull().default('starter'),
  config: jsonb('config').notNull().default({}),
  apiBaseUrl: text('api_base_url').notNull(),
  serviceToken: text('service_token').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
