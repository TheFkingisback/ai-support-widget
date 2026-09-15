import { actionPolicySchema } from '../actions/action-contract.js';
import { z } from 'zod';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { McpStore } from './mcp-store.js';
import type { TenantService } from '../admin/tenant.service.js';
import { encryptToken } from '../admin/encryption.js';
import { validateMcpUrl } from './mcp-network.js';
import { ForbiddenError } from '../../shared/errors.js';
import { validateBody } from '../../shared/validation.js';

const body = z.object({
  serverUrl: z.string().max(2048),
  serviceToken: z.string().min(32).max(4096).regex(/^[\x21-\x7e]+$/),
  actionPolicy: actionPolicySchema.optional(),
  allowedTools: z.array(z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/).refine(n => !['prepare_action', 'execute_action', 'get_action_status'].includes(n))).min(1).max(50),
}).strict();
export interface McpRouteOpts {
  store: McpStore; tenantService: TenantService;
  adminAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
}
/** Operator-only MCP configuration. Credentials are write-only and separate from widget signing. */
export async function registerMcpRoutes(app: FastifyInstance, opts: McpRouteOpts): Promise<void> {
  const route = '/api/admin/tenants/:id/mcp';
  const auth = async (req: FastifyRequest, reply: FastifyReply) => {
    await opts.adminAuth(req, reply);
    if (req.adminPayload?.role !== 'super_admin') throw new ForbiddenError('Only the platform operator can configure MCP');
    reply.header('Cache-Control', 'no-store');
  };
  app.get<{ Params: { id: string } }>(route, { preHandler: auth }, async req => {
    await opts.tenantService.getTenant(req.params.id, req.id);
    const record = await opts.store.find(req.params.id);
    return record ? { configured: true, serverUrl: record.serverUrl, allowedTools: record.allowedTools, actionPolicy: record.actionPolicy ?? null,
      updatedAt: record.updatedAt.toISOString() } : { configured: false, serverUrl: '', allowedTools: [] };
  });
  app.put<{ Params: { id: string } }>(route, { preHandler: auth }, async req => {
    const data = validateBody(body, req.body);
    const url = validateMcpUrl(data.serverUrl);
    await opts.tenantService.getTenant(req.params.id, req.id);
    await opts.store.save({ tenantId: req.params.id, serverUrl: url.href,
      encryptedToken: encryptToken(data.serviceToken), allowedTools: [...new Set(data.allowedTools)], actionPolicy: data.actionPolicy ?? null, updatedAt: new Date() });
    return { ok: true };
  });
  app.delete<{ Params: { id: string } }>(route, { preHandler: auth }, async req => {
    await opts.tenantService.getTenant(req.params.id, req.id);
    await opts.store.remove(req.params.id); return { ok: true };
  });
}
