import { createHash, timingSafeEqual } from 'node:crypto';

const digest = value => createHash('sha256').update(value).digest();
/** Backend-only gate. Follow it with active-user lookup and resource authorization on EVERY operation. */
export function authenticateSupportMcp(headers, { serviceToken, tenantId }) {
  if (!serviceToken || serviceToken.length < 32 || !tenantId) throw new Error('MCP_NOT_CONFIGURED');
  const auth = headers.authorization;
  const delegated = headers['x-mcp-user-id'];
  const tenant = headers['x-mcp-tenant-id'];
  if (typeof auth !== 'string' || !auth.startsWith('Bearer ') || auth.length > 4103 ||
      typeof tenant !== 'string' || tenant !== tenantId ||
      typeof delegated !== 'string' || !/^[A-Za-z0-9_-]{1,200}$/.test(delegated) ||
      !timingSafeEqual(digest(auth.slice(7)), digest(serviceToken))) throw new Error('MCP_UNAUTHORIZED');
  return { tenantId, supportUserId: delegated };
}
// Never accept the old WIDGET_JWT_SECRET as an alternative on this integration route.
// Never trust userId/organizationId supplied in tool arguments.
// Store sessions by authenticated principal, or use a fresh stateless server per request.
