import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { log } from './logger.js';

let client: ReturnType<typeof postgres> | null = null;
let db: PostgresJsDatabase | null = null;

export function getDb(databaseUrl?: string): PostgresJsDatabase {
  if (db) return db;

  const url = databaseUrl ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }

  client = postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  db = drizzle(client);
  log.info('Database connection established');
  return db;
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.end();
    client = null;
    db = null;
    log.info('Database connection closed');
  }
}
