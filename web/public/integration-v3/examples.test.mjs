import { test } from 'node:test';
import assert from 'node:assert/strict';
import { issueSupportSession } from './backend-session.mjs';
import { authenticateSupportMcp } from './mcp-auth.mjs';

test('backend uses a strict issuer payload and rejects wrong tenants', async () => {
  const old = globalThis.fetch;
  process.env.SUPPORT_API_URL = 'https://support-ai.pontes.uk';
  process.env.SUPPORT_TENANT_ID = 'ten_example'; process.env.SUPPORT_INTEGRATION_CREDENTIAL = 'sik_fixture_only';
  try {
    globalThis.fetch = async (_url, init) => {
      assert.equal(init.redirect, 'error');
      assert.deepEqual(JSON.parse(init.body), { userId: 'usr_a', userEmail: '', userRoles: [], plan: 'standard' });
      return new Response(JSON.stringify({ jwt: 'a.b.c', expiresIn: 900, tenantKey: 'ten_example' }));
    };
    assert.equal((await issueSupportSession({ userId: 'usr_a', tenantId: 'must-not-send' })).tenantKey, 'ten_example');
    globalThis.fetch = async () => new Response(JSON.stringify({ jwt: 'a.b.c', expiresIn: 900, tenantKey: 'ten_other' }));
    await assert.rejects(issueSupportSession({ userId: 'usr_a' }), /INVALID_RESPONSE/);
  } finally { globalThis.fetch = old; }
});
test('MCP requires the dedicated credential, expected tenant, and explicit delegated user', () => {
  const cfg = { serviceToken: 'fixture-only-secret-32-characters-long', tenantId: 'ten_example' };
  const headers = { authorization: `Bearer ${cfg.serviceToken}`, 'x-mcp-tenant-id': cfg.tenantId, 'x-mcp-user-id': 'usr_a' };
  assert.equal(authenticateSupportMcp(headers, cfg).supportUserId, 'usr_a');
  for (const change of [{ authorization: 'Bearer legacy-jwt' }, { 'x-mcp-tenant-id': 'ten_other' }, { 'x-mcp-user-id': '' }]) {
    assert.throws(() => authenticateSupportMcp({ ...headers, ...change }, cfg), /UNAUTHORIZED/);
  }
});
