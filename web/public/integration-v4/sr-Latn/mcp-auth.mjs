/** Samo backend. Implementirajte verifyAccessToken sa SDK vašeg izdavaoca ili introspekcijom tokena.
 * Mora proveriti izdavaoca, potpis ili aktivno stanje, tačnu publiku resursa i istek.
 * Vraćeni subjekat mora identifikovati trenutno članstvo u organizaciji.
 */
export async function authenticateSupportMcp(headers, { resource, verifyAccessToken }) {
  const token = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(headers.authorization ?? '')?.[1];
  if (!token || !resource) throw new Error('MCP_UNAUTHORIZED');
  const claims = await verifyAccessToken(token, { audience: resource });
  const audience = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  if (!claims?.sub || !audience.includes(resource) || !Number.isFinite(claims.exp) ||
      claims.exp <= Date.now() / 1000) throw new Error('MCP_UNAUTHORIZED');
  return claims; // Svaki rukovalac autorizuje traženi resurs i opseg u aplikaciji.
}
