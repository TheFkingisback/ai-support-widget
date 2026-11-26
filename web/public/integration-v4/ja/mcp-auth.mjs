/** バックエンドのみ。発行者のSDKまたはトークンイントロスペクションを使用してverifyAccessTokenを実装します。
 * 発行者、署名またはアクティブ状態、正確なリソースオーディエンス、および有効期限を確認する必要があります。
 * 返されるサブジェクトは、現在の組織メンバーシップを識別する必要があります。
 */
export async function authenticateSupportMcp(headers, { resource, verifyAccessToken }) {
  const token = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(headers.authorization ?? '')?.[1];
  if (!token || !resource) throw new Error('MCP_UNAUTHORIZED');
  const claims = await verifyAccessToken(token, { audience: resource });
  const audience = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  if (!claims?.sub || !audience.includes(resource) || !Number.isFinite(claims.exp) ||
      claims.exp <= Date.now() / 1000) throw new Error('MCP_UNAUTHORIZED');
  return claims; // 各ハンドラーは、アプリケーションで要求されたリソースとスコープを承認します。
}
