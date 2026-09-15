import Fastify from 'fastify';
import jwt from 'jsonwebtoken';
import { describe, it, expect, vi } from 'vitest';
import { createAdminAuth, hashApiKey } from './admin-auth.js';
import type { TenantService } from './tenant.service.js';
import { registerMcpRoutes } from '../orchestrator/mcp.routes.js';
import type { McpRecord, McpStore } from '../orchestrator/mcp-store.js';
import { AppError } from '../../shared/errors.js';
import { resetEnvCache } from '../../shared/env.js';
import { TOKEN_ISSUER, ADMIN_AUDIENCE } from '../../shared/token-policy.js';

async function setup(ready = true) {
  process.env.TOKEN_ENCRYPTION_KEY = 'fixture-encryption-key-only'; process.env.LOG_LEVEL = 'off'; resetEnvCache();
  const key = 'tsk_' + 'a'.repeat(32); const records = new Map<string, McpRecord>();
  const lookup = vi.fn(async (hash: string) => hash === hashApiKey(key) ? { id: 'a' } : null);
  const tenantService = { findTenantByAdminKeyHash: lookup, getTenant: vi.fn(async (id: string) => ({ id })) } as unknown as TenantService;
  const store: McpStore = { find: async id => records.get(id) ?? null, save: async r => { records.set(r.tenantId, r); }, remove: async id => { records.delete(id); } };
  const app = Fastify(); const secret = 'fixture-admin-signing-secret';
  app.setErrorHandler((e, _req, reply) => reply.code(e instanceof AppError ? e.statusCode : 500).send({ error: e.message }));
  const auth = createAdminAuth({ superAdminKey: 'platform-key', jwtSecret: secret, tenantService });
  await registerMcpRoutes(app, { store, tenantService, adminAuth: auth,
    actionVerification: ready ? { keyId: 'test', algorithm: 'RS256', issuer: 'test', publicKeyPem: 'public-fixture' } : undefined });
  const handler = vi.fn(async () => ({ ok: true }));
  app.get('/api/admin/tenants', { preHandler: auth }, handler);
  app.post('/api/admin/tenants', { preHandler: auth }, handler);
  app.patch('/api/admin/tenants/:id', { preHandler: auth }, handler);
  app.get('/api/admin/sessions', { preHandler: auth }, handler);
  app.delete('/api/admin/sessions/:id', { preHandler: auth }, handler);
  const headers = { authorization: 'Bearer ' + key };
  const payload = { serverUrl: 'https://example.com/mcp', serviceToken: 's'.repeat(40), allowedTools: ['get_data'],
    actionPolicy: { contractVersion: 1, enabled: true, operations: ['change_delivery_date'] } };
  return { app, headers, payload, records, lookup, secret, handler };
}
describe('Tenant self-service boundary', () => {
  it('uses the existing tenant key for own MCP CRUD; denies every cross-tenant method and revoked keys', async () => {
    const f = await setup(); const url = '/api/admin/tenants/a/mcp';
    expect((await f.app.inject({ url, headers: f.headers })).statusCode).toBe(200);
    expect((await f.app.inject({ method: 'PUT', url, headers: f.headers, payload: f.payload })).statusCode).toBe(200);
    expect(f.records.get('a')?.actionPolicy?.operations).toEqual(['change_delivery_date']);
    const read = await f.app.inject({ url, headers: f.headers }); expect(read.body).not.toContain(f.payload.serviceToken);
    for (const method of ['GET', 'PUT', 'DELETE'] as const) {
      expect((await f.app.inject({ method, url: '/api/admin/tenants/b/mcp', headers: f.headers,
        ...(method === 'PUT' ? { payload: f.payload } : {}) })).statusCode).toBe(403);
    }
    expect((await f.app.inject({ method: 'DELETE', url, headers: f.headers })).statusCode).toBe(200);
    expect(f.records.size).toBe(0); f.lookup.mockResolvedValue(null);
    expect((await f.app.inject({ url, headers: f.headers })).statusCode).toBe(403); await f.app.close();
  });
  it('denies platform changes and global sessions for tenant keys and tenant JWTs', async () => {
    const f = await setup();
    const token = jwt.sign({ role: 'tenant_admin', tenantId: 'a', purpose: 'admin' }, f.secret,
      { issuer: TOKEN_ISSUER, audience: ADMIN_AUDIENCE, expiresIn: '1h' });
    for (const headers of [f.headers, { authorization: 'Bearer ' + token }]) {
      expect((await f.app.inject({ url: '/api/admin/tenants', headers })).statusCode).toBe(200);
      for (const [method, url] of [['POST', '/api/admin/tenants'], ['PATCH', '/api/admin/tenants/a'],
        ['GET', '/api/admin/sessions'], ['DELETE', '/api/admin/sessions/c1']] as const) {
        expect((await f.app.inject({ method, url, headers })).statusCode).toBe(403);
      }
    }
    expect(f.handler).toHaveBeenCalledTimes(2); await f.app.close();
  });
  it('fails closed without platform signing, but still allows read configuration', async () => {
    const f = await setup(false); const url = '/api/admin/tenants/a/mcp';
    expect((await f.app.inject({ method: 'PUT', url, headers: f.headers, payload: f.payload })).statusCode).toBe(503);
    expect(f.records.size).toBe(0);
    expect((await f.app.inject({ method: 'PUT', url, headers: f.headers,
      payload: { ...f.payload, actionPolicy: { ...f.payload.actionPolicy, enabled: false, operations: [] } } })).statusCode).toBe(200);
    expect((await f.app.inject({ url, headers: f.headers })).json().actionVerification).toBeNull(); await f.app.close();
  });
});
