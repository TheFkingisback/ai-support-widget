import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { log } from '../../shared/logger.js';
import { validateBody } from '../../shared/validation.js';
import type { TenantService } from './tenant.service.js';
import type { AnalyticsService } from './analytics.service.js';
import type { AuditService } from './audit.service.js';

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
  /** Optional: provides case listing by tenant */
  getCasesByTenant?: (tenantId: string) => Promise<unknown[]>;
}

export async function registerAdminRoutes(
  app: FastifyInstance,
  opts: AdminRouteOpts,
): Promise<void> {
  const { tenantService, analyticsService, auditService, adminAuth, getCasesByTenant } = opts;

  // GET /api/admin/tenants
  app.get(
    '/api/admin/tenants',
    { preHandler: [adminAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const reqId = request.id as string;
      log.info('GET /api/admin/tenants', reqId);
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
      const tenant = await tenantService.createTenant(
        name, plan, config as Record<string, unknown> | undefined,
        apiBaseUrl, serviceToken, reqId,
      );
      log.info('POST /api/admin/tenants response', reqId, { tenantId: tenant.id });
      return reply.code(200).send({ tenant });
    },
  );

  // PATCH /api/admin/tenants/:id
  app.patch<{ Params: { id: string } }>(
    '/api/admin/tenants/:id',
    { preHandler: [adminAuth] },
    async (request, reply) => {
      const reqId = request.id as string;
      const { id } = request.params;

      const updates = validateBody(updateTenantBody, request.body);
      const tenant = await tenantService.updateTenant(id, updates, reqId);
      return reply.code(200).send({ tenant });
    },
  );

  // GET /api/admin/tenants/:id/analytics
  app.get<{ Params: { id: string } }>(
    '/api/admin/tenants/:id/analytics',
    { preHandler: [adminAuth] },
    async (request, reply) => {
      const reqId = request.id as string;
      const { id } = request.params;
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
}
