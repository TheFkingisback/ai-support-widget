/** Backend فقط. نفذ verifyAccessToken باستخدام SDK الخاص بالجهة المصدرة أو فحص التوكن.
 * يجب أن يتحقق من المصدر، التوقيع أو الحالة النشطة، الجمهور الدقيق للمورد وتاريخ الانتهاء.
 * الموضوع المرجع يجب أن يحدد عضوية المنظمة الحالية.
 */
export async function authenticateSupportMcp(headers, { resource, verifyAccessToken }) {
  const token = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(headers.authorization ?? '')?.[1];
  if (!token || !resource) throw new Error('MCP_UNAUTHORIZED');
  const claims = await verifyAccessToken(token, { audience: resource });
  const audience = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  if (!claims?.sub || !audience.includes(resource) || !Number.isFinite(claims.exp) ||
      claims.exp <= Date.now() / 1000) throw new Error('MCP_UNAUTHORIZED');
  return claims; // كل handler بيصرح المورد والنطاق المطلوبين في التطبيق.
}
