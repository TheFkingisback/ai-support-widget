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

export interface AuthOptions {
  secret: string;
  maxAge?: string;
}

export async function registerAuth(app: FastifyInstance, opts: AuthOptions): Promise<void> {
  await app.register(fastifyJwt, {
    secret: opts.secret,
    verify: { maxAge: opts.maxAge ?? '8h', algorithms: ['HS256'] },
  });

  app.decorate('authenticate', async function (request: FastifyRequest, _reply: FastifyReply) {
    try {
      const decoded = await request.jwtVerify<WidgetAuthPayload>();
      request.authPayload = decoded;
      log.debug('Auth verified', request.requestId, {
        tenantId: decoded.tenantId,
        userId: decoded.userId,
      });
    } catch (err) {
      log.warn(
        'Auth failed',
        request.requestId,
        { error: err instanceof Error ? err.message : String(err) },
      );
      throw new UnauthorizedError(
        err instanceof Error ? err.message : 'Invalid or expired token',
      );
    }
  });
}
