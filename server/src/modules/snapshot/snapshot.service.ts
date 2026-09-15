import crypto from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { snapshots } from './snapshot.schema.js';
import { cases } from '../gateway/gateway.schema.js';
import { buildClickTimeline } from './timeline.js';
import { NotFoundError, ValidationError } from '../../shared/errors.js';
import type { SupportContextSnapshot } from '../../shared/types.js';
import type { TenantService } from '../admin/tenant.service.js';
import { createContextService } from '../context/context.service.js';
import { parsePushContext, type PushContext } from './push-context.js';

export interface SnapshotService {
  prepareContext?(tenantId: string, userId: string, context: unknown): Promise<unknown>;
  buildSnapshot(tenantId: string, userId: string, caseId: string, requestId?: string,
    pushedContext?: Record<string, unknown>): Promise<SupportContextSnapshot>;
  getSnapshot(snapshotId: string, tenantId: string, requestId?: string): Promise<SupportContextSnapshot>;
}
/** Push-only snapshots: validated identity, tenant budgets, sanitization before database writes. */
export function createSnapshotService(db: PostgresJsDatabase, tenantService: TenantService): SnapshotService {
  const processor = createContextService();
  async function prepare(tenantId: string, userId: string, value: unknown) {
    const ctx = parsePushContext(value, tenantId, userId);
    const { config } = await tenantService.getTenant(tenantId);
    return { ctx, config };
  }
  return {
    prepareContext: prepare,
    async buildSnapshot(tenantId, userId, caseId, requestId, pushedContext) {
      const { ctx, config } = await prepare(tenantId, userId, pushedContext);
      const owner = await db.select({ id: cases.id }).from(cases)
        .where(and(eq(cases.id, caseId), eq(cases.tenantId, tenantId), eq(cases.userId, userId))).limit(1);
      if (!owner.length) throw new NotFoundError('Case', caseId);
      const windowHours = Math.min(ctx.userHistory.windowHours, config.maxEventWindowHours);
      const cutoff = Date.now() - windowHours * 3600000;
      const recent = <T>(items: T[], timestamp: (v: T) => string) => items
        .filter(v => Date.parse(timestamp(v)) >= cutoff && Date.parse(timestamp(v)) <= Date.now())
        .sort((a, b) => timestamp(b).localeCompare(timestamp(a)));
      const events = recent(ctx.userHistory.events, e => e.ts);
      const logBudget = config.maxLogLines;
      const requests = recent(ctx.userLogs.recentRequests, e => e.ts).slice(0, logBudget);
      const errors = recent(ctx.userLogs.errors, e => e.ts).slice(0, Math.max(0, logBudget - requests.length));
      const jobs = recent(ctx.userLogs.jobs, e => e.updatedAt).slice(0, Math.max(0, logBudget - requests.length - errors.length));
      const docs = (ctx.knowledgePack?.docs ?? []).slice(0, config.maxDocs);
      const maxBytes = Math.min(config.maxContextBytes, 262144);
      const snapshot: SupportContextSnapshot = {
        meta: { snapshotId: `scs_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
          createdAt: new Date().toISOString(), maxBytes,
          truncation: { eventsRemoved: ctx.userHistory.events.length - events.length,
            logsTrimmed: requests.length + errors.length + jobs.length < ctx.userLogs.recentRequests.length + ctx.userLogs.errors.length + ctx.userLogs.jobs.length,
            docsRemoved: (ctx.knowledgePack?.docs.length ?? 0) - docs.length } },
        identity: { tenantId, userId, roles: ctx.userState.roles, plan: ctx.userState.plan,
          featuresEnabled: ctx.userState.featuresEnabled, profile: ctx.userState.profile },
        productState: { entities: ctx.userState.entities, activeErrors: ctx.userState.activeErrors, limitsReached: ctx.userState.limitsReached },
        recentActivity: { windowHours, events, clickTimeline: buildClickTimeline(events, requestId) },
        backend: { recentRequests: requests, errors, jobs },
        knowledgePack: { docs, runbooks: rules(ctx), changelog: [] },
        privacy: { redactionVersion: '2.0', fieldsRemoved: [] },
      };
      const { processed } = processor.processContext(snapshot, maxBytes, requestId);
      processed.identity.tenantId = tenantId; processed.identity.userId = userId;
      processed.meta.snapshotId = snapshot.meta.snapshotId; processed.meta.createdAt = snapshot.meta.createdAt;
      const bytesTotal = Buffer.byteLength(JSON.stringify(processed), 'utf8');
      if (bytesTotal > maxBytes) throw new ValidationError('Essential context exceeds tenant budget', 'context');
      await db.transaction(async tx => {
        await tx.insert(snapshots).values({ id: processed.meta.snapshotId, tenantId, userId, caseId,
          data: processed, bytesTotal, truncation: processed.meta.truncation, createdAt: new Date() });
        await tx.update(cases).set({ snapshotId: processed.meta.snapshotId })
          .where(and(eq(cases.id, caseId), eq(cases.tenantId, tenantId), eq(cases.userId, userId)));
      });
      return processed;
    },
    async getSnapshot(snapshotId, tenantId) {
      const rows = await db.select().from(snapshots)
        .where(and(eq(snapshots.id, snapshotId), eq(snapshots.tenantId, tenantId))).limit(1);
      if (!rows.length) throw new NotFoundError('Snapshot', snapshotId);
      return rows[0].data as SupportContextSnapshot;
    },
  };
}
function rules(ctx: PushContext) {
  return ctx.businessRules ? [{ id: 'rules', title: 'Business Rules',
    content: JSON.stringify(ctx.businessRules), category: 'rules' }] : [];
}
