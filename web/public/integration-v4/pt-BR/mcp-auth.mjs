/** Apenas backend. Implemente verifyAccessToken com o SDK do seu emissor ou introspecção de token.
 * Deve verificar o emissor, a assinatura ou o estado ativo, o público exato do recurso e a expiração.
 * O assunto retornado deve identificar a associação atual da organização.
 */
export async function authenticateSupportMcp(headers, { resource, verifyAccessToken }) {
  const token = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(headers.authorization ?? '')?.[1];
  if (!token || !resource) throw new Error('MCP_UNAUTHORIZED');
  const claims = await verifyAccessToken(token, { audience: resource });
  const audience = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  if (!claims?.sub || !audience.includes(resource) || !Number.isFinite(claims.exp) ||
      claims.exp <= Date.now() / 1000) throw new Error('MCP_UNAUTHORIZED');
  return claims; // Cada manipulador autoriza o recurso e o escopo solicitados no aplicativo.
}
