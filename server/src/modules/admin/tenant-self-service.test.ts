import Fastify from 'fastify';
import jwt from 'jsonwebtoken';
import { describe, it, expect, vi } from 'vitest';
import { createAdminAuth, hashApiKey } from './admin-auth.js';
import type { TenantService } from './tenant.service.js';
import { AppError } from '../../shared/errors.js';
import { resetEnvCache } from '../../shared/env.js';
import { TOKEN_ISSUER, ADMIN_AUDIENCE } from '../../shared/token-policy.js';

async function setup() {
  process.env.TOKEN_ENCRYPTION_KEY = 'fixture-encryption-key-only'; process.env.LOG_LEVEL = 'off'; resetEnvCache();
  const key = 'tsk_' + 'a'.repeat(32);
  const lookup = vi.fn(async (hash: string) => hash === hashApiKey(key) ? { id: 'a' } : null);
  const tenantService = { findTenantByAdminKeyHash: lookup, getTenant: vi.fn(async (id: string) => ({ id })) } as unknown as TenantService;
  const app = Fastify(); const secret = 'fixture-admin-signing-secret';
  app.setErrorHandler((e, _req, reply) => reply.code(e instanceof AppError ? e.statusCode : 500).send({ error: e.message }));
  const auth = createAdminAuth({ superAdminKey: 'platform-key', jwtSecret: secret, tenantService });
  const handler = vi.fn(async () => ({ ok: true }));
  app.get('/api/admin/tenants', { preHandler: auth }, handler);
  app.post('/api/admin/tenants', { preHandler: auth }, handler);
  app.patch('/api/admin/tenants/:id', { preHandler: auth }, handler);
  app.get('/api/admin/sessions', { preHandler: auth }, handler);
  app.delete('/api/admin/sessions/:id', { preHandler: auth }, handler);
  const headers = { authorization: 'Bearer ' + key };
  return { app, headers, secret, handler };
}
describe('Tenant self-service boundary', () => {
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
});
