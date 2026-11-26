/** केवल बैकएंड। अपने जारीकर्ता के SDK या टोकन इंट्रॉस्पेक्शन के साथ verifyAccessToken को लागू करें।
 * इसे जारीकर्ता, हस्ताक्षर या सक्रिय स्थिति, सटीक संसाधन दर्शक और समाप्ति की जाँच करनी चाहिए।
 * लौटाया गया विषय वर्तमान संगठन सदस्यता की पहचान करना चाहिए।
 */
export async function authenticateSupportMcp(headers, { resource, verifyAccessToken }) {
  const token = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(headers.authorization ?? '')?.[1];
  if (!token || !resource) throw new Error('MCP_UNAUTHORIZED');
  const claims = await verifyAccessToken(token, { audience: resource });
  const audience = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  if (!claims?.sub || !audience.includes(resource) || !Number.isFinite(claims.exp) ||
      claims.exp <= Date.now() / 1000) throw new Error('MCP_UNAUTHORIZED');
  return claims; // प्रत्येक हैंडलर एप्लिकेशन में अनुरोधित संसाधन और दायरे को अधिकृत करता है।
}
