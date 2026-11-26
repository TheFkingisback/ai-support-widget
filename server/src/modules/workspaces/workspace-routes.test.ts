import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app.js';
import { createSessionStore } from '../sessions/session.store.js';
import { createWorkspaceStore } from './workspace-store.js';
import { createInMemoryRateLimiter } from '../gateway/rate-limiter.js';
import { createTurnIdempotency } from '../gateway/turn-idempotency.js';

const database = process.env.WORKSPACE_TEST_DATABASE_URL;
const publicOrigin = 'https://support.example.com';

describe.skipIf(!database)('Self-service workspaces on PostgreSQL', () => {
  const schema = `workspace_test_${randomUUID().replaceAll('-', '')}`;
  const linkByEmail = new Map<string, string>();
  let app: Awaited<ReturnType<typeof buildApp>>;
  let root: ReturnType<typeof postgres>;
  let sql: ReturnType<typeof postgres>;
  let dns: string[][] = [];

  beforeAll(async () => {
    const target = new URL(database!);
    if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.pathname !== '/aiwidget_dev') throw new Error('Dedicated local test DB required');
    root = postgres(database!, { max: 1 });
    await root`create schema ${root(schema)}`;
    sql = postgres(database!, { connection: { search_path: schema } });
    const migrations = await sql.reserve();
    try {
      for (const file of ['001-init.sql', '002-integration-credentials.sql', '003-tenant-mcp.sql', '004-action-proposals.sql', '005-workspaces.sql', '006-turn-idempotency.sql', '007-workspace-team.sql', '008-workspace-locales.sql', '009-product-suggestions.sql', '010-audit-hardening.sql']) {
        await migrations.unsafe(await readFile(new URL(`../../migrations/${file}`, import.meta.url), 'utf8'));
      }
    } finally { migrations.release(); }
    const db = drizzle(sql);
    app = await buildApp({ jwtSecret: 'synthetic-widget-secret-for-tests-1234', workspaceOpts: {
      store: createWorkspaceStore(db), sessions: createSessionStore(db), publicOrigin,
      widgetSecret: 'synthetic-widget-secret-for-tests-1234', mail: { async send(email, url) { linkByEmail.set(email, url); } },
      async lookup() { return dns; },
    } });
  });

  afterAll(async () => {
    await app?.close();
    await sql?.end();
    if (root) {
      await root`drop schema if exists ${root(schema)} cascade`;
      await root.end();
    }
  });

  async function register(email: string, name: string) {
    const accepted = await app.inject({ method: 'POST', url: '/api/workspace/begin', headers: { origin: publicOrigin }, payload: { email, name } });
    expect(accepted.statusCode).toBe(202);
    const token = new URLSearchParams(new URL(linkByEmail.get(email)!).hash.slice(1)).get('confirm');
    const reply = await app.inject({ method: 'POST', url: '/api/workspace/confirm', headers: { origin: publicOrigin }, payload: { token } });
    expect(reply.statusCode).toBe(200);
    const raw = String(reply.headers['set-cookie']);
    expect(raw).toContain('HttpOnly; Secure; SameSite=Lax');
    const reuse = await app.inject({ method: 'POST', url: '/api/workspace/confirm', headers: { origin: publicOrigin }, payload: { token } });
    expect(reuse.statusCode).toBe(401);
    return { origin: publicOrigin, cookie: raw.split(';')[0] };
  }

  it('applies the recipient cooldown before sending another sign-in email or invitation', async () => {
    const db = drizzle(sql); let delivered = 0;
    const limited = await buildApp({ jwtSecret: 'synthetic-widget-secret-for-tests-1234', workspaceOpts: {
      store: createWorkspaceStore(db), sessions: createSessionStore(db), publicOrigin,
      widgetSecret: 'synthetic-widget-secret-for-tests-1234', rateLimiter: createInMemoryRateLimiter(),
      mail: { async send() { delivered++; } }, async lookup() { return []; },
    } });
    try {
      const owner = await register('mail-owner@sample.invalid','Mail limits');
      const email = 'limited@sample.invalid';
      const send = () => limited.inject({ method: 'POST', url: '/api/workspace/begin', headers: { origin: publicOrigin }, payload: { email } });
      expect((await send()).statusCode).toBe(202);
      expect((await send()).statusCode).toBe(429);
      const invite = await limited.inject({ method: 'POST', url: '/api/workspace/team', headers: owner, payload: { email, role: 'developer' } });
      expect(invite.statusCode).toBe(429);
      expect(delivered).toBe(1);
    } finally { await limited.close(); }
  });

  it('provisions exactly one workspace after confirmation, isolates environments, and revokes sessions', async () => {
    const first = await register('one@sample.invalid', 'Workspace One');
    const second = await register('two@sample.invalid', 'Workspace Two');
    const firstWorkspace = (await app.inject({ url: '/api/workspace', headers: first })).json();
    const secondWorkspace = (await app.inject({ url: '/api/workspace', headers: second })).json();
    expect(firstWorkspace.name).toBe('Workspace One');
    expect(firstWorkspace.production.tenantId).not.toBe(firstWorkspace.staging.tenantId);
    expect(firstWorkspace.production.tenantId).not.toBe(secondWorkspace.production.tenantId);
    const again = await register('one@sample.invalid', 'Ignored on sign in');
    expect((await app.inject({ url: '/api/workspace', headers: again })).json().production.tenantId).toBe(firstWorkspace.production.tenantId);
    const credential = await app.inject({ method: 'POST', url: '/api/workspace/environments/staging/credential', headers: first });
    expect(credential.json().tenantId).toBe(firstWorkspace.staging.tenantId);
    const sandbox = await app.inject({ method: 'POST', url: '/api/workspace/sandbox/session', headers: first });
    expect(sandbox.json().jwt).toEqual(expect.any(String));
    expect(sandbox.json().tenantKey).not.toBe(firstWorkspace.staging.tenantId);
    await app.inject({ method: 'POST', url: '/api/workspace/logout', headers: first });
    expect((await app.inject({ url: '/api/workspace', headers: first })).statusCode).toBe(401);
  });

  it('requires the application origin and verifies browser origins using tenant-specific DNS proof', async () => {
    const headers = await register('dns@sample.invalid', 'Browser Origin');
    const url = '/api/workspace/environments/staging/origins';
    const payload = { origin: 'https://app.sample.invalid' };
    expect((await app.inject({ method: 'POST', url, headers: { ...headers, origin: 'https://elsewhere.invalid' }, payload })).statusCode).toBe(403);
    const created = await app.inject({ method: 'POST', url, headers, payload });
    expect(created.statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: `${url}/verify`, headers, payload })).statusCode).toBe(409);
    dns = [[`ai-support=${created.json().origins[0].challenge}`]];
    const verified = await app.inject({ method: 'POST', url: `${url}/verify`, headers, payload });
    expect(verified.json().origins[0].verified_at).toBeTruthy();
    expect((await app.inject({ method: 'DELETE', url, headers, payload })).json().origins).toEqual([]);
  });

  it('replays a completed turn once per authenticated identity and rejects changes to the payload', async () => {
    const turns = createTurnIdempotency(drizzle(sql));
    const scope = { tenantId: 'ten_review', userId: 'usr_review', clientId: randomUUID(), operation: 'create', input: { message: 'Synthetic' } };
    let executions = 0;
    const execute = async () => ({ count: ++executions });
    expect(await turns.run(scope, execute)).toEqual({ count: 1 });
    expect(await turns.run(scope, execute)).toEqual({ count: 1 });
    await expect(turns.run({ ...scope, input: { message: 'Changed' } }, execute)).rejects.toMatchObject({ errorCode: 'TURN_ID_CONFLICT' });
    expect(await turns.run({ ...scope, tenantId: 'ten_other' }, execute)).toEqual({ count: 2 });
  });

  it('accepts a scoped team invitation and removes the member and their sessions', async () => {
    const owner = await register('owner@sample.invalid', 'Team Test');
    const email = 'member@sample.invalid';
    const invitation = await app.inject({ method: 'POST', url: '/api/workspace/team', headers: owner, payload: { email, role: 'support' } });
    expect(invitation.statusCode).toBe(202);
    const token = new URLSearchParams(new URL(linkByEmail.get(email)!).hash.slice(1)).get('confirm');
    const confirmation = await app.inject({ method: 'POST', url: '/api/workspace/confirm', headers: { origin: publicOrigin }, payload: { token } });
    expect(confirmation.statusCode).toBe(200);
    const headers = { origin: publicOrigin, cookie: String(confirmation.headers['set-cookie']).split(';')[0] };
    expect((await app.inject({ url: '/api/workspace', headers })).json().role).toBe('support');
    expect((await app.inject({ method: 'POST', url: '/api/workspace/environments/production/credential', headers })).statusCode).toBe(403);
    expect((await app.inject({ url: '/api/workspace/conversations?env=production', headers })).json()).toEqual({ conversations: [], next: null });
    expect((await app.inject({ method: 'DELETE', url: '/api/workspace/team', headers: owner, payload: { email } })).statusCode).toBe(200);
    expect((await app.inject({ url: '/api/workspace', headers })).statusCode).toBe(401);
  });
});
