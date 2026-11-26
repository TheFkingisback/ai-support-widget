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
      assert.deepEqual(JSON.parse(init.body), { userId: 'usr_a', userEmail: '', userRoles: [], plan: 'standard', mcpServers: [] });
      return new Response(JSON.stringify({ jwt: 'a.b.c', expiresIn: 900, tenantKey: 'ten_example' }));
    };
    assert.equal((await issueSupportSession({ userId: 'usr_a', tenantId: 'must-not-send' })).tenantKey, 'ten_example');
    globalThis.fetch = async () => new Response(JSON.stringify({ jwt: 'a.b.c', expiresIn: 900, tenantKey: 'ten_other' }));
    await assert.rejects(issueSupportSession({ userId: 'usr_a' }), /INVALID_RESPONSE/);
  } finally { globalThis.fetch = old; }
});
test('the provider authenticates a short-lived access token for this resource and subject', async () => {
  const resource = 'https://billing.example/mcp';
  const claims = { sub: 'membership-a', aud: resource, exp: Math.floor(Date.now()/1000)+120 };
  const verifyAccessToken = async token => token === 'fixture' ? claims : null;
  const headers = { authorization: 'Bearer fixture' };
  assert.equal((await authenticateSupportMcp(headers,{ resource, verifyAccessToken })).sub, claims.sub);
  await assert.rejects(authenticateSupportMcp(headers,{ resource: 'https://crm.example/mcp', verifyAccessToken }));
  claims.exp = 1;
  await assert.rejects(authenticateSupportMcp(headers,{ resource, verifyAccessToken }));
});
