/** Nur Backend. Implementieren Sie verifyAccessToken mit dem SDK Ihres Ausstellers oder der Token-Introspektion.
 * Es muss Aussteller, Signatur oder aktiven Status, genaue Ressourcen-Zielgruppe und Ablauf überprüfen.
 * Das zurückgegebene Subjekt muss die aktuelle Organisationsmitgliedschaft identifizieren.
 */
export async function authenticateSupportMcp(headers, { resource, verifyAccessToken }) {
  const token = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(headers.authorization ?? '')?.[1];
  if (!token || !resource) throw new Error('MCP_UNAUTHORIZED');
  const claims = await verifyAccessToken(token, { audience: resource });
  const audience = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  if (!claims?.sub || !audience.includes(resource) || !Number.isFinite(claims.exp) ||
      claims.exp <= Date.now() / 1000) throw new Error('MCP_UNAUTHORIZED');
  return claims; // Jeder Handler autorisiert die angeforderte Ressource und den Umfang in der Anwendung.
}
