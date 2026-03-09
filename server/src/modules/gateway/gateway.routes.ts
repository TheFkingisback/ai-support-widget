import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { GatewayService } from './gateway.service.js';
import type { RateLimiter } from './rate-limiter.js';
import type { SnapshotService } from '../snapshot/snapshot.service.js';
import type { OrchestratorService } from '../orchestrator/orchestrator.service.js';
import type { EscalationService } from '../escalation/escalation.service.js';
import { log } from '../../shared/logger.js';
import { validateBody } from '../../shared/validation.js';
import { registerExtraGatewayRoutes } from './gateway-extra.routes.js';

const createCaseBody = z.object({
  message: z.string().min(1, 'Message is required').max(5000),
  context: z.record(z.unknown()).optional(),
});

const addMessageBody = z.object({
  content: z.string().min(1, 'Content is required').max(5000),
});

const feedbackBody = z.object({
  feedback: z.enum(['positive', 'negative']),
});

interface RouteOpts {
  service: GatewayService;
  rateLimiter: RateLimiter;
  snapshotService?: SnapshotService;
  orchestratorService?: OrchestratorService;
  escalationService?: EscalationService;
}

export async function registerGatewayRoutes(
  app: FastifyInstance,
  opts: RouteOpts,
): Promise<void> {
  const { service, rateLimiter, snapshotService, orchestratorService, escalationService } = opts;

  // POST /api/cases
  app.post(
    '/api/cases',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const reqId = request.id as string;
      const { tenantId, userId } = request.authPayload;

      await rateLimiter.check(`create:${tenantId}:${userId}`, 10, 60_000, reqId);

      const data = validateBody(createCaseBody, request.body);
      const result = await service.createCase(tenantId, userId, data.message, reqId);

      if (snapshotService) {
        try {
          const snapshot = await snapshotService.buildSnapshot(
            tenantId, userId, result.case.id, reqId, data.context,
          );
          log.info('Snapshot generated for case', reqId, {
            caseId: result.case.id,
            snapshotId: snapshot.meta.snapshotId,
          });
        } catch (err) {
          log.warn('Snapshot generation failed, continuing without', reqId, {
            caseId: result.case.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      let aiMessage: unknown = null;
      if (orchestratorService) {
        try {
          const rawJwt = request.headers.authorization?.startsWith('Bearer ')
            ? request.headers.authorization.slice(7) : undefined;
          aiMessage = await orchestratorService.handleMessage(
            result.case.id, tenantId, data.message, reqId, rawJwt,
            { skipUserInsert: true },
          );
        } catch (err) {
          log.warn('Orchestrator failed on case creation', reqId, {
            caseId: result.case.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      log.info('POST /api/cases response', reqId, { caseId: result.case.id });
      return reply.code(200).send({
        case: result.case,
        snapshot: { id: result.case.snapshotId },
        ...(aiMessage ? { aiMessage } : {}),
      });
    },
  );

  // GET /api/cases/:caseId
  app.get<{ Params: { caseId: string } }>(
    '/api/cases/:caseId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const reqId = request.id as string;
      const { tenantId } = request.authPayload;
      const { caseId } = request.params;
      const result = await service.getCase(caseId, tenantId, reqId);
      return reply.code(200).send(result);
    },
  );

  // POST /api/cases/:caseId/messages
  app.post<{ Params: { caseId: string } }>(
    '/api/cases/:caseId/messages',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const reqId = request.id as string;
      const { tenantId, userId } = request.authPayload;
      const { caseId } = request.params;

      await rateLimiter.check(`msg:${tenantId}:${userId}`, 30, 60_000, reqId);

      const msgData = validateBody(addMessageBody, request.body);

      if (orchestratorService) {
        const rawJwt = request.headers.authorization?.startsWith('Bearer ')
          ? request.headers.authorization.slice(7) : undefined;
        const aiMessage = await orchestratorService.handleMessage(
          caseId, tenantId, msgData.content, reqId, rawJwt,
        );
        return reply.code(200).send({ message: aiMessage });
      }

      await service.getCase(caseId, tenantId, reqId);
      const message = await service.addMessage(
        caseId, tenantId, 'user', msgData.content, undefined, reqId,
      );
      return reply.code(200).send({ message });
    },
  );

  // POST /api/cases/:caseId/feedback
  app.post<{ Params: { caseId: string } }>(
    '/api/cases/:caseId/feedback',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const reqId = request.id as string;
      const { tenantId } = request.authPayload;
      const { caseId } = request.params;

      const fbData = validateBody(feedbackBody, request.body);
      await service.addFeedback(caseId, tenantId, fbData.feedback, reqId);
      return reply.code(200).send({ ok: true });
    },
  );

  // Escalate + Actions routes (split for 200-line limit)
  await registerExtraGatewayRoutes(app, { service, orchestratorService, escalationService });
}
