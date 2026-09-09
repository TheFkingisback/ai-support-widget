import { describe, it, expect, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { createGatewayService } from './gateway.service.js';
import { findCaseWithTenant } from './gateway.helpers.js';

describe('Database conversation ownership boundary', () => {
  it('requires tenant and owner in the actual SQL lookup', async () => {
    let condition: SQL | undefined;
    const limit = vi.fn().mockResolvedValue([]);
    const db = { select: () => ({ from: () => ({ where: (sql: SQL) => { condition = sql; return { limit }; } }) }) };
    await expect(findCaseWithTenant(db as unknown as PostgresJsDatabase, 'cas_a', 'ten_a', 'usr_a')).rejects.toMatchObject({ statusCode: 404 });
    const query = new PgDialect().sqlToQuery(condition!);
    expect(query.sql).toContain('"cases"."user_id"');
    expect(query.sql).toContain('"cases"."tenant_id"');
    expect(query.params).toEqual(['cas_a', 'ten_a', 'usr_a']);
  });
  it.each(['get', 'message', 'feedback', 'close', 'escalate'])('does not read messages or mutate data when the scoped lookup fails: %s', async operation => {
    const insert = vi.fn(); const update = vi.fn(); const from = vi.fn(() => ({ where: () => ({ limit: async () => [] }) }));
    const db = { select: () => ({ from }), insert, update };
    const service = createGatewayService(db as unknown as PostgresJsDatabase);
    const calls: Record<string, () => Promise<unknown>> = {
      get: () => service.getCase('cas_a', 'ten_a', 'usr_b'),
      message: () => service.addMessage('cas_a', 'ten_a', 'usr_b', 'user', 'intrusion'),
      feedback: () => service.addFeedback('cas_a', 'ten_a', 'usr_b', 'negative'),
      close: () => service.closeCase('cas_a', 'ten_a', 'usr_b', 'resolved', 8),
      escalate: () => service.escalateCase('cas_a', 'ten_a', 'usr_b', 'intrusion'),
    };
    await expect(calls[operation]()).rejects.toMatchObject({ statusCode: 404 });
    expect(insert).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled(); expect(from).toHaveBeenCalledTimes(1);
  });
  it('rejects missing owner before querying', async () => {
    const select = vi.fn();
    await expect(findCaseWithTenant({ select } as unknown as PostgresJsDatabase, 'cas_a', 'ten_a', '')).rejects.toMatchObject({ statusCode: 404 });
    expect(select).not.toHaveBeenCalled();
  });
});
