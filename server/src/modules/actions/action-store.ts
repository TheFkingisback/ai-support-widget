import { and, eq, desc } from 'drizzle-orm';
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
  save(p: ActionRecord, expected: ActionState): Promise<void>;
  insert(p: ActionRecord): Promise<void>;
}
const scope = (p: Principal) => and(eq(actionProposals.tenantId, p.tenantId),
  eq(actionProposals.userId, p.userId), eq(actionProposals.caseId, p.caseId));
/** Claim transitions atomically before calling a provider. No connection is held during network I/O. */
export function createActionStore(db: PostgresJsDatabase): ActionStore {
  return {
    async latest(p) {
      const rows = await db.select().from(actionProposals).where(scope(p))
        .orderBy(desc(actionProposals.sequence)).limit(1);
      return rows[0] ?? null;
    },
    async insert(p) { await db.insert(actionProposals).values(p); },
    async save(p, expected) {
      const rows = await db.update(actionProposals).set({ state: p.state,
        presentedMessageId: p.presentedMessageId, confirmationMessageId: p.confirmationMessageId,
        updatedAt: new Date(),
      }).where(and(scope(p), eq(actionProposals.id, p.id), eq(actionProposals.state, expected))).returning({ id: actionProposals.id });
      if (!rows.length) throw new AppError(409, 'ACTION_STATE_CONFLICT', 'Proposal is unavailable');
    },
  };
}
