import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { verifyAdminPassword } from './admin-password.js';
import { createInMemoryRateLimiter } from '../gateway/rate-limiter.js';
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
  adminEmail?: string;
  adminPasswordHash?: string;
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
        const decoded = jwt.verify(token, opts.jwtSecret, { algorithms: ['HS256'] }) as AdminAuthPayload;
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
    if (!opts.superAdminKey || !timingSafeEqual(token, opts.superAdminKey)) {
      log.warn('Admin auth: invalid credentials', reqId);
      throw new ForbiddenError('Invalid admin credentials');
    }

    request.adminPayload = { role: 'super_admin' };
    log.debug('Admin auth via super-admin key', reqId);
  };
}

const loginBody = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(1024),
}).strict();

/** Email/password login for the platform administrator. API keys remain API-only. */
export function createLoginHandler(opts: AdminAuthOpts) {
  const limiter = createInMemoryRateLimiter();
  return async function loginHandler(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const reqId = request.id as string;
    // This single administrator account shares a limit across all source IPs.
    await limiter.check('admin-login', 10, 60_000, reqId);
    const parsed = loginBody.safeParse(request.body);
    if (!parsed.success || !opts.adminEmail || !opts.adminPasswordHash) {
      throw new ForbiddenError('Invalid email or password');
    }

    const { email, password } = parsed.data;
    // Verify even for unknown email addresses to avoid an account timing oracle.
    const passwordMatches = await verifyAdminPassword(password, opts.adminPasswordHash);
    const emailMatches = timingSafeEqual(email, opts.adminEmail.trim().toLowerCase());
    if (!passwordMatches || !emailMatches) {
      log.warn('Admin login failed', reqId);
      throw new ForbiddenError('Invalid email or password');
    }

    const payload: AdminAuthPayload = { role: 'super_admin' };
    const token = jwt.sign(payload, opts.jwtSecret, { expiresIn: '8h', algorithm: 'HS256' });
    log.info('Super admin login success', reqId);
    reply.header('Cache-Control', 'no-store').code(200).send({ token, role: 'super_admin' });
  };
}
