import type { FastifyRequest } from 'fastify';
import type { AdminAuthPayload } from './admin-auth.js';
import { ForbiddenError } from '../../shared/errors.js';
/** Tenant keys manage their own integration; platform administration is never delegated. */
export function assertSelfServiceScope(actor: AdminAuthPayload, req: FastifyRequest): void {
  if (actor.role === 'super_admin') return;
  const route = req.routeOptions?.url;
  if (req.method === 'GET' && route === '/api/admin/tenants') return;
  const own = Boolean(actor.tenantId) && (req.params as { id?: string } | undefined)?.id === actor.tenantId;
  if (own && ['/api/admin/tenants/:id/mcp', '/api/admin/tenants/:id/integration-credential',
    '/api/admin/tenants/:id/reset-key'].includes(route ?? '')) return;
  if (own && req.method === 'GET' && ['/api/admin/tenants/:id/analytics',
    '/api/admin/tenants/:id/cases', '/api/admin/tenants/:id/audit', '/api/admin/tenants/:id/costs'].includes(route ?? '')) return;
  throw new ForbiddenError('Tenant administrator cannot access this platform operation');
}
