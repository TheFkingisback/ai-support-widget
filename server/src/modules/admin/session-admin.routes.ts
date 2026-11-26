import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { Case, Message, SupportContextSnapshot, LLMCostEntry } from '../../shared/types.js';
import { validateBody } from '../../shared/validation.js';
import { log } from '../../shared/logger.js';

const filters = z.object({
  before: z.string().min(1).max(512).optional(), limit: z.coerce.number().int().min(1).max(200).default(200),
  status: z.enum(['active', 'resolved', 'unresolved', 'escalated']).optional(), search: z.string().max(200).optional(),
});
export type SessionFilters = z.output<typeof filters>;
type Summary = Case & { hasSnapshot: boolean; llmCalls: number; totalCost: number };
export interface PlatformTotals {
  activeSessions: number; resolvedSessions: number; totalCost: number; resolutionRate: number;
  avgMessages: number; avgResponseMs: number;
}
export interface SessionDataSource {
  list(filters: SessionFilters): Promise<{ sessions: Summary[]; next: string | null }>;
  totals(): Promise<PlatformTotals>;
  findCase(id: string): Promise<Case | null>;
  getMessages(caseId: string): Promise<Message[]>;
  getSnapshotByCaseId(caseId: string): Promise<SupportContextSnapshot | null>;
  getCostsByCaseId(caseId: string): Promise<LLMCostEntry[]>;
  countOlderThan(cutoff: string): Promise<number>;
  purgeOlderThan(cutoff: string): Promise<number>;
}

export interface SessionAdminOpts {
  dataSource: SessionDataSource;
  adminAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
}

const period = z.number().int().min(1).max(365);
const dayMs = 86_400_000;

export async function registerSessionAdminRoutes(app: FastifyInstance, { dataSource, adminAuth }: SessionAdminOpts) {
  const auth = { preHandler: [adminAuth] };
  app.get('/api/admin/sessions', auth, req => dataSource.list(validateBody(filters, req.query)));
  app.get('/api/admin/dashboard/totals', auth, () => dataSource.totals());
  app.get<{ Params: { caseId: string } }>('/api/admin/sessions/:caseId', auth, async (req, reply) => {
    const { caseId } = req.params;
    const entry = await dataSource.findCase(caseId);
    if (!entry) return reply.code(404).send({ error: 'Case not found' });
    const [messages, snapshot, costs] = await Promise.all([
      dataSource.getMessages(caseId), dataSource.getSnapshotByCaseId(caseId), dataSource.getCostsByCaseId(caseId),
    ]);
    return { case: entry, messages, snapshot, costs };
  });

  app.post('/api/admin/sessions/purge/preview', auth, async req => {
    const { olderThanDays } = validateBody(z.object({ olderThanDays: period }).strict(), req.body);
    const cutoff = new Date(Date.now() - olderThanDays * dayMs).toISOString();
    return { count: await dataSource.countOlderThan(cutoff), cutoff };
  });
  app.delete('/api/admin/sessions/purge', auth, async req => {
    const { olderThanDays, cutoff: preview } = validateBody(z.object({
      olderThanDays: period, cutoff: z.string().datetime().optional(),
    }).strict(), req.body);
    const cutoff = new Date(Math.min(Date.now() - olderThanDays * dayMs, preview ? Date.parse(preview) : Infinity)).toISOString();
    const purged = await dataSource.purgeOlderThan(cutoff);
    log.warn('Sessions purged', req.id, { purged, cutoff });
    return { purged, cutoff };
  });
}
