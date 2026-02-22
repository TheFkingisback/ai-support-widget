import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Case, Message, SupportContextSnapshot, LLMCostEntry } from '../../shared/types.js';
import { log } from '../../shared/logger.js';

/** Abstracts how session data is fetched — works with both mock and real stores. */
export interface SessionDataSource {
  getAllCases(): Promise<Case[]>;
  getMessages(caseId: string): Promise<Message[]>;
  getSnapshotByCaseId(caseId: string): Promise<SupportContextSnapshot | null>;
  getCostsByCaseId(caseId: string): Promise<LLMCostEntry[]>;
  purgeOlderThan?(olderThan: string): Promise<number>;
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

      const allCases = await dataSource.getAllCases();
      const sessions = await Promise.all(allCases.map(async (c) => {
        const msgs = await dataSource.getMessages(c.id);
        const snapshot = await dataSource.getSnapshotByCaseId(c.id);
        const costs = await dataSource.getCostsByCaseId(c.id);
        return {
          ...c,
          messageCount: msgs.length,
          hasSnapshot: !!snapshot,
          llmCalls: costs.length,
          totalCost: costs.reduce((s, e) => s + e.estimatedCost, 0),
        };
      }));

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

      const allCases = await dataSource.getAllCases();
      const caseData = allCases.find((c) => c.id === caseId);
      if (!caseData) {
        return reply.code(404).send({ error: 'Case not found' });
      }

      const msgs = await dataSource.getMessages(caseId);
      const snapshot = await dataSource.getSnapshotByCaseId(caseId);
      const costs = await dataSource.getCostsByCaseId(caseId);

      return reply.code(200).send({
        case: caseData,
        messages: msgs,
        snapshot,
        costs,
      });
    },
  );

  // DELETE /api/admin/sessions/purge — purge old sessions
  app.delete<{ Body: { olderThanDays: number } }>(
    '/api/admin/sessions/purge',
    { preHandler: [adminAuth] },
    async (request, reply) => {
      const reqId = request.id as string;
      const { olderThanDays } = request.body ?? { olderThanDays: 90 };

      if (!dataSource.purgeOlderThan) {
        return reply.code(501).send({ error: 'Purge not supported' });
      }

      const cutoff = new Date(Date.now() - olderThanDays * 24 * 3600_000).toISOString();
      log.warn('Purging sessions', reqId, { olderThanDays, cutoff });

      const purged = await dataSource.purgeOlderThan(cutoff);
      log.warn('Sessions purged', reqId, { purged });

      return reply.code(200).send({ purged, cutoff });
    },
  );
}
