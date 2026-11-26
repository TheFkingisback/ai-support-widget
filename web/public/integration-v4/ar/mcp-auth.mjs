/** الواجهة الخلفية فقط. قم بتنفيذ verifyAccessToken باستخدام SDK الخاص بالجهة المصدرة أو فحص الرمز المميز.
 * يجب أن يتحقق من الجهة المصدرة، التوقيع أو الحالة النشطة، الجمهور الدقيق للمورد وانتهاء الصلاحية.
 * يجب أن يحدد الموضوع المرتجع عضوية المنظمة الحالية.
 */
export async function authenticateSupportMcp(headers, { resource, verifyAccessToken }) {
  const token = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(headers.authorization ?? '')?.[1];
  if (!token || !resource) throw new Error('MCP_UNAUTHORIZED');
  const claims = await verifyAccessToken(token, { audience: resource });
  const audience = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  if (!claims?.sub || !audience.includes(resource) || !Number.isFinite(claims.exp) ||
      claims.exp <= Date.now() / 1000) throw new Error('MCP_UNAUTHORIZED');
  return claims; // يصرح كل معالج بالموارد والنطاق المطلوبين في التطبيق.
}
