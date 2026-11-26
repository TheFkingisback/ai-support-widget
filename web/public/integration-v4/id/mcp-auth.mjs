/** Hanya backend. Implementasikan verifyAccessToken dengan SDK penerbit Anda atau introspeksi token.
 * Ini harus memeriksa penerbit, tanda tangan atau status aktif, audiens sumber daya yang tepat, dan kedaluwarsa.
 * Subjek yang dikembalikan harus mengidentifikasi keanggotaan organisasi saat ini.
 */
export async function authenticateSupportMcp(headers, { resource, verifyAccessToken }) {
  const token = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(headers.authorization ?? '')?.[1];
  if (!token || !resource) throw new Error('MCP_UNAUTHORIZED');
  const claims = await verifyAccessToken(token, { audience: resource });
  const audience = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  if (!claims?.sub || !audience.includes(resource) || !Number.isFinite(claims.exp) ||
      claims.exp <= Date.now() / 1000) throw new Error('MCP_UNAUTHORIZED');
  return claims; // Setiap penangan mengotorisasi sumber daya dan cakupan yang diminta dalam aplikasi.
}
