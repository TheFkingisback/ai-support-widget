/** బ్యాకెండ్ మాత్రమే. మీ జారీచేసేవారి SDK లేదా టోకెన్ ఇంట్రోస్పెక్షన్ తో verifyAccessTokenని అమలు చేయండి.
 * ఇది జారీచేసేవారిని, సంతకాన్ని లేదా క్రియాశీల స్థితిని, ఖచ్చితమైన వనరుల ప్రేక్షకులను మరియు గడువును తనిఖీ చేయాలి.
 * తిరిగి వచ్చిన సబ్జెక్ట్ ప్రస్తుత సంస్థ సభ్యత్వాన్ని గుర్తించాలి.
 */
export async function authenticateSupportMcp(headers, { resource, verifyAccessToken }) {
  const token = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(headers.authorization ?? '')?.[1];
  if (!token || !resource) throw new Error('MCP_UNAUTHORIZED');
  const claims = await verifyAccessToken(token, { audience: resource });
  const audience = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  if (!claims?.sub || !audience.includes(resource) || !Number.isFinite(claims.exp) ||
      claims.exp <= Date.now() / 1000) throw new Error('MCP_UNAUTHORIZED');
  return claims; // ప్రతి హ్యాండ్లర్ అప్లికేషన్‌లో అభ్యర్థించిన వనరు మరియు పరిధిని అధికారం చేస్తుంది.
}
