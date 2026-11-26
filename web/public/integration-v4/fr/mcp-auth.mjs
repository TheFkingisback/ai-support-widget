/** "Backend" uniquement. Implémentez verifyAccessToken avec le SDK de votre émetteur ou l'introspection de jeton.
 * Il doit vérifier l'émetteur, la signature ou l'état actif, l'audience exacte de la ressource et l'expiration.
 * Le sujet retourné doit identifier l'adhésion à l'organisation actuelle.
 */
export async function authenticateSupportMcp(headers, { resource, verifyAccessToken }) {
  const token = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(headers.authorization ?? '')?.[1];
  if (!token || !resource) throw new Error('MCP_UNAUTHORIZED');
  const claims = await verifyAccessToken(token, { audience: resource });
  const audience = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  if (!claims?.sub || !audience.includes(resource) || !Number.isFinite(claims.exp) ||
      claims.exp <= Date.now() / 1000) throw new Error('MCP_UNAUTHORIZED');
  return claims; // Chaque gestionnaire autorise la ressource et la portée demandées dans l'application.
}
