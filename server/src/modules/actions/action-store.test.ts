import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createActionStore } from './action-store.js';
import { fixture } from './action-fixtures.test-helper.js';
const url = process.env.ACTION_TEST_DATABASE_URL;
// Explicit opt-in, dedicated local database only. Every run uses a new schema.
describe.skipIf(!url)('Action store on PostgreSQL', () => {
  const schema = 'action_test_' + randomUUID().replaceAll('-', '');
  const root = postgres(url!, { max: 1 });
  const client = postgres(url!, { max: 5, connection: { search_path: schema } });
  const db = drizzle(client); const store = createActionStore(db);
  beforeAll(async () => {
    const parsed = new URL(url!);
    if (!['localhost','127.0.0.1'].includes(parsed.hostname) || parsed.pathname !== '/aiwidget_dev') throw new Error('Dedicated local test DB required');
    await root`create schema ${root(schema)}`;
    await client.unsafe('create table tenants(id text primary key); create table cases(id text primary key); create table messages(id text primary key);');
    const migration = await client.reserve();
    try { await migration.unsafe(await readFile(new URL('../../migrations/004-action-proposals.sql', import.meta.url), 'utf8')); }
    finally { migration.release(); }
  });
  afterAll(async () => { await client.end(); await root`drop schema if exists ${root(schema)} cascade`; await root.end(); });
  it('enforces one unresolved proposal, ownership, ordering and durable recovery', async () => {
    const f = await fixture(); await f.prepare(); const a = { ...f.records[0], presentedMessageId: null };
    await client`insert into tenants(id) values (${a.tenantId})`; await client`insert into cases(id) values (${a.caseId})`;
    await store.insert(a); const b = { ...a, id: 'next_record', proposal: { ...a.proposal, actionId: 'next_remote' } };
    await expect(store.insert(b)).rejects.toThrow();
    expect(await store.latest({ ...a, userId: 'usr_other' })).toBeNull();
    await expect(store.save({ ...a, tenantId: 'ten_other' }, 'pending_confirmation')).rejects.toThrow();
    a.state = 'cancelled'; await store.save(a, 'pending_confirmation'); await store.insert(b);
    expect((await createActionStore(db).latest(a))?.id).toBe(b.id); // Same timestamp; database sequence decides.
    b.state = 'unknown'; await store.save(b, 'pending_confirmation');
    await expect(store.insert({ ...b, id: 'third', proposal: { ...b.proposal, actionId: 'third' } })).rejects.toThrow();
    expect((await createActionStore(db).latest(a))?.state).toBe('unknown');
  });
  it('rejects an obsolete claim across independent stores', async () => {
    const f = await fixture(); await f.prepare();
    const a = { ...f.records[0], presentedMessageId: null, caseId: 'cas_atomic' };
    await client`insert into cases(id) values (${a.caseId})`;
    await client`insert into tenants(id) values (${a.tenantId}) on conflict do nothing`;
    await store.insert(a);
    a.state = 'executing';
    const claims = await Promise.allSettled([store, createActionStore(db)].map(s => s.save(a, 'pending_confirmation')));
    expect(claims.filter(c => c.status === 'fulfilled')).toHaveLength(1);
  });
});
