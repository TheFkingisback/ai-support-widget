/** Solo backend. Implemente verifyAccessToken con el SDK de su emisor o la introspección de tokens.
 * Debe verificar el emisor, la firma o el estado activo, la audiencia exacta del recurso y la caducidad.
 * El sujeto devuelto debe identificar la membresía actual de la organización.
 */
export async function authenticateSupportMcp(headers, { resource, verifyAccessToken }) {
  const token = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(headers.authorization ?? '')?.[1];
  if (!token || !resource) throw new Error('MCP_UNAUTHORIZED');
  const claims = await verifyAccessToken(token, { audience: resource });
  const audience = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  if (!claims?.sub || !audience.includes(resource) || !Number.isFinite(claims.exp) ||
      claims.exp <= Date.now() / 1000) throw new Error('MCP_UNAUTHORIZED');
  return claims; // Cada controlador autoriza el recurso y el alcance solicitados en la aplicación.
}
