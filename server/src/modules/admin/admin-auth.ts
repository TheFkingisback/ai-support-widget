import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError } from '../../shared/errors.js';
import { log } from '../../shared/logger.js';
import type { TenantService } from './tenant.service.js';

export interface AdminAuthPayload {
  role: 'super_admin' | 'tenant_admin';
  tenantId?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    adminPayload?: AdminAuthPayload;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export interface AdminAuthOpts {
  superAdminKey: string;
  jwtSecret: string;
  tenantService?: TenantService;
}

/**
 * Creates dual-mode admin auth: accepts JWT (per-tenant) or raw key (super-admin).
 * Backward-compatible: passing a plain string creates legacy super-admin-only auth.
 */
export function createAdminAuth(optsOrKey: string | AdminAuthOpts) {
  const opts: AdminAuthOpts = typeof optsOrKey === 'string'
    ? { superAdminKey: optsOrKey, jwtSecret: '', tenantService: undefined }
    : optsOrKey;

  return async function adminAuth(
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    const reqId = request.id as string;
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      log.warn('Admin auth: no authorization header', reqId);
      throw new ForbiddenError('Admin API key required');
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    // Try JWT decode first (per-tenant login flow)
    if (opts.jwtSecret) {
      try {
        const decoded = jwt.verify(token, opts.jwtSecret) as AdminAuthPayload;
        if (decoded.role === 'super_admin' || decoded.role === 'tenant_admin') {
          request.adminPayload = decoded;
          log.debug('Admin auth via JWT', reqId, { role: decoded.role, tenantId: decoded.tenantId });
          return;
        }
      } catch {
        // Not a valid JWT — fall through to raw key check
      }
    }

    // Fall back to raw super-admin key
    if (!timingSafeEqual(token, opts.superAdminKey)) {
      log.warn('Admin auth: invalid credentials', reqId);
      throw new ForbiddenError('Invalid admin credentials');
    }

    request.adminPayload = { role: 'super_admin' };
    log.debug('Admin auth via super-admin key', reqId);
  };
}

/**
 * Creates login handler: POST /api/admin/login
 * Body: { apiKey }. Auto-detects: super-admin key → super, tsk_ key → tenant admin.
 */
export function createLoginHandler(opts: AdminAuthOpts) {
  return async function loginHandler(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const reqId = request.id as string;
    const body = request.body as { apiKey?: string } | undefined;
    const apiKey = body?.apiKey;

    if (!apiKey) {
      throw new ForbiddenError('apiKey is required');
    }

    // Try super-admin key first
    if (timingSafeEqual(apiKey, opts.superAdminKey)) {
      const payload: AdminAuthPayload = { role: 'super_admin' };
      const jwtToken = jwt.sign(payload, opts.jwtSecret, { expiresIn: '8h' });
      log.info('Super admin login success', reqId);
      reply.code(200).send({ token: jwtToken, role: 'super_admin' });
      return;
    }

    // Try tenant admin key (lookup by hash)
    if (opts.tenantService) {
      const keyHash = hashApiKey(apiKey);
      const tenant = await opts.tenantService.findTenantByAdminKeyHash(keyHash, reqId);
      if (tenant) {
        const payload: AdminAuthPayload = { role: 'tenant_admin', tenantId: tenant.id };
        const jwtToken = jwt.sign(payload, opts.jwtSecret, { expiresIn: '8h' });
        log.info('Tenant admin login success', reqId, { tenantId: tenant.id });
        reply.code(200).send({ token: jwtToken, role: 'tenant_admin', tenantId: tenant.id });
        return;
      }
    }

    log.warn('Admin login failed: no matching key', reqId);
    throw new ForbiddenError('Invalid credentials');
  };
}
