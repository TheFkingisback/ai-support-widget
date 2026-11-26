/** Chỉ phần phụ trợ. Triển khai verifyAccessToken bằng SDK của nhà phát hành hoặc kiểm tra mã thông báo.
 * Nó phải kiểm tra nhà phát hành, chữ ký hoặc trạng thái hoạt động, đối tượng tài nguyên chính xác và thời hạn.
 * Chủ đề được trả về phải xác định tư cách thành viên tổ chức hiện tại.
 */
export async function authenticateSupportMcp(headers, { resource, verifyAccessToken }) {
  const token = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/.exec(headers.authorization ?? '')?.[1];
  if (!token || !resource) throw new Error('MCP_UNAUTHORIZED');
  const claims = await verifyAccessToken(token, { audience: resource });
  const audience = Array.isArray(claims?.aud) ? claims.aud : [claims?.aud];
  if (!claims?.sub || !audience.includes(resource) || !Number.isFinite(claims.exp) ||
      claims.exp <= Date.now() / 1000) throw new Error('MCP_UNAUTHORIZED');
  return claims; // Mỗi trình xử lý ủy quyền tài nguyên và phạm vi được yêu cầu trong ứng dụng.
}
