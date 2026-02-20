import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  real,
} from 'drizzle-orm/pg-core';

export const documents = pgTable('documents', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: text('category').notNull(), // doc | runbook | changelog | faq
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const documentChunks = pgTable('document_chunks', {
  id: text('id').primaryKey(),
  documentId: text('document_id').notNull(),
  content: text('content').notNull(),
  embedding: jsonb('embedding').notNull(), // number[] (1536 dimensions); real pgvector in prod
  chunkIndex: integer('chunk_index').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
