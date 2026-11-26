import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { SessionStore } from './session.store.js';
import type { TenantService } from '../admin/tenant.service.js';
import type { RateLimiter } from '../gateway/rate-limiter.js';
import { ForbiddenError, UnauthorizedError } from '../../shared/errors.js';
import { validateBody } from '../../shared/validation.js';
import { TOKEN_ISSUER, WIDGET_AUDIENCE, WIDGET_SESSION_SECONDS } from '../../shared/token-policy.js';
import type { IntegrationCredential } from './session.store.js';

import { sessionServers, type sessionMcpStore } from './session-mcp.js';

const sessionBody = z.object({
  mcpServers: sessionServers.optional(),
  userId: z.string().trim().min(1).max(200),
  userEmail: z.string().email().max(254).or(z.literal('')).default(''),
  userRoles: z.array(z.string().min(1).max(80)).max(30).default([]),
  plan: z.string().min(1).max(80).default('standard'),
}).strict();
export interface SessionRouteOpts {
  mcp?: ReturnType<typeof sessionMcpStore>;
  store: SessionStore;
  tenantService: TenantService;
  widgetSecret: string;
  rateLimiter?: RateLimiter;
  adminAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
}
const hash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
export async function createIntegrationCredential(store: SessionStore, tenantId: string) {
  const id = `sik_${crypto.randomUUID().replace(/-/g, '')}`;
  const credential = `${id}.${crypto.randomBytes(32).toString('base64url')}`;
  await store.replace({ tenantId, id, tokenHash: hash(credential), createdAt: new Date() });
  return { credential, tenantId };
}

export function issueWidgetSession(record: IntegrationCredential, data: z.output<typeof sessionBody>, secret: string, sid = crypto.randomUUID()) {
  const { userId, userEmail, userRoles, plan } = data;
  const session = jwt.sign({ userId, userEmail, userRoles, plan, sid, tenantId: record.tenantId, purpose: 'widget', integrationId: record.id }, secret, {
    algorithm: 'HS256', issuer: TOKEN_ISSUER, audience: WIDGET_AUDIENCE,
    subject: data.userId, expiresIn: WIDGET_SESSION_SECONDS,
  });
  return { jwt: session, tenantKey: record.tenantId, expiresIn: WIDGET_SESSION_SECONDS };
}
function assertAccess(request: FastifyRequest, tenantId: string) {
  const actor = request.adminPayload;
  if (actor?.role !== 'super_admin' && !(actor?.role === 'tenant_admin' && actor.tenantId === tenantId)) {
    throw new ForbiddenError('Access denied');
  }
}
export async function registerSessionRoutes(app: FastifyInstance, opts: SessionRouteOpts) {
  const { store, tenantService, widgetSecret, rateLimiter, adminAuth } = opts;
  // Zod validates the original request after authentication. Fastify publishes the wire schema below.
  app.post('/api/widget/sessions', { validatorCompiler: () => () => true, schema: {
    description: 'Issue a 15-minute widget session from the application backend. Delegated access tokens stay server-side.',
    security: [{ integrationCredential: [] }],
    body: { type: 'object', required: ['userId'], properties: {
      userId: { type: 'string', maxLength: 200 }, userEmail: { type: 'string' },
      userRoles: { type: 'array', items: { type: 'string' } }, plan: { type: 'string' },
      mcpServers: { type: 'array', maxItems: 8, items: { type: 'object', required: ['id', 'url', 'accessToken'],
        properties: { id: { type: 'string', pattern: '^[a-z][a-z0-9_-]{0,31}$' }, url: { type: 'string', format: 'uri' },
          accessToken: { type: 'string', writeOnly: true, maxLength: 8192 } } } },
    } },
  } }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    await rateLimiter?.check(`session-ip:${request.ip}`, 120, 60_000, request.id);
    const token = request.headers.authorization?.match(/^Bearer (sik_[a-f0-9]{32}\.[A-Za-z0-9_-]{43})$/)?.[1];
    if (!token) throw new UnauthorizedError('Invalid integration credential');
    const record = await store.findById(token.split('.')[0]);
    if (!record || !crypto.timingSafeEqual(Buffer.from(hash(token)), Buffer.from(record.tokenHash))) {
      throw new UnauthorizedError('Invalid integration credential');
    }
    await rateLimiter?.check(`session-tenant:${record.tenantId}`, 300, 60_000, request.id);
    const data = validateBody(sessionBody, request.body);
    await tenantService.getTenant(record.tenantId, request.id);
    const sid = crypto.randomUUID();
    if (data.mcpServers?.length) {
      if (!opts.mcp) throw new Error('Session MCP store unavailable');
      await opts.mcp.save({ sid, tenantId: record.tenantId, userId: data.userId }, data.mcpServers);
    }
    return issueWidgetSession(record, data, widgetSecret, sid);
  });
  const route = '/api/admin/tenants/:id/integration-credential';
  app.get<{ Params: { id: string } }>(route, { preHandler: [adminAuth] }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    assertAccess(request, request.params.id);
    await tenantService.getTenant(request.params.id, request.id);
    const record = await store.findByTenant(request.params.id);
    return { configured: !!record, createdAt: record?.createdAt.toISOString() ?? null };
  });
  app.post<{ Params: { id: string } }>(route, { preHandler: [adminAuth] }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    const tenantId = request.params.id;
    assertAccess(request, tenantId);
    await tenantService.getTenant(tenantId, request.id);
    return createIntegrationCredential(store, tenantId);
  });
  app.delete<{ Params: { id: string } }>(route, { preHandler: [adminAuth] }, async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    assertAccess(request, request.params.id);
    await store.revoke(request.params.id);
    return { ok: true };
  });
}
