/** 僅限後端。使用發行者的 SDK 或令牌內省實現 verifyAccessToken。
 * 它必須檢查發行者、簽名或活動狀態、確切的資源受眾和過期時間。
 * 返回的主體必須識別當前的組織成員資格。
 */
export async function authenticateSupportMcp(headers, { resource, verifyAccessToken }) {
  const token = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(headers.authorization ?? '')?.[1];
  if (!token || !resource) throw new Error('MCP_UNAUTHORIZED');
  const claims = await verifyAccessToken(token, { audience: resource });
  const audience = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  if (!claims?.sub || !audience.includes(resource) || !Number.isFinite(claims.exp) ||
      claims.exp <= Date.now() / 1000) throw new Error('MCP_UNAUTHORIZED');
  return claims; // 每個處理程序都會授權應用程式中請求的資源和範圍。
}
