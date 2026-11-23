import type { ActionVerification } from '../actions/action-proof.js';
import { actionPolicySchema } from '../actions/action-contract.js';
import { z } from 'zod';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { McpStore } from './mcp-store.js';
import type { TenantService } from '../admin/tenant.service.js';
import { encryptToken } from '../admin/encryption.js';
import { validateMcpUrl } from './mcp-network.js';
import { AppError, ForbiddenError } from '../../shared/errors.js';
import { validateBody } from '../../shared/validation.js';

const body = z.object({
  serverUrl: z.string().max(2048),
  serviceToken: z.string().min(32).max(4096).regex(/^[\x21-\x7e]+$/),
  actionPolicy: actionPolicySchema.optional(),
  allowedTools: z.array(z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/).refine(n => !['prepare_action', 'execute_action', 'get_action_status'].includes(n))).min(1).max(50),
}).strict();
export interface McpRouteOpts {
  store: McpStore; tenantService: TenantService; actionVerification?: ActionVerification;
  adminAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
}
export function createMcpSettings(opts: Omit<McpRouteOpts, 'adminAuth'>) {
  return {
    async get(tenantId: string, requestId?: string) {
      await opts.tenantService.getTenant(tenantId, requestId);
      const record = await opts.store.find(tenantId);
      const actionVerification = opts.actionVerification ?? null;
      return record ? { actionVerification, configured: true, serverUrl: record.serverUrl, allowedTools: record.allowedTools,
        actionPolicy: record.actionPolicy ?? null, updatedAt: record.updatedAt.toISOString() }
        : { actionVerification, configured: false, serverUrl: '', allowedTools: [] };
    },
    async replace(tenantId: string, payload: unknown, requestId?: string) {
      const data = validateBody(body, payload);
      if (data.actionPolicy?.enabled && !opts.actionVerification) {
        throw new AppError(503, 'ACTION_SIGNING_UNAVAILABLE', 'Human-confirmed actions are not available on this platform yet');
      }
      const url = validateMcpUrl(data.serverUrl);
      await opts.tenantService.getTenant(tenantId, requestId);
      await opts.store.save({ tenantId, serverUrl: url.href, encryptedToken: encryptToken(data.serviceToken),
        allowedTools: [...new Set(data.allowedTools)], actionPolicy: data.actionPolicy ?? null, updatedAt: new Date() });
      return { ok: true };
    },
    async remove(tenantId: string, requestId?: string) {
      await opts.tenantService.getTenant(tenantId, requestId);
      await opts.store.remove(tenantId);
      return { ok: true };
    },
  };
}
/** Self-service MCP configuration scoped to the authenticated tenant. Credentials are write-only and separate from widget signing. */
export async function registerMcpRoutes(app: FastifyInstance, opts: McpRouteOpts): Promise<void> {
  const route = '/api/admin/tenants/:id/mcp';
  const auth = async (req: FastifyRequest, reply: FastifyReply) => {
    await opts.adminAuth(req, reply);
    const actor = req.adminPayload;
    const tenantId = (req.params as { id: string }).id;
    if (actor?.role !== 'super_admin' && !(actor?.role === 'tenant_admin' && actor.tenantId === tenantId)) {
      throw new ForbiddenError('Cannot configure another tenant');
    }
    reply.header('Cache-Control', 'no-store');
  };
  const settings = createMcpSettings(opts);
  app.get<{ Params: { id: string } }>(route, { preHandler: auth }, req => settings.get(req.params.id, req.id));
  app.put<{ Params: { id: string } }>(route, { preHandler: auth }, req => settings.replace(req.params.id, req.body, req.id));
  app.delete<{ Params: { id: string } }>(route, { preHandler: auth }, req => settings.remove(req.params.id, req.id));
}
