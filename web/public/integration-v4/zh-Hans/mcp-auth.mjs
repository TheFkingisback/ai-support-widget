/** 仅限后端。使用您的发行者的 SDK 或令牌自省实现 verifyAccessToken。
 * 它必须检查发行者、签名或活动状态、确切的资源受众和过期时间。
 * 返回的主题必须标识当前的组织成员资格。
 */
export async function authenticateSupportMcp(headers, { resource, verifyAccessToken }) {
  const token = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(headers.authorization ?? '')?.[1];
  if (!token || !resource) throw new Error('MCP_UNAUTHORIZED');
  const claims = await verifyAccessToken(token, { audience: resource });
  const audience = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  if (!claims?.sub || !audience.includes(resource) || !Number.isFinite(claims.exp) ||
      claims.exp <= Date.now() / 1000) throw new Error('MCP_UNAUTHORIZED');
  return claims; // 每个处理程序都授权应用程序中请求的资源和范围。
}
