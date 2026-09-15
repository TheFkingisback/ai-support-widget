import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { registerMcpRoutes } from './mcp.routes.js';
import { mcpResolver, type McpRecord, type McpStore } from './mcp-store.js';
import { encryptToken } from '../admin/encryption.js';
import { resetEnvCache } from '../../shared/env.js';
import type { TenantService } from '../admin/tenant.service.js';
import { isPublicAddress, validateMcpUrl, createMcpFetch } from './mcp-network.js';
import { AppError } from '../../shared/errors.js';

beforeEach(() => { process.env.TOKEN_ENCRYPTION_KEY = 'fixture-encryption-key-only'; process.env.LOG_LEVEL = 'off'; resetEnvCache(); });
describe('MCP tenant configuration', () => {
  it('isolates URL, encrypted credential and catalog; no global fallback or stale cache', async () => {
    const records = new Map<string, McpRecord>();
    const store: McpStore = { find: async id => records.get(id) ?? null, save: async r => { records.set(r.tenantId, r); }, remove: async id => { records.delete(id); } };
    for (const id of ['a', 'b']) await store.save({ tenantId: id, serverUrl: `https://${id}.example.com/mcp`,
      encryptedToken: encryptToken(`secret-${id}`), allowedTools: [`read_${id}`], updatedAt: new Date() });
    const resolve = mcpResolver(store);
    expect(await resolve('a')).toEqual({ tenantId: 'a', serverUrl: 'https://a.example.com/mcp', serviceToken: 'secret-a', allowedTools: ['read_a'] });
    expect((await resolve('b'))?.serviceToken).toBe('secret-b');
    expect(await resolve('unknown')).toBeUndefined();
    await store.remove('a'); expect(await resolve('a')).toBeUndefined();
  });
  it('allows own tenant configuration, validates endpoint, and never returns the credential', async () => {
    const records = new Map<string, McpRecord>();
    const store: McpStore = { find: async id => records.get(id) ?? null, save: async r => { records.set(r.tenantId, r); }, remove: async id => { records.delete(id); } };
    const app = Fastify();
    app.setErrorHandler((err, _req, reply) => reply.code(err instanceof AppError ? err.statusCode : 500).send({ error: err.message }));
    await registerMcpRoutes(app, { store, tenantService: { getTenant: vi.fn().mockResolvedValue({ id: 'a' }) } as unknown as TenantService,
      adminAuth: async req => { req.adminPayload = req.headers.authorization === 'operator' ? { role: 'super_admin' } : { role: 'tenant_admin', tenantId: 'a' }; } });
    const url = '/api/admin/tenants/a/mcp'; const payload = { serverUrl: 'https://a.example.com/mcp', serviceToken: 's'.repeat(40), allowedTools: ['read_a'] };
    expect((await app.inject({ method: 'PUT', url, payload })).statusCode).toBe(200);
    expect((await app.inject({ method: 'PUT', url: '/api/admin/tenants/b/mcp', payload })).statusCode).toBe(403);
    expect((await app.inject({ method: 'PUT', url, payload, headers: { authorization: 'operator' } })).statusCode).toBe(200);
    const read = await app.inject({ url, headers: { authorization: 'operator' } });
    expect(read.headers['cache-control']).toBe('no-store'); expect(read.body).not.toContain(payload.serviceToken);
    expect(records.get('a')?.encryptedToken).not.toContain(payload.serviceToken);
    expect((await app.inject({ method: 'PUT', url, payload: { ...payload, serverUrl: 'https://127.0.0.1/mcp' }, headers: { authorization: 'operator' } })).statusCode).toBe(400);
    await app.inject({ method: 'DELETE', url, headers: { authorization: 'operator' } }); expect(records.size).toBe(0);
    await app.close();
  });
});
describe('MCP network boundary', () => {
  it.each(['127.0.0.1','10.1.2.3','169.254.169.254','100.64.0.1','192.168.0.1','172.31.1.1','::1','::ffff:127.0.0.1','fc00::1','2002:7f00:1::','2001:db8::1'])('blocks nonpublic address %s', ip => expect(isPublicAddress(ip)).toBe(false));
  it('accepts public addresses and refuses redirects or alternate destinations before network use', async () => {
    expect(isPublicAddress('8.8.8.8')).toBe(true); expect(isPublicAddress('2606:4700::1111')).toBe(true);
    expect(() => validateMcpUrl('http://example.com/mcp')).toThrow();
    expect(() => validateMcpUrl('https://example.com/mcp?token=x')).toThrow();
    await expect(createMcpFetch('https://example.com/mcp')('https://evil.example.com/mcp')).rejects.toThrow('destination changed');
  });
});
