import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Case, Message, SupportContextSnapshot, LLMCostEntry } from '../../shared/types.js';
import { log } from '../../shared/logger.js';

/** Abstracts how session data is fetched — works with both mock and real stores. */
export interface SessionDataSource {
  getAllCases(): Case[];
  getMessages(caseId: string): Message[];
  getSnapshotByCaseId(caseId: string): SupportContextSnapshot | null;
  getCostsByCaseId(caseId: string): LLMCostEntry[];
}

export interface SessionAdminOpts {
  dataSource: SessionDataSource;
  adminAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
}

export async function registerSessionAdminRoutes(
  app: FastifyInstance,
  opts: SessionAdminOpts,
): Promise<void> {
  const { dataSource, adminAuth } = opts;

  // GET /api/admin/sessions — list all sessions with summary
  app.get(
    '/api/admin/sessions',
    { preHandler: [adminAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const reqId = request.id as string;
      log.info('GET /api/admin/sessions', reqId);

      const cases = dataSource.getAllCases();
      const sessions = cases.map((c) => {
        const messages = dataSource.getMessages(c.id);
        const snapshot = dataSource.getSnapshotByCaseId(c.id);
        const costs = dataSource.getCostsByCaseId(c.id);
        return {
          ...c,
          messageCount: messages.length,
          hasSnapshot: !!snapshot,
          llmCalls: costs.length,
          totalCost: costs.reduce((s, e) => s + e.estimatedCost, 0),
        };
      });

      return reply.code(200).send({ sessions });
    },
  );

  // GET /api/admin/sessions/:caseId — full session detail
  app.get<{ Params: { caseId: string } }>(
    '/api/admin/sessions/:caseId',
    { preHandler: [adminAuth] },
    async (request, reply) => {
      const reqId = request.id as string;
      const { caseId } = request.params;
      log.info('GET /api/admin/sessions/:caseId', reqId, { caseId });

      const cases = dataSource.getAllCases();
      const caseData = cases.find((c) => c.id === caseId);
      if (!caseData) {
        return reply.code(404).send({ error: 'Case not found' });
      }

      const messages = dataSource.getMessages(caseId);
      const snapshot = dataSource.getSnapshotByCaseId(caseId);
      const costs = dataSource.getCostsByCaseId(caseId);

      return reply.code(200).send({
        case: caseData,
        messages,
        snapshot,
        costs,
      });
    },
  );
}
