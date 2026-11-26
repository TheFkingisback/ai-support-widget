/** केवळ बॅकएंड. तुमच्या जारीकर्त्याच्या SDK किंवा टोकन तपासणीसह verifyAccessToken लागू करा.
 * त्याने जारीकर्ता, स्वाक्षरी किंवा सक्रिय स्थिती, अचूक संसाधन प्रेक्षक आणि मुदतची तपासणी करणे आवश्यक आहे.
 * परत आलेल्या विषयाने सध्याची संस्था सदस्यत्व ओळखले पाहिजे.
 */
export async function authenticateSupportMcp(headers, { resource, verifyAccessToken }) {
  const token = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(headers.authorization ?? '')?.[1];
  if (!token || !resource) throw new Error('MCP_UNAUTHORIZED');
  const claims = await verifyAccessToken(token, { audience: resource });
  const audience = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  if (!claims?.sub || !audience.includes(resource) || !Number.isFinite(claims.exp) ||
      claims.exp <= Date.now() / 1000) throw new Error('MCP_UNAUTHORIZED');
  return claims; // प्रत्येक हँडलर ॲप्लिकेशनमधील विनंती केलेले संसाधन आणि व्याप्ती अधिकृत करतो.
}
