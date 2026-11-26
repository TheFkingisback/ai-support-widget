/** صرف بیک اینڈ۔ اپنے جاری کنندہ کے SDK یا ٹوکن انسپیکشن کے ساتھ verifyAccessToken کو نافذ کریں۔
 * اسے جاری کنندہ، دستخط یا فعال حالت، درست وسائل کے سامعین اور میعاد کی جانچ کرنی چاہیے۔
 * واپس کیا گیا موضوع موجودہ تنظیم کی رکنیت کی نشاندہی کرنا چاہیے۔
 */
export async function authenticateSupportMcp(headers, { resource, verifyAccessToken }) {
  const token = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(headers.authorization ?? '')?.[1];
  if (!token || !resource) throw new Error('MCP_UNAUTHORIZED');
  const claims = await verifyAccessToken(token, { audience: resource });
  const audience = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  if (!claims?.sub || !audience.includes(resource) || !Number.isFinite(claims.exp) ||
      claims.exp <= Date.now() / 1000) throw new Error('MCP_UNAUTHORIZED');
  return claims; // ہر ہینڈلر ایپلیکیشن میں درخواست کردہ وسائل اور دائرہ کار کو اجازت دیتا ہے۔
}
