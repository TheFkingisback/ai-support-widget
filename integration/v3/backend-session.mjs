// Node.js 20+. Backend only. Authenticate the application session BEFORE calling this function.
export async function issueSupportSession(identity, signal) {
  const base = process.env.SUPPORT_API_URL;
  const credential = process.env.SUPPORT_INTEGRATION_CREDENTIAL;
  const expectedTenant = process.env.SUPPORT_TENANT_ID;
  if (base !== 'https://support-ai.pontes.uk' || !credential?.startsWith('sik_') || !expectedTenant) {
    throw new Error('SUPPORT_NOT_CONFIGURED');
  }
  const { userId, userEmail = '', userRoles = [], plan = 'standard' } = identity;
  if (typeof userId !== 'string' || !userId.trim() || userId.length > 200) throw new Error('SUPPORT_INVALID_IDENTITY');
  let response;
  try {
    response = await fetch(`${base}/api/widget/sessions`, {
      method: 'POST', headers: { Authorization: `Bearer ${credential}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, userEmail, userRoles, plan }), redirect: 'error', cache: 'no-store',
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000),
    });
  } catch { throw new Error('SUPPORT_SESSION_UNAVAILABLE'); }
  if (!response.ok) throw new Error(`SUPPORT_SESSION_HTTP_${response.status}`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error('SUPPORT_SESSION_INVALID_RESPONSE');
  let bytes = 0; const chunks = [];
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      bytes += value.length;
      if (bytes > 32768) throw new Error('SUPPORT_SESSION_INVALID_RESPONSE');
      chunks.push(value);
    }
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (data.tenantKey !== expectedTenant || data.expiresIn !== 900 || typeof data.jwt !== 'string' || data.jwt.split('.').length !== 3) {
      throw new Error('SUPPORT_SESSION_INVALID_RESPONSE');
    }
    return { jwt: data.jwt, tenantKey: data.tenantKey, expiresIn: data.expiresIn };
  } catch { throw new Error('SUPPORT_SESSION_INVALID_RESPONSE'); }
  finally { await reader.cancel().catch(() => {}); }
}
