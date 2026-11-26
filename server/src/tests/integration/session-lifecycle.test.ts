import { randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import Fastify from 'fastify';
import { createDbTenantStore } from '../../shared/db-stores.js';
import { createDbSessionDataSource } from '../../shared/db-data-sources.js';
import { createTenantService } from '../../modules/admin/tenant.service.js';
import { hashApiKey } from '../../modules/admin/admin-auth.js';
import { createGatewayService } from '../../modules/gateway/gateway.service.js';
import { createTurnIdempotency } from '../../modules/gateway/turn-idempotency.js';
import { turnKey, turnId } from '../../modules/gateway/turn-identity.js';
import { registerSessionAdminRoutes } from '../../modules/admin/session-admin.routes.js';
import { AppError } from '../../shared/errors.js';

const url = process.env.WORKSPACE_TEST_DATABASE_URL;
describe.skipIf(!url)('Session lifecycle in PostgreSQL', () => {
  const schema = 'lifecycle_' + randomUUID().replaceAll('-', '');
  let root: ReturnType<typeof postgres>;
  let client: ReturnType<typeof postgres>;
  let db: ReturnType<typeof drizzle>;
  const app = Fastify();

  beforeAll(async () => {
    const target = new URL(url!);
    if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.pathname !== '/aiwidget_dev') throw new Error('Dedicated local test DB required');
    root = postgres(url!, { max: 1 });
    await root`create schema ${root(schema)}`;
    client = postgres(url!, { connection: { search_path: schema } });
    db = drizzle(client);
    const dir = new URL('../../migrations/', import.meta.url);
    const connection = await client.reserve();
    try {
      for (const file of (await readdir(dir)).filter(name => /^\d+-.*\.sql$/.test(name)).sort()) {
        if (file.startsWith('010-')) {
          await connection`insert into tenants(id,name,config,api_base_url,service_token)
            values ('legacy','Legacy','{"adminApiKeyHash":"synthetic-old-hash"}','','')`;
        }
        await connection.unsafe(await readFile(new URL(file, dir), 'utf8'));
      }
    } finally { connection.release(); }
    await registerSessionAdminRoutes(app, { adminAuth: async () => {}, dataSource: createDbSessionDataSource(db) });
  });
  afterAll(async () => {
    await app.close(); await client?.end();
    if (root) { await root`drop schema if exists ${root(schema)} cascade`; await root.end(); }
  });

  it('keeps a rotated key revoked when an older settings write completes last', async () => {
    const store = createDbTenantStore(db);
    expect((await store.findByAdminKeyHash('synthetic-old-hash'))?.id).toBe('legacy');
    let markRead!: () => void; let resume!: () => void;
    const read = new Promise<void>(done => { markRead = done; });
    const release = new Promise<void>(done => { resume = done; });
    const admin = createTenantService(store);
    const editor = createTenantService({ ...store, async update(id, fields) {
      markRead(); await release; return store.update(id, fields);
    } });
    const { tenant, adminApiKey } = await admin.createTenant('Rotation', 'starter', undefined);
    const edit = editor.updateTenant(tenant.id, { config: { maxDocs: 4 } });
    await read;
    const rotated = await admin.resetAdminKey(tenant.id).finally(resume);
    const result = await edit;
    expect(result.config.maxDocs).toBe(4);
    expect(result.config).not.toHaveProperty('adminApiKeyHash');
    expect(await store.findByAdminKeyHash(hashApiKey(adminApiKey))).toBeNull();
    expect((await store.findByAdminKeyHash(hashApiKey(rotated.adminApiKey)))?.id).toBe(tenant.id);
    const [row] = await client`select config->>'adminApiKeyHash' as mirror from tenants where id=${tenant.id}`;
    expect(row.mirror).toBe(hashApiKey(rotated.adminApiKey));
  });

  it('resumes expired and transient turns once and deletes all stored copies on purge', async () => {
    const tenantId = 'legacy'; const userId = 'reader';
    const scope = { tenantId, userId, clientId: randomUUID(), operation: 'create', input: { message: 'test' } };
    const turns = createTurnIdempotency(db); const gateway = createGatewayService(db);
    const persist = async () => {
      const created = await gateway.createCase(tenantId, userId, 'test');
      await gateway.addMessage(created.case.id, tenantId, userId, 'assistant', 'answer');
      return created;
    };
    await expect(turns.run(scope, async () => {
      await persist(); throw new AppError(503, 'TEMPORARY', 'Temporary interruption');
    })).rejects.toMatchObject({ statusCode: 503 });
    await client`update widget_turn_requests set lease_owner=${randomUUID()}, lease_until=now()+interval '1 minute' where client_id=${scope.clientId}`;
    await expect(turns.run(scope, persist)).rejects.toMatchObject({ errorCode: 'TURN_IN_PROGRESS' });
    await client`update widget_turn_requests set lease_until=now()-interval '1 second' where client_id=${scope.clientId}`;
    const result = await turns.run(scope, persist);
    const caseId = turnId('cas', turnKey(tenantId, userId, scope.clientId))!;
    expect(result.case.id).toBe(caseId);
    const replay = vi.fn(); expect(await turns.run(scope, replay)).toEqual(result); expect(replay).not.toHaveBeenCalled();
    expect((await gateway.getCase(caseId, tenantId, userId)).messages.map(m => m.role)).toEqual(['user','assistant']);
    await client`insert into snapshots(id,tenant_id,user_id,case_id,data) values ('snapshot',${tenantId},${userId},${caseId},'{}')`;
    await client`insert into llm_costs(id,tenant_id,case_id,model) values ('cost',${tenantId},${caseId},'test')`;
    await client`update cases set updated_at=now()-interval '40 days' where id=${caseId}`;
    const current = await gateway.createCase(tenantId, userId, 'keep');
    for (const olderThanDays of [0, -1, 1.5, 366]) {
      const invalid = await app.inject({ method: 'DELETE', url: '/api/admin/sessions/purge', payload: { olderThanDays } });
      expect(invalid.statusCode).toBe(400);
    }
    const preview = await app.inject({method:'POST',url:'/api/admin/sessions/purge/preview',payload:{olderThanDays:30}});
    expect(preview.json().count).toBe(1);
    const purged = await app.inject({method:'DELETE',url:'/api/admin/sessions/purge',payload:{ olderThanDays:30, cutoff:preview.json().cutoff }});
    expect(purged.json().purged).toBe(1);
    for (const table of ['widget_turn_requests','messages','snapshots','llm_costs','audit_log']) {
      expect(await client`select 1 from ${client(table)} where case_id=${caseId}`).toHaveLength(0);
    }
    expect(await client`select 1 from cases where id=${current.case.id}`).toHaveLength(1);
  });

  it('rolls back the removal of replay data when deleting a case fails', async () => {
    const scope = { tenantId: 'legacy', userId: 'rollback', clientId: randomUUID(), operation: 'create', input: {} };
    const created = await createTurnIdempotency(db).run(scope, () => createGatewayService(db).createCase('legacy', 'rollback', 'message'));
    await client`update cases set updated_at=now()-interval '40 days' where id=${created.case.id}`;
    await client`insert into cases(id,tenant_id,user_id,snapshot_id,updated_at)
      select 'rollback_'||n,'legacy','batch','','now'::timestamptz-interval '60 days' from generate_series(1,201) n`;
    await client.unsafe("create function reject_purge() returns trigger language plpgsql as $$ begin if OLD.user_id = 'rollback' then raise exception 'test interruption'; end if; return OLD; end $$");
    await client.unsafe('create trigger reject_purge before delete on cases for each row execute function reject_purge()');
    const retention = createDbSessionDataSource(db);
    const cutoff = new Date(Date.now() - 86400000).toISOString();
    try {
      await expect(retention.purgeOlderThan(cutoff)).rejects.toThrow();
      const [turn] = await client`select result from widget_turn_requests where case_id=${created.case.id}`;
      expect(turn.result.value.case.id).toBe(created.case.id);
      expect(await client`select id from cases where user_id='batch'`).toHaveLength(201);
      expect(await client`select id from messages where case_id=${created.case.id}`).toHaveLength(1);
    } finally { await client.unsafe('drop trigger reject_purge on cases'); }
    expect(await retention.purgeOlderThan(cutoff)).toBe(202);
  });

  it('protects unresolved actions and live reservations, pages across deleted cursors, and totals across tenants', async () => {
    await client`insert into cases(id,tenant_id,user_id,snapshot_id,updated_at)
      select 'list_'||n,'legacy','paginated','',now()-interval '40 days' from generate_series(1,205) n`;
    await client`insert into action_proposals(id,tenant_id,user_id,case_id,proposal,state,connector_hash,created_at,updated_at)
      values ('reconcile','legacy','paginated','list_1','{}','unknown','hash',now(),now())`;
    await client`insert into widget_turn_requests(tenant_id,user_id,case_id,client_id,fingerprint,lease_until)
      values ('legacy','paginated','list_2',${randomUUID()},'test',now()+interval '1 minute')`;
    await client`insert into cases(id,tenant_id,user_id,snapshot_id,status) values ('other','another','another','','resolved')`;
    const source = createDbSessionDataSource(db);
    const page = await source.list({limit:200,search:'paginated'});
    expect(page.sessions).toHaveLength(200);
    await client`delete from cases where id=${page.sessions.at(-1)!.id}`;
    const rest = await source.list({limit:200,search:'paginated',before:page.next!});
    expect(rest.sessions).toHaveLength(5);
    expect((await app.inject({url:'/api/admin/sessions/'+rest.sessions[0].id})).statusCode).toBe(200);
    await client`insert into llm_costs(id,tenant_id,case_id,model,estimated_cost)
      values ('first_cost','legacy','list_1','test',1), ('other_cost','another','other','test',2)`;
    const totals = await source.totals();
    expect(totals.totalCost).toBe(3);
    expect(totals.activeSessions).toBeGreaterThan(200); expect(totals.resolvedSessions).toBe(1);
    const cutoff = new Date(Date.now()-86400000).toISOString();
    expect(await source.countOlderThan(cutoff)).toBe(202);
    expect(await source.purgeOlderThan(cutoff)).toBe(202);
    expect(await client`select id from cases where user_id='paginated' order by id`).toMatchObject([{id:'list_1'},{id:'list_2'}]);
  });
});
