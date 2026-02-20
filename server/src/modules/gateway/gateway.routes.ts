import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { GatewayService } from './gateway.service.js';
import type { RateLimiter } from './rate-limiter.js';
import type { SnapshotService } from '../snapshot/snapshot.service.js';
import type { OrchestratorService } from '../orchestrator/orchestrator.service.js';
import type { EscalationService } from '../escalation/escalation.service.js';
import { ValidationError } from '../../shared/errors.js';
import { log } from '../../shared/logger.js';

const createCaseBody = z.object({
  message: z.string().min(1, 'Message is required').max(5000),
});

const addMessageBody = z.object({
  content: z.string().min(1, 'Content is required').max(5000),
});

const feedbackBody = z.object({
  feedback: z.enum(['positive', 'negative']),
});

const escalateBody = z.object({
  reason: z.string().max(2000).optional(),
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

      await rateLimiter.check(`create:${tenantId}:${userId}`, 10, 60_000);

      const parsed = createCaseBody.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError(
          parsed.error.issues[0].message,
          parsed.error.issues[0].path[0] as string,
        );
      }

      const result = await service.createCase(
        tenantId,
        userId,
        parsed.data.message,
        reqId,
      );

      // Trigger snapshot generation if service available
      if (snapshotService) {
        try {
          const snapshot = await snapshotService.buildSnapshot(
            tenantId,
            userId,
            result.case.id,
            reqId,
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

      log.info('POST /api/cases response', reqId, { caseId: result.case.id });

      return reply.code(200).send({
        case: result.case,
        snapshot: { id: result.case.snapshotId },
      });
    },
  );

  // GET /api/cases/:caseId
  app.get(
    '/api/cases/:caseId',
    { preHandler: [app.authenticate] },
    async (
      request: FastifyRequest<{ Params: { caseId: string } }>,
      reply: FastifyReply,
    ) => {
      const reqId = request.id as string;
      const { tenantId } = request.authPayload;
      const { caseId } = request.params;

      const result = await service.getCase(caseId, tenantId, reqId);
      return reply.code(200).send(result);
    },
  );

  // POST /api/cases/:caseId/messages
  app.post(
    '/api/cases/:caseId/messages',
    { preHandler: [app.authenticate] },
    async (
      request: FastifyRequest<{ Params: { caseId: string } }>,
      reply: FastifyReply,
    ) => {
      const reqId = request.id as string;
      const { tenantId, userId } = request.authPayload;
      const { caseId } = request.params;

      await rateLimiter.check(`msg:${tenantId}:${userId}`, 30, 60_000);

      const parsed = addMessageBody.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError(
          parsed.error.issues[0].message,
          parsed.error.issues[0].path[0] as string,
        );
      }

      // If orchestrator available, delegate to it (stores user msg + gets AI response)
      if (orchestratorService) {
        const aiMessage = await orchestratorService.handleMessage(
          caseId,
          tenantId,
          parsed.data.content,
          reqId,
        );
        return reply.code(200).send({ message: aiMessage });
      }

      // Fallback: just store user message
      await service.getCase(caseId, tenantId, reqId);
      const message = await service.addMessage(
        caseId,
        'user',
        parsed.data.content,
        undefined,
        reqId,
      );

      return reply.code(200).send({ message });
    },
  );

  // POST /api/cases/:caseId/feedback
  app.post(
    '/api/cases/:caseId/feedback',
    { preHandler: [app.authenticate] },
    async (
      request: FastifyRequest<{ Params: { caseId: string } }>,
      reply: FastifyReply,
    ) => {
      const reqId = request.id as string;
      const { tenantId } = request.authPayload;
      const { caseId } = request.params;

      const parsed = feedbackBody.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError(
          parsed.error.issues[0].message,
          parsed.error.issues[0].path[0] as string,
        );
      }

      await service.addFeedback(caseId, tenantId, parsed.data.feedback, reqId);
      return reply.code(200).send({ ok: true });
    },
  );

  // POST /api/cases/:caseId/escalate
  app.post(
    '/api/cases/:caseId/escalate',
    { preHandler: [app.authenticate] },
    async (
      request: FastifyRequest<{ Params: { caseId: string } }>,
      reply: FastifyReply,
    ) => {
      const reqId = request.id as string;
      const { tenantId } = request.authPayload;
      const { caseId } = request.params;

      const parsed = escalateBody.safeParse(request.body);
      if (!parsed.success) {
        throw new ValidationError(
          parsed.error.issues[0].message,
          parsed.error.issues[0].path[0] as string,
        );
      }

      // If escalation service available, use it for full ticket creation
      if (escalationService) {
        const result = await escalationService.escalate(
          caseId,
          tenantId,
          parsed.data.reason,
          reqId,
        );
        return reply.code(200).send(result);
      }

      // Fallback: just update case status
      await service.escalateCase(
        caseId,
        tenantId,
        parsed.data.reason,
        reqId,
      );
      return reply.code(200).send({
        ticketId: 'tkt_placeholder',
        ticketUrl: 'https://tickets.example.com/placeholder',
      });
    },
  );
}
