/** Само позадина. Имплементирајте verifyAccessToken са SDK вашег издаваоца или интроспекцијом токена.
 * Мора проверити издаваоца, потпис или активно стање, тачну публику ресурса и истек.
 * Враћени субјект мора идентификовати тренутно чланство у организацији.
 */
export async function authenticateSupportMcp(headers, { resource, verifyAccessToken }) {
  const token = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(headers.authorization ?? '')?.[1];
  if (!token || !resource) throw new Error('MCP_UNAUTHORIZED');
  const claims = await verifyAccessToken(token, { audience: resource });
  const audience = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  if (!claims?.sub || !audience.includes(resource) || !Number.isFinite(claims.exp) ||
      claims.exp <= Date.now() / 1000) throw new Error('MCP_UNAUTHORIZED');
  return claims; // Сваки руковалац овлашћује тражени ресурс и опсег у апликацији.
}
