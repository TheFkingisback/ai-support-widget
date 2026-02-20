import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { UnauthorizedError } from './errors.js';
import { log } from './logger.js';
import type { WidgetAuthPayload } from './types.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    authPayload: WidgetAuthPayload;
    requestId: string;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: WidgetAuthPayload;
  }
}

export async function registerAuth(app: FastifyInstance, secret: string): Promise<void> {
  await app.register(fastifyJwt, { secret });

  app.decorate('authenticate', async function (request: FastifyRequest, _reply: FastifyReply) {
    try {
      const decoded = await request.jwtVerify<WidgetAuthPayload>();
      request.authPayload = decoded;
      log.debug('Auth verified', (request as unknown as { requestId?: string }).requestId, {
        tenantId: decoded.tenantId,
        userId: decoded.userId,
      });
    } catch (err) {
      log.warn(
        'Auth failed',
        (request as unknown as { requestId?: string }).requestId,
        { error: err instanceof Error ? err.message : String(err) },
      );
      throw new UnauthorizedError(
        err instanceof Error ? err.message : 'Invalid or expired token',
      );
    }
  });
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const decoded = await request.jwtVerify<WidgetAuthPayload>();
    request.authPayload = decoded;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid or expired token';
    const error = new UnauthorizedError(message);
    reply.code(error.statusCode).send({
      statusCode: error.statusCode,
      error: error.errorCode,
      message: error.message,
    });
  }
}
