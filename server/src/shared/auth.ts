import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { TOKEN_ISSUER, WIDGET_AUDIENCE } from './token-policy.js';
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
  verifySession?: (tenantId: string, integrationId: string) => Promise<boolean>;
}

const identity = z.object({
  tenantId: z.string().min(1).max(200), userId: z.string().min(1).max(200),
  userEmail: z.string().max(254).default(''),
  userRoles: z.array(z.string().max(80)).max(30).default([]),
  plan: z.string().max(80).default('standard'),
  iat: z.number().int(), exp: z.number().int(),
});

export async function registerAuth(app: FastifyInstance, opts: AuthOptions): Promise<void> {
  await app.register(fastifyJwt, {
    secret: opts.secret,
    sign: { iss: TOKEN_ISSUER, aud: WIDGET_AUDIENCE, expiresIn: '15m' },
    verify: { maxAge: opts.maxAge ?? '8h', algorithms: ['HS256'] },
  });

  app.decorate('authenticate', async function (request: FastifyRequest, _reply: FastifyReply) {
    try {
      const token = request.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
      if (!token) throw new Error('Missing token');
      const decoded = jwt.verify(token, opts.secret, {
        algorithms: ['HS256'], issuer: TOKEN_ISSUER, audience: WIDGET_AUDIENCE,
        maxAge: opts.maxAge ?? '15m',
      }) as jwt.JwtPayload;
      if (typeof decoded !== 'object' || decoded.role !== undefined || decoded.purpose !== 'widget') {
        throw new Error('Invalid purpose');
      }
      const claims = identity.parse(decoded);
      if (claims.iat > Math.floor(Date.now() / 1000) || claims.exp <= claims.iat) throw new Error('Invalid lifetime');
      if (opts.verifySession &&
          (decoded.sub !== claims.userId || typeof decoded.integrationId !== 'string' ||
          !await opts.verifySession(claims.tenantId, decoded.integrationId))) throw new Error('Revoked session');
      request.authPayload = claims;
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
      throw new UnauthorizedError('Invalid or expired support session');
    }
  });
}
