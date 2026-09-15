import { and, eq, desc, sql } from 'drizzle-orm';
import { pgTable, text, jsonb, timestamp, bigserial } from 'drizzle-orm/pg-core';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { AppError } from '../../shared/errors.js';
import type { ActionRecord, Principal, Proposal, ActionState } from './action-contract.js';

export const actionProposals = pgTable('action_proposals', {
  sequence: bigserial('sequence', { mode: 'number' }).notNull(),
  id: text('id').primaryKey(), tenantId: text('tenant_id').notNull(),
  userId: text('user_id').notNull(), caseId: text('case_id').notNull(),
  proposal: jsonb('proposal').$type<Proposal>().notNull(), state: text('state').$type<ActionState>().notNull(),
  connectorHash: text('connector_hash').notNull(), presentedMessageId: text('presented_message_id'),
  confirmationMessageId: text('confirmation_message_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});
export interface ActionStore {
  latest(p: Principal): Promise<ActionRecord | null>;
  save(p: ActionRecord): Promise<void>;
  insert(p: ActionRecord): Promise<void>;
  withLock<T>(p: Principal, fn: () => Promise<T>): Promise<T>;
}
const scope = (p: Principal) => and(eq(actionProposals.tenantId, p.tenantId),
  eq(actionProposals.userId, p.userId), eq(actionProposals.caseId, p.caseId));
/** Serializes action-enabled conversation turns across processes, without locking gateway rows. */
export function createActionStore(db: PostgresJsDatabase, lockDb: PostgresJsDatabase = db): ActionStore {
  return {
    async latest(p) {
      const rows = await db.select().from(actionProposals).where(scope(p))
        .orderBy(desc(actionProposals.sequence)).limit(1);
      return rows[0] ?? null;
    },
    async insert(p) { await db.insert(actionProposals).values(p); },
    async save(p) {
      const rows = await db.update(actionProposals).set({ state: p.state,
        presentedMessageId: p.presentedMessageId, confirmationMessageId: p.confirmationMessageId,
        updatedAt: new Date(),
      }).where(and(scope(p), eq(actionProposals.id, p.id))).returning({ id: actionProposals.id });
      if (!rows.length) throw new AppError(409, 'ACTION_STATE_CONFLICT', 'Proposal is unavailable');
    },
    async withLock(p, fn) {
      return lockDb.transaction(async tx => {
        const result = await tx.execute(sql`select pg_try_advisory_xact_lock(hashtextextended(${JSON.stringify([p.tenantId, p.userId, p.caseId])}, 4711)) as locked`);
        if (!result[0]?.locked) throw new AppError(409, 'ACTION_CONVERSATION_BUSY', 'Another message is being processed. Try again.');
        return fn();
      });
    },
  };
}
