/** Backend pekee. Tekeleza verifyAccessToken na SDK ya mtoaji wako au utambuzi wa tokeni.
 * Lazima iangalie mtoaji, saini au hali amilifu, hadhira halisi ya rasilimali na muda wa kuisha.
 * Mada iliyorejeshwa lazima itambue uanachama wa sasa wa shirika.
 */
export async function authenticateSupportMcp(headers, { resource, verifyAccessToken }) {
  const token = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(headers.authorization ?? '')?.[1];
  if (!token || !resource) throw new Error('MCP_UNAUTHORIZED');
  const claims = await verifyAccessToken(token, { audience: resource });
  const audience = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  if (!claims?.sub || !audience.includes(resource) || !Number.isFinite(claims.exp) ||
      claims.exp <= Date.now() / 1000) throw new Error('MCP_UNAUTHORIZED');
  return claims; // Kila kishughulikia kinaidhinisha rasilimali iliyoombwa na wigo katika programu.
}
