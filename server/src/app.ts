import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import crypto from 'node:crypto';
import { registerAuth } from './shared/auth.js';
import { AppError } from './shared/errors.js';
import { log, setLogLevel } from './shared/logger.js';
import { getEnvSafe } from './shared/env.js';
import { registerGatewayRoutes } from './modules/gateway/gateway.routes.js';
import type { GatewayService } from './modules/gateway/gateway.service.js';
import type { RateLimiter } from './modules/gateway/rate-limiter.js';
import type { SnapshotService } from './modules/snapshot/snapshot.service.js';
import type { OrchestratorService } from './modules/orchestrator/orchestrator.service.js';
import type { EscalationService } from './modules/escalation/escalation.service.js';
import { registerAdminRoutes, type AdminRouteOpts } from './modules/admin/admin.routes.js';
import { registerSessionAdminRoutes, type SessionAdminOpts } from './modules/admin/session-admin.routes.js';
import { registerSwagger } from './shared/swagger.js';
import { sql } from 'drizzle-orm';

export interface AppDeps {
  jwtSecret?: string;
  gatewayService?: GatewayService;
  rateLimiter?: RateLimiter;
  snapshotService?: SnapshotService;
  orchestratorService?: OrchestratorService;
  escalationService?: EscalationService;
  adminRouteOpts?: AdminRouteOpts;
  sessionAdminOpts?: SessionAdminOpts;
}

export async function buildApp(opts?: AppDeps): Promise<FastifyInstance> {
  const env = getEnvSafe();
  setLogLevel(env.LOG_LEVEL);

  const app = Fastify({
    logger: false,
    bodyLimit: 1_048_576,
    genReqId: () => `req_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
      },
    },
  });

  const allowedOrigins = env.CORS_ORIGINS
    ? env.CORS_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://localhost:3001'];
  if (!env.CORS_ORIGINS) {
    log.warn('CORS_ORIGINS not set — restricting to localhost. Set CORS_ORIGINS in production.');
  }
  await app.register(cors, { origin: allowedOrigins });

  const jwtSecret = opts?.jwtSecret ?? env.JWT_SECRET;
  const jwtMaxAge = env.JWT_MAX_AGE ?? '8h';
  await registerAuth(app, { secret: jwtSecret, maxAge: jwtMaxAge });

  // Request logging
  app.addHook('onRequest', async (request: FastifyRequest) => {
    log.info(`→ ${request.method} ${request.url}`, request.id as string);
  });

  // Response logging
  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    log.info(`← ${request.method} ${request.url} ${reply.statusCode}`, request.id as string, {
      statusCode: reply.statusCode,
      elapsedMs: Math.round(reply.elapsedTime),
    });
  });

  // Error handler returning ApiError format
  app.setErrorHandler(
    async (error: Error, request: FastifyRequest, reply: FastifyReply) => {
      const reqId = request.id as string;

      if (error instanceof AppError) {
        log.error(error.message, reqId, {
          errorCode: error.errorCode,
          statusCode: error.statusCode,
        });
        return reply.code(error.statusCode).send({
          statusCode: error.statusCode,
          error: error.errorCode,
          message: error.message,
          ...(error.field && { field: error.field }),
          requestId: reqId,
        });
      }

      log.error(`Unhandled error: ${error.message}`, reqId);
      return reply.code(500).send({
        statusCode: 500,
        error: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: reqId,
      });
    },
  );

  // Swagger API docs
  await registerSwagger(app);

  // Health check — verifies DB and Redis connectivity
  app.get('/api/health', async (_req, reply) => {
    const timeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
      Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

    let dbOk = false;
    let redisOk = false;
    try {
      const { getDb } = await import('./shared/db.js');
      const db = getDb();
      await timeout(db.execute(sql`SELECT 1`), 3000);
      dbOk = true;
    } catch { /* db unreachable or timeout */ }
    try {
      const { getRedis } = await import('./shared/redis.js');
      const redis = getRedis();
      await timeout(redis.ping(), 3000);
      redisOk = true;
    } catch { /* redis unreachable or timeout */ }
    const ok = dbOk && redisOk;
    return reply.code(ok ? 200 : 503).send({
      ok, version: '0.1.0', db: dbOk ? 'ok' : 'error', redis: redisOk ? 'ok' : 'error',
    });
  });

  // Gateway routes (if service provided)
  if (opts?.gatewayService && opts.rateLimiter) {
    await registerGatewayRoutes(app, {
      service: opts.gatewayService,
      rateLimiter: opts.rateLimiter,
      snapshotService: opts.snapshotService,
      orchestratorService: opts.orchestratorService,
      escalationService: opts.escalationService,
    });
  }

  // Admin routes (if opts provided)
  if (opts?.adminRouteOpts) {
    await registerAdminRoutes(app, opts.adminRouteOpts);
  }

  // Session admin routes (if opts provided)
  if (opts?.sessionAdminOpts) {
    await registerSessionAdminRoutes(app, opts.sessionAdminOpts);
  }

  return app;
}
