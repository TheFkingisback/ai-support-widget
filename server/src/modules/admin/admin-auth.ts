import type { FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError } from '../../shared/errors.js';
import { log } from '../../shared/logger.js';

export function createAdminAuth(apiKey: string) {
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

    const provided = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    if (provided !== apiKey) {
      log.warn('Admin auth: invalid API key', reqId);
      throw new ForbiddenError('Invalid admin API key');
    }

    log.debug('Admin auth verified', reqId);
  };
}
