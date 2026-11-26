/** Только бэкэнд. Реализуйте verifyAccessToken с помощью SDK вашего эмитента или интроспекции токена.
 * Он должен проверять эмитента, подпись или активное состояние, точную аудиторию ресурса и срок действия.
 * Возвращенный субъект должен идентифицировать текущее членство в организации.
 */
export async function authenticateSupportMcp(headers, { resource, verifyAccessToken }) {
  const token = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(headers.authorization ?? '')?.[1];
  if (!token || !resource) throw new Error('MCP_UNAUTHORIZED');
  const claims = await verifyAccessToken(token, { audience: resource });
  const audience = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  if (!claims?.sub || !audience.includes(resource) || !Number.isFinite(claims.exp) ||
      claims.exp <= Date.now() / 1000) throw new Error('MCP_UNAUTHORIZED');
  return claims; // Каждый обработчик авторизует запрошенный ресурс и область действия в приложении.
}
