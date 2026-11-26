/** Backend kawai. Aiwatar da verifyAccessToken tare da SDK na mai bayarwa ko binciken alama.
 * Dole ne ya duba mai bayarwa, sa hannu ko yanayin aiki, ainihin masu sauraron albarkatu da ƙarewa.
 * Batun da aka dawo dole ne ya gano memba na ƙungiyar na yanzu.
 */
export async function authenticateSupportMcp(headers, { resource, verifyAccessToken }) {
  const token = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(headers.authorization ?? '')?.[1];
  if (!token || !resource) throw new Error('MCP_UNAUTHORIZED');
  const claims = await verifyAccessToken(token, { audience: resource });
  const audience = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  if (!claims?.sub || !audience.includes(resource) || !Number.isFinite(claims.exp) ||
      claims.exp <= Date.now() / 1000) throw new Error('MCP_UNAUTHORIZED');
  return claims; // Kowane mai sarrafa yana ba da izini ga albarkatun da aka nema da iyakokin a cikin aikace-aikacen.
}
