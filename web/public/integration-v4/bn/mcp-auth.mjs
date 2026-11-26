/** শুধুমাত্র ব্যাকএন্ড। আপনার ইস্যুকারীর SDK বা টোকেন ইন্ট্রোস্পেকশন দিয়ে verifyAccessToken প্রয়োগ করুন।
 * এটি ইস্যুকারী, স্বাক্ষর বা সক্রিয় অবস্থা, সঠিক রিসোর্স শ্রোতা এবং মেয়াদ শেষ হওয়ার তারিখ পরীক্ষা করবে।
 * ফেরত আসা সাবজেক্টকে বর্তমান সংস্থা সদস্যপদ চিহ্নিত করতে হবে।
 */
export async function authenticateSupportMcp(headers, { resource, verifyAccessToken }) {
  const token = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(headers.authorization ?? '')?.[1];
  if (!token || !resource) throw new Error('MCP_UNAUTHORIZED');
  const claims = await verifyAccessToken(token, { audience: resource });
  const audience = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  if (!claims?.sub || !audience.includes(resource) || !Number.isFinite(claims.exp) ||
      claims.exp <= Date.now() / 1000) throw new Error('MCP_UNAUTHORIZED');
  return claims; // প্রতিটি হ্যান্ডলার অ্যাপ্লিকেশনে অনুরোধ করা রিসোর্স এবং স্কোপ অনুমোদন করে।
}
