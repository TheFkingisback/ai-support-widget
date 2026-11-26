import { createHash, randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { AppError, ConflictError } from '../../shared/errors.js';
import { inTurn, turnId, turnKey } from './turn-identity.js';

type Scope = { tenantId: string; userId: string; clientId: string; operation: string; input: unknown };
type Stored = { value: unknown } | { error: { status: number; code: string; message: string } };
export interface TurnIdempotency {
  run<T>(scope: Scope, execute: () => Promise<T>): Promise<T>;
}

export function retryable(status: number, code: string): boolean {
  return status >= 500 || status === 429 || code === 'ACTION_CONVERSATION_BUSY' || code === 'ACTION_STATE_CONFLICT';
}

export function createTurnIdempotency(db: PostgresJsDatabase): TurnIdempotency {
  return {
    async run<T>({ tenantId, userId, clientId, operation, input }: Scope, execute: () => Promise<T>) {
      const fingerprint = createHash('sha256').update(JSON.stringify([operation, input])).digest('hex');
      const key = turnKey(tenantId, userId, clientId);
      const caseId = operation === 'create' ? turnId('cas', key)! : operation;
      const owner = randomUUID();
      const scope = sql`tenant_id = ${tenantId} and user_id = ${userId} and client_id = ${clientId}`;
      const [claim] = await db.execute(sql`insert into widget_turn_requests as old
        (tenant_id,user_id,client_id,fingerprint,case_id,lease_owner,lease_until)
        values (${tenantId},${userId},${clientId},${fingerprint},${caseId},${owner},now()+interval '3 minutes')
        on conflict (tenant_id,user_id,client_id) do update set lease_owner=excluded.lease_owner,
        lease_until=excluded.lease_until, case_id=excluded.case_id
        where old.fingerprint=excluded.fingerprint and old.result is null and old.lease_until <= now()
        returning client_id`);
      if (!claim) {
        const [row] = await db.execute<{ fingerprint: string; result: Stored | null; lease_until: string | null }>(
          sql`select fingerprint,result,lease_until from widget_turn_requests where ${scope}`);
        if (!row || row.fingerprint !== fingerprint) throw new ConflictError('This message ID is already in use', 'TURN_ID_CONFLICT');
        // Older versions cannot associate an interrupted request with its side effects.
        if (!row.result && !row.lease_until) throw new ConflictError('Check the conversation or contact support before retrying the previous message', 'TURN_OUTCOME_UNKNOWN');
        if (!row.result) throw new ConflictError('This message is still being processed', 'TURN_IN_PROGRESS');
        if ('error' in row.result) {
          const { status, code, message } = row.result.error;
          if (!row.lease_until && retryable(status, code)) throw new ConflictError('Check the conversation or contact support before retrying the previous message', 'TURN_OUTCOME_UNKNOWN');
          throw new AppError(status, code, message);
        }
        return row.result.value as T;
      }
      async function finish(result: Stored | null) {
        const rows = await db.execute(sql`update widget_turn_requests set result=${result ? JSON.stringify(result) : null}::jsonb,
          completed_at=${result ? sql`now()` : sql`null`}, lease_until=now(), lease_owner=null
          where ${scope} and lease_owner=${owner} returning client_id`);
        if (!rows.length) throw new ConflictError('Refresh the conversation to retrieve the result', 'TURN_IN_PROGRESS');
      }
      let value: T;
      try { value = await inTurn(key, execute); }
      catch (failure) {
        const err = failure instanceof AppError ? failure : new AppError(500, 'INTERNAL_ERROR', 'The message could not be completed');
        await finish(retryable(err.statusCode, err.errorCode) ? null : { error: { status: err.statusCode, code: err.errorCode, message: err.message } });
        throw failure;
      }
      await finish({ value });
      return value;
    },
  };
}
