import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import crypto from 'node:crypto';
import { registerAuth } from './shared/auth.js';
import { AppError } from './shared/errors.js';
import { log, setLogLevel } from './shared/logger.js';
import { getEnvSafe, type LogLevel } from './shared/env.js';
import { registerGatewayRoutes } from './modules/gateway/gateway.routes.js';
import type { GatewayService } from './modules/gateway/gateway.service.js';
import type { RateLimiter } from './modules/gateway/rate-limiter.js';
import type { SnapshotService } from './modules/snapshot/snapshot.service.js';
import type { OrchestratorService } from './modules/orchestrator/orchestrator.service.js';
import type { EscalationService } from './modules/escalation/escalation.service.js';

export interface AppDeps {
  jwtSecret?: string;
  gatewayService?: GatewayService;
  rateLimiter?: RateLimiter;
  snapshotService?: SnapshotService;
  orchestratorService?: OrchestratorService;
  escalationService?: EscalationService;
}

export async function buildApp(opts?: AppDeps): Promise<FastifyInstance> {
  const env = getEnvSafe();
  setLogLevel(env.LOG_LEVEL as LogLevel);

  const app = Fastify({
    logger: false,
    genReqId: () => `req_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`,
  });

  await app.register(cors, { origin: true });

  const jwtSecret = opts?.jwtSecret ?? env.JWT_SECRET;
  await registerAuth(app, jwtSecret);

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

      log.error(`Unhandled error: ${error.message}`, reqId, {
        stack: error.stack,
      });
      return reply.code(500).send({
        statusCode: 500,
        error: 'INTERNAL_ERROR',
        message: 'Internal server error',
        requestId: reqId,
      });
    },
  );

  // Health check
  app.get('/api/health', async () => {
    return { ok: true, version: '0.1.0' };
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

  return app;
}
