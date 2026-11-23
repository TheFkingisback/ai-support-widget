import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { AppError, ConflictError } from '../../shared/errors.js';

type Scope = { tenantId: string; userId: string; clientId: string; operation: string; input: unknown };
type Stored = { value: unknown } | { error: { status: number; code: string; message: string } };
export interface TurnIdempotency {
  run<T>(scope: Scope, execute: () => Promise<T>): Promise<T>;
}

export function createTurnIdempotency(db: PostgresJsDatabase): TurnIdempotency {
  return {
    async run<T>({ tenantId, userId, clientId, operation, input }: Scope, execute: () => Promise<T>) {
      const fingerprint = createHash('sha256').update(JSON.stringify([operation, input])).digest('hex');
      const existingTurn = sql`tenant_id = ${tenantId} and user_id = ${userId} and client_id = ${clientId}`;
      const [reservation] = await db.execute(sql`insert into widget_turn_requests (tenant_id, user_id, client_id, fingerprint)
        values (${tenantId}, ${userId}, ${clientId}, ${fingerprint}) on conflict do nothing returning client_id`);
      if (!reservation) {
        const [row] = await db.execute<{ fingerprint: string; result: Stored | null }>(sql`select fingerprint, result
          from widget_turn_requests where ${existingTurn}`);
        if (!row || row.fingerprint !== fingerprint) throw new ConflictError('This message ID is already in use', 'TURN_ID_CONFLICT');
        if (!row.result) throw new ConflictError('This message is still being processed', 'TURN_IN_PROGRESS');
        if ('error' in row.result) {
          const error = row.result.error;
          throw new AppError(error.status, error.code, error.message);
        }
        return row.result.value as T;
      }
      async function complete(result: Stored) {
        await db.execute(sql`update widget_turn_requests set result = ${JSON.stringify(result)}::jsonb, completed_at = now()
          where ${existingTurn}`);
      }
      let result: T;
      try { result = await execute(); }
      catch (error) {
        const recorded = error instanceof AppError
          ? { status: error.statusCode, code: error.errorCode, message: error.message }
          : { status: 500, code: 'INTERNAL_ERROR', message: 'The message could not be completed' };
        await complete({ error: recorded });
        throw error;
      }
      await complete({ value: result });
      return result;
    },
  };
}
