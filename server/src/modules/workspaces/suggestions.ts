import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { z } from 'zod';
import { safeText } from '../context/safe-content.js';
import { AppError, NotFoundError } from '../../shared/errors.js';

export const suggestionStatus = z.enum(['new', 'reviewing', 'planned', 'shipped', 'declined']);
export const suggestionId = z.string().regex(/^idea_[a-f0-9-]{36}$/);
type Suggestion = {
  id: string;
  case_id: string;
  content: string;
  status: z.output<typeof suggestionStatus>;
  created_at: Date;
};

export function createSuggestionStore(db: PostgresJsDatabase) {
  return {
    async submit(tenantId: string, caseId: string, content: string) {
      const clean = safeText(content).trim();
      if (!clean) throw new AppError(400, 'SUGGESTION_EMPTY', 'Enter a product suggestion');
      const id = `idea_${randomUUID()}`;
      await db.execute(sql`insert into product_suggestions (id, tenant_id, case_id, content) values (${id}, ${tenantId}, ${caseId}, ${clean})`);
      return { id };
    },
    async list(tenantId: string, before?: string) {
      const rows = await db.execute<Suggestion>(sql`select id, case_id, content, status, created_at
        from product_suggestions where tenant_id = ${tenantId}
        ${before ? sql`and (created_at, id) < (select created_at, id from product_suggestions where id = ${before} and tenant_id = ${tenantId})` : sql``}
        order by created_at desc, id desc limit 31`);
      const suggestions = rows.slice(0, 30);
      return { suggestions, next: rows.length > suggestions.length ? suggestions.at(-1)?.id ?? null : null };
    },
    async setStatus(tenantId: string, id: string, status: Suggestion['status']) {
      const [row] = await db.execute(sql`update product_suggestions set status = ${status}
        where id = ${id} and tenant_id = ${tenantId} returning id`);
      if (!row) throw new NotFoundError('Product suggestion', id);
      return { ok: true };
    },
  };
}
