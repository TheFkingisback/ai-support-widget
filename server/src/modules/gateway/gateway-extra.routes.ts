import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { GatewayService } from './gateway.service.js';
import type { OrchestratorService } from '../orchestrator/orchestrator.service.js';
import type { EscalationService } from '../escalation/escalation.service.js';
import { log } from '../../shared/logger.js';
import { validateBody } from '../../shared/validation.js';

const escalateBody = z.object({
  reason: z.string().max(2000).optional(),
});

const actionBody = z.object({
  action: z.object({
    type: z.enum(['retry', 'open_docs', 'create_ticket', 'request_access', 'custom']),
    label: z.string().min(1),
    payload: z.record(z.unknown()).default({}),
  }),
});

export interface ExtraRouteOpts {
  service: GatewayService;
  orchestratorService?: OrchestratorService;
  escalationService?: EscalationService;
}

export async function registerExtraGatewayRoutes(
  app: FastifyInstance,
  opts: ExtraRouteOpts,
): Promise<void> {
  const { service, orchestratorService, escalationService } = opts;

  // POST /api/cases/:caseId/escalate
  app.post<{ Params: { caseId: string } }>(
    '/api/cases/:caseId/escalate',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const reqId = request.id as string;
      const { tenantId } = request.authPayload;
      const { caseId } = request.params;

      const data = validateBody(escalateBody, request.body);

      if (escalationService) {
        const result = await escalationService.escalate(
          caseId, tenantId, data.reason, reqId,
        );
        return reply.code(200).send(result);
      }

      await service.escalateCase(caseId, tenantId, data.reason, reqId);
      return reply.code(200).send({
        ticketId: 'tkt_placeholder',
        ticketUrl: 'https://tickets.example.com/placeholder',
      });
    },
  );

  // POST /api/cases/:caseId/actions
  app.post<{ Params: { caseId: string } }>(
    '/api/cases/:caseId/actions',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const reqId = request.id as string;
      const { tenantId } = request.authPayload;
      const { caseId } = request.params;

      const actionData = validateBody(actionBody, request.body);

      if (orchestratorService) {
        const result = await orchestratorService.handleAction(
          caseId, tenantId, actionData.action, reqId,
        );
        return reply.code(200).send({ result });
      }

      await service.getCase(caseId, tenantId, reqId);
      log.info('Action received (no orchestrator)', reqId, {
        caseId,
        actionType: actionData.action.type,
      });
      return reply.code(200).send({
        result: `Action "${actionData.action.label}" acknowledged.`,
      });
    },
  );
}
