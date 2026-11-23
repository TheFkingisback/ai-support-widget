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
import type { TurnIdempotency } from './turn-idempotency.js';

const createCaseBody = z.object({
  message: z.string().min(1, 'Message is required').max(5000),
  context: z.record(z.string(), z.unknown()).optional(),
  clientTurnId: z.string().uuid().optional(),
});

const addMessageBody = z.object({
  content: z.string().min(1, 'Content is required').max(5000),
  replyToMessageId: z.string().regex(/^[a-zA-Z0-9_-]{1,200}$/).optional(),
  clientTurnId: z.string().uuid().optional(),
});

const feedbackBody = z.object({
  feedback: z.enum(['positive', 'negative']),
});

interface RouteOpts {
  service: GatewayService;
  rateLimiter?: RateLimiter;
  snapshotService?: SnapshotService;
  orchestratorService?: OrchestratorService;
  escalationService?: EscalationService;
  turnIdempotency?: TurnIdempotency;
}

export async function registerGatewayRoutes(
  app: FastifyInstance,
  opts: RouteOpts,
): Promise<void> {
  const { service, rateLimiter, snapshotService, orchestratorService, escalationService, turnIdempotency } = opts;

  // POST /api/cases
  app.post(
    '/api/cases',
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const reqId = request.id as string;
      const { tenantId, userId } = request.authPayload;

      await rateLimiter?.check(`create:${tenantId}:${userId}`, 10, 60_000, reqId);

      const data = validateBody(createCaseBody, request.body);
      async function createTurn() {
      await snapshotService?.prepareContext?.(tenantId, userId, data.context);
      const result = await service.createCase(tenantId, userId, data.message, reqId);

      if (snapshotService) {
        try {
          const snapshot = await snapshotService.buildSnapshot(
            tenantId, userId, result.case.id, reqId, data.context,
          );
          result.case.snapshotId = snapshot.meta.snapshotId;
          log.info('Snapshot generated for case', reqId, {
            caseId: result.case.id,
            snapshotId: snapshot.meta.snapshotId,
          });
        } catch (err) {
          log.warn('Snapshot generation failed', reqId, {
            caseId: result.case.id,
            error: err instanceof Error ? err.message : String(err),
          });
          throw err;
        }
      }

      let aiMessage: unknown = null;
      if (orchestratorService) {
        try {
          const rawJwt = request.headers.authorization?.startsWith('Bearer ')
            ? request.headers.authorization.slice(7) : undefined;
          aiMessage = await orchestratorService.handleMessage(
            result.case.id, tenantId, userId, data.message, reqId, rawJwt,
            { skipUserInsert: true },
          );
        } catch (err) {
          log.warn('Orchestrator failed on case creation', reqId, {
            caseId: result.case.id,
            error: err instanceof Error ? err.message : String(err),
          });
          throw err;
        }
      }

      log.info('POST /api/cases response', reqId, { caseId: result.case.id });
      return {
        case: result.case,
        snapshot: { id: result.case.snapshotId },
        ...(aiMessage ? { aiMessage } : {}),
      };
      }
      const response = data.clientTurnId && turnIdempotency
        ? await turnIdempotency.run({ tenantId, userId, clientId: data.clientTurnId, operation: 'create', input: data }, createTurn)
        : await createTurn();
      return reply.code(200).send(response);
    },
  );

  // GET /api/cases/:caseId
  app.get<{ Params: { caseId: string } }>(
    '/api/cases/:caseId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const reqId = request.id as string;
      const { tenantId, userId } = request.authPayload;
      const { caseId } = request.params;
      const result = await service.getCase(caseId, tenantId, userId, reqId);
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

      await rateLimiter?.check(`msg:${tenantId}:${userId}`, 30, 60_000, reqId);

      const msgData = validateBody(addMessageBody, request.body);

      async function addTurn() {
      if (orchestratorService) {
        const rawJwt = request.headers.authorization?.startsWith('Bearer ')
          ? request.headers.authorization.slice(7) : undefined;
        const aiMessage = await orchestratorService.handleMessage(
          caseId, tenantId, userId, msgData.content, reqId, rawJwt,
          { replyToMessageId: msgData.replyToMessageId },
        );
        return { message: aiMessage };
      }

      await service.getCase(caseId, tenantId, userId, reqId);
      const message = await service.addMessage(
        caseId, tenantId, userId, 'user', msgData.content, undefined, reqId,
      );
      return { message };
      }
      const response = msgData.clientTurnId && turnIdempotency
        ? await turnIdempotency.run({ tenantId, userId, clientId: msgData.clientTurnId, operation: caseId, input: msgData }, addTurn)
        : await addTurn();
      return reply.code(200).send(response);
    },
  );

  // POST /api/cases/:caseId/feedback
  app.post<{ Params: { caseId: string } }>(
    '/api/cases/:caseId/feedback',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const reqId = request.id as string;
      const { tenantId, userId } = request.authPayload;
      const { caseId } = request.params;

      const fbData = validateBody(feedbackBody, request.body);
      await service.addFeedback(caseId, tenantId, userId, fbData.feedback, reqId);
      return reply.code(200).send({ ok: true });
    },
  );

  // Escalate + Actions routes (split for 200-line limit)
  await registerExtraGatewayRoutes(app, { service, orchestratorService, escalationService });
}
