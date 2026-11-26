import { and, inArray, lt, sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { cases } from '../gateway/gateway.schema.js';

function eligible(cutoff: string) {
  return and(lt(cases.updatedAt, new Date(cutoff)), sql`not exists (
    select 1 from action_proposals a where a.case_id=${cases.id} and a.tenant_id=${cases.tenantId}
    and (a.state in ('executing','unknown') or (a.state='pending_confirmation' and case
      when pg_input_is_valid(a.proposal->>'expiresAt', 'timestamptz') then (a.proposal->>'expiresAt')::timestamptz > now()
      else true end)))`, sql`not exists (
    select 1 from widget_turn_requests t where t.case_id=${cases.id} and t.tenant_id=${cases.tenantId}
    and t.user_id=${cases.userId} and t.lease_until > now())`);
}

export function sessionRetention(db: PostgresJsDatabase) {
  return {
    async countOlderThan(cutoff: string) {
      const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(cases).where(eligible(cutoff));
      return row.count;
    },
    async purgeOlderThan(cutoff: string) {
      return db.transaction(async tx => {
        let total = 0;
        while (true) {
          const batch = await tx.select({ id: cases.id }).from(cases).where(eligible(cutoff))
            .orderBy(cases.updatedAt, cases.id).limit(200).for('update');
          if (!batch.length) return total;
          const locked = await tx.select({ id: cases.id }).from(cases)
            .where(and(inArray(cases.id, batch.map(c => c.id)), eligible(cutoff)));
          const ids = locked.map(c => c.id);
          if (!ids.length) continue;
          await tx.execute(sql`delete from widget_turn_requests where case_id in (${sql.join(ids.map(id => sql`${id}`), sql`,`)})`);
          await tx.delete(cases).where(inArray(cases.id, ids));
          total += ids.length;
        }
      });
    },
  };
}
