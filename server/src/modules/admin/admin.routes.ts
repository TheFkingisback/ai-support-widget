import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { log } from '../../shared/logger.js';
import { validateBody } from '../../shared/validation.js';
import { ForbiddenError } from '../../shared/errors.js';
import type { TenantService } from './tenant.service.js';
import type { AnalyticsService } from './analytics.service.js';
import type { AuditService } from './audit.service.js';
import type { ModelListService } from '../orchestrator/model-list.service.js';
import type { CostService } from './cost.service.js';

const createTenantBody = z.object({
  name: z.string().min(1).max(200),
  plan: z.enum(['starter', 'pro', 'enterprise']),
  config: z.record(z.unknown()).optional(),
  apiBaseUrl: z.string().url(),
  serviceToken: z.string().min(1),
});

const updateTenantBody = z.object({
  name: z.string().min(1).max(200).optional(),
  plan: z.enum(['starter', 'pro', 'enterprise']).optional(),
  config: z.record(z.unknown()).optional(),
});

const paginationQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export interface AdminRouteOpts {
  tenantService: TenantService;
  analyticsService: AnalyticsService;
  auditService: AuditService;
  adminAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  loginHandler?: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  /** Optional: provides case listing by tenant */
  getCasesByTenant?: (tenantId: string) => Promise<unknown[]>;
  /** Optional: provides OpenRouter model list */
  modelListService?: ModelListService;
  /** Optional: provides LLM cost tracking */
  costService?: CostService;
}

/** Throws if tenant_admin tries to access a different tenant. */
function assertTenantAccess(request: FastifyRequest, targetTenantId: string): void {
  const p = request.adminPayload;
  if (p?.role === 'tenant_admin' && p.tenantId !== targetTenantId) {
    throw new ForbiddenError('Access denied: cannot access other tenants');
  }
}

export async function registerAdminRoutes(
  app: FastifyInstance,
  opts: AdminRouteOpts,
): Promise<void> {
  const { tenantService, analyticsService, auditService, adminAuth, loginHandler, getCasesByTenant, modelListService, costService } = opts;

  // POST /api/admin/login (no auth required)
  if (loginHandler) {
    app.post('/api/admin/login', async (request, reply) => loginHandler(request, reply));
  }

  // GET /api/admin/tenants
  app.get(
    '/api/admin/tenants',
    { preHandler: [adminAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const reqId = request.id as string;
      log.info('GET /api/admin/tenants', reqId);
      const p = request.adminPayload;
      if (p?.role === 'tenant_admin' && p.tenantId) {
        const tenant = await tenantService.getTenant(p.tenantId, reqId);
        return reply.code(200).send({ tenants: [tenant] });
      }
      const tenants = await tenantService.listTenants(reqId);
      return reply.code(200).send({ tenants });
    },
  );

  // POST /api/admin/tenants
  app.post(
    '/api/admin/tenants',
    { preHandler: [adminAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const reqId = request.id as string;
      const { name, plan, config, apiBaseUrl, serviceToken } = validateBody(createTenantBody, request.body);
      const result = await tenantService.createTenant(
        name, plan, config as Record<string, unknown> | undefined,
        apiBaseUrl, serviceToken, reqId,
      );
      log.info('POST /api/admin/tenants response', reqId, { tenantId: result.tenant.id });
      return reply.code(200).send({ tenant: result.tenant, adminApiKey: result.adminApiKey });
    },
  );

  // POST /api/admin/tenants/:id/reset-key
  app.post<{ Params: { id: string } }>(
    '/api/admin/tenants/:id/reset-key',
    { preHandler: [adminAuth] },
    async (request, reply) => {
      const reqId = request.id as string;
      const { id } = request.params;
      assertTenantAccess(request, id);
      const result = await tenantService.resetAdminKey(id, reqId);
      return reply.code(200).send({ adminApiKey: result.adminApiKey });
    },
  );

  // PATCH /api/admin/tenants/:id
  app.patch<{ Params: { id: string } }>(
    '/api/admin/tenants/:id',
    { preHandler: [adminAuth] },
    async (request, reply) => {
      const reqId = request.id as string;
      const { id } = request.params;
      assertTenantAccess(request, id);

      const updates = validateBody(updateTenantBody, request.body);
      const tenant = await tenantService.updateTenant(id, updates, reqId);
      return reply.code(200).send({ tenant });
    },
  );

  // DELETE /api/admin/tenants/:id
  app.delete<{ Params: { id: string } }>(
    '/api/admin/tenants/:id',
    { preHandler: [adminAuth] },
    async (request, reply) => {
      const reqId = request.id as string;
      const { id } = request.params;
      assertTenantAccess(request, id);
      await tenantService.deleteTenant(id, reqId);
      return reply.code(200).send({ ok: true });
    },
  );

  // GET /api/admin/tenants/:id/analytics
  app.get<{ Params: { id: string } }>(
    '/api/admin/tenants/:id/analytics',
    { preHandler: [adminAuth] },
    async (request, reply) => {
      const reqId = request.id as string;
      const { id } = request.params;
      assertTenantAccess(request, id);
      const analytics = await analyticsService.getAnalytics(id, reqId);
      return reply.code(200).send({ analytics });
    },
  );

  // GET /api/admin/tenants/:id/cases
  app.get<{ Params: { id: string } }>(
    '/api/admin/tenants/:id/cases',
    { preHandler: [adminAuth] },
    async (request, reply) => {
      const reqId = request.id as string;
      const { id } = request.params;
      assertTenantAccess(request, id);
      const cases = getCasesByTenant ? await getCasesByTenant(id) : [];
      log.info('GET /api/admin/tenants/:id/cases', reqId, { tenantId: id });
      return reply.code(200).send({ cases });
    },
  );

  // GET /api/admin/tenants/:id/audit
  app.get<{ Params: { id: string }; Querystring: { page?: string; pageSize?: string } }>(
    '/api/admin/tenants/:id/audit',
    { preHandler: [adminAuth] },
    async (request, reply) => {
      const reqId = request.id as string;
      const { id } = request.params;
      assertTenantAccess(request, id);

      const pagination = validateBody(paginationQuery, request.query);
      const result = await auditService.getAuditLog(
        id, pagination.page, pagination.pageSize, reqId,
      );
      return reply.code(200).send({
        entries: result.data,
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        hasMore: result.hasMore,
      });
    },
  );

  // GET /api/admin/models
  if (modelListService) {
    app.get(
      '/api/admin/models',
      { preHandler: [adminAuth] },
      async (request: FastifyRequest, reply: FastifyReply) => {
        const reqId = request.id as string;
        log.info('GET /api/admin/models', reqId);
        const models = await modelListService.getModels(reqId);
        return reply.code(200).send({ models });
      },
    );
  }

  // GET /api/admin/tenants/:id/costs?month=YYYY-MM
  if (costService) {
    app.get<{ Params: { id: string }; Querystring: { month?: string } }>(
      '/api/admin/tenants/:id/costs',
      { preHandler: [adminAuth] },
      async (request, reply) => {
        const reqId = request.id as string;
        const { id } = request.params;
        assertTenantAccess(request, id);
        const month = (request.query as { month?: string }).month
          ?? new Date().toISOString().slice(0, 7);
        log.info('GET /api/admin/tenants/:id/costs', reqId, { tenantId: id, month });
        const costs = await costService.getMonthlySummary(id, month, reqId);
        return reply.code(200).send({ costs });
      },
    );
  }
}
