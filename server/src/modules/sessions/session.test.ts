import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { createAdminAuth } from '../admin/admin-auth.js';
import type { TenantService } from '../admin/tenant.service.js';
import { createInMemoryRateLimiter } from '../gateway/rate-limiter.js';
import type { SessionStore, IntegrationCredential } from './session.store.js';
import { createMockGatewayService } from '../../tests/mocks/mock-gateway.js';
import { TOKEN_ISSUER, ADMIN_AUDIENCE, WIDGET_AUDIENCE } from '../../shared/token-policy.js';
import { resetEnvCache } from '../../shared/env.js';

const widgetSecret = 'widget-fixture-secret-32-characters-minimum';
const adminSecret = 'admin-fixture-secret-32-characters-minimum';
const legacySecret = 'legacy-fixture-secret-32-characters-minimum';
const adminToken = jwt.sign({ role: 'super_admin', purpose: 'admin' }, adminSecret,
  { issuer: TOKEN_ISSUER, audience: ADMIN_AUDIENCE, expiresIn: '1h' });
const headers = (token: string) => ({ authorization: `Bearer ${token}` });
let app: FastifyInstance;
let records: Map<string, IntegrationCredential>;
let gateway: ReturnType<typeof createMockGatewayService>;

beforeEach(async () => {
  process.env.LOG_LEVEL = 'off'; resetEnvCache();
  records = new Map(); gateway = createMockGatewayService();
  const store: SessionStore = {
    async findByTenant(tenantId) { return records.get(tenantId) ?? null; },
    async findById(id) { return [...records.values()].find(record => record.id === id) ?? null; },
    async replace(record) { records.set(record.tenantId, record); },
    async revoke(tenantId) { records.delete(tenantId); },
  };
  const adminAuth = createAdminAuth({ superAdminKey: 'fixture-api-key', jwtSecret: adminSecret });
  app = await buildApp({
    jwtSecret: widgetSecret, gatewayService: gateway, rateLimiter: createInMemoryRateLimiter(),
    sessionRouteOpts: { store, widgetSecret, adminAuth, rateLimiter: createInMemoryRateLimiter(),
      tenantService: { getTenant: async (id: string) => ({ id }) } as TenantService },
  });
  app.get('/admin-check', { preHandler: adminAuth }, async () => ({ ok: true }));
});
afterEach(async () => { vi.restoreAllMocks(); await app.close(); });
async function provision(tenant = 'ten_a') {
  const res = await app.inject({ method: 'POST', url: `/api/admin/tenants/${tenant}/integration-credential`, headers: headers(adminToken) });
  expect(res.statusCode).toBe(200); expect(res.headers['cache-control']).toBe('no-store');
  return res.json().credential as string;
}
async function issue(credential: string, userId = 'usr_a', extra = {}) {
  return app.inject({ method: 'POST', url: '/api/widget/sessions', headers: headers(credential), payload: { userId, ...extra } });
}
describe('Tenant-scoped session issuer', () => {
  it.each([
    { purpose: 'admin' }, { role: 'super_admin' }, { iss: 'other' }, { aud: 'other' },
    { integrationId: 'unknown' }, { tenantId: 'ten_other' }, { sub: 'usr_other' },
    { userId: '' }, { exp: 1 },
  ])('rejects a signed session with invalid authority or lifetime %#', async override => {
    const issued = (await issue(await provision())).json().jwt;
    const claims = jwt.decode(issued) as jwt.JwtPayload;
    const modified = jwt.sign({ ...claims, ...override }, widgetSecret, { algorithm: 'HS256' });
    const result = await app.inject({ method: 'POST', url: '/api/cases', headers: headers(modified), payload: { message: 'Fixture' } });
    expect(result.statusCode).toBe(401); expect(gateway._cases).toHaveLength(0);
  });
  it('stores only a hash and issues a short session bound to the credential tenant', async () => {
    const credential = await provision();
    expect(JSON.stringify([...records.values()])).not.toContain(credential);
    const res = await issue(credential); expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.json()).toMatchObject({ tenantKey: 'ten_a', expiresIn: 900 });
    const claims = jwt.verify(res.json().jwt, widgetSecret, { issuer: TOKEN_ISSUER, audience: WIDGET_AUDIENCE }) as jwt.JwtPayload;
    expect(claims).toMatchObject({ tenantId: 'ten_a', userId: 'usr_a', sub: 'usr_a', purpose: 'widget' });
    expect(claims.exp! - claims.iat!).toBe(900);
    const create = await app.inject({ method: 'POST', url: '/api/cases', headers: headers(res.json().jwt), payload: { message: 'Fixture' } });
    expect(create.statusCode).toBe(200);
  });
  it.each([{ tenantId: 'ten_other' }, { purpose: 'admin' }, { role: 'super_admin' }, { exp: 9999999999 }])('rejects caller-selected authority %#', async extra => {
    expect((await issue(await provision(), 'usr_a', extra)).statusCode).toBe(400);
  });
  it('rejects absent, administrative and legacy keys at the session endpoint', async () => {
    for (const key of ['', adminToken, 'tsk_fixture', legacySecret]) expect((await issue(key)).statusCode).toBe(401);
  });
  it('does not accept widget or old shared signatures in administration', async () => {
    const widget = (await issue(await provision())).json().jwt;
    const forged = jwt.sign({ role: 'super_admin', purpose: 'admin' }, legacySecret, { issuer: TOKEN_ISSUER, audience: ADMIN_AUDIENCE, expiresIn: '1h' });
    for (const token of [widget, forged]) expect((await app.inject({ url: '/admin-check', headers: headers(token) })).statusCode).toBe(403);
    expect((await app.inject({ method: 'POST', url: '/api/cases', headers: headers(adminToken), payload: { message: 'Fixture' } })).statusCode).toBe(401);
  });
  it('rotation and revocation invalidate credentials and existing widget sessions', async () => {
    const old = await provision(); const oldJwt = (await issue(old)).json().jwt;
    const fresh = await provision();
    expect((await issue(old)).statusCode).toBe(401);
    const check = (token: string) => app.inject({ method: 'POST', url: '/api/cases', headers: headers(token), payload: { message: 'Fixture' } });
    expect((await check(oldJwt)).statusCode).toBe(401);
    const freshJwt = (await issue(fresh)).json().jwt;
    expect((await check(freshJwt)).statusCode).toBe(200);
    await app.inject({ method: 'DELETE', url: '/api/admin/tenants/ten_a/integration-credential', headers: headers(adminToken) });
    expect((await issue(fresh)).statusCode).toBe(401);
    expect((await check(freshJwt)).statusCode).toBe(401);
  });
  it('limits credential administration to the authorized tenant', async () => {
    const tenantToken = jwt.sign({ role: 'tenant_admin', tenantId: 'ten_a', purpose: 'admin' }, adminSecret, { issuer: TOKEN_ISSUER, audience: ADMIN_AUDIENCE, expiresIn: '1h' });
    for (const method of ['GET', 'POST', 'DELETE'] as const) {
      expect((await app.inject({ method, url: '/api/admin/tenants/ten_b/integration-credential', headers: headers(tenantToken) })).statusCode).toBe(403);
    }
    expect(records.size).toBe(0);
  });
  it('rejects all legacy signatures immediately, regardless of their expiry', async () => {
    const make = (extra = {}) => jwt.sign({ tenantId: 'ten_old', userId: 'usr_old', ...extra }, legacySecret, { expiresIn: '1h' });
    const check = (token: string) => app.inject({ method: 'POST', url: '/api/cases', headers: headers(token), payload: { message: 'Fixture' } });
    expect((await check(make())).statusCode).toBe(401);
    expect((await check(make({ tenantId: 'ten_new' }))).statusCode).toBe(401);
    expect((await check(make({ role: 'super_admin' }))).statusCode).toBe(401);
    const token = make(); vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 601_000);
    expect((await check(token)).statusCode).toBe(401);
  });
  it.each([
    ['GET', '', undefined], ['POST', '/messages', { content: 'intrusion' }],
    ['POST', '/feedback', { feedback: 'positive' }], ['POST', '/close', { resolution: 'resolved', rating: 8 }],
    ['POST', '/escalate', { reason: 'intrusion' }], ['POST', '/actions', { action: { type: 'retry', label: 'Retry' } }],
  ] as const)('rejects another user of the same tenant on %s %s', async (method, suffix, payload) => {
    const credential = await provision();
    const own = (await issue(credential)).json().jwt;
    const other = (await issue(credential, 'usr_b')).json().jwt;
    const created = await app.inject({ method: 'POST', url: '/api/cases', headers: headers(own), payload: { message: 'Private fixture' } });
    const before = JSON.stringify(gateway._cases);
    const res = await app.inject({ method, url: `/api/cases/${created.json().case.id}${suffix}`, headers: headers(other), payload });
    expect([403, 404]).toContain(res.statusCode);
    expect(res.body).not.toContain('Private fixture');
    expect(JSON.stringify(gateway._cases)).toBe(before);
    expect(gateway._messages).toHaveLength(1);
  });
});
