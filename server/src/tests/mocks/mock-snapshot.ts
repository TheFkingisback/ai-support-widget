import type { SupportContextSnapshot, Case } from '../../shared/types.js';
import type { SnapshotService } from '../../modules/snapshot/snapshot.service.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors.js';
import {
  mockUserState,
  mockUserHistory,
  mockUserLogs,
} from './client-apis.js';
import { buildClickTimeline } from '../../modules/snapshot/timeline.js';
import { genId } from './test-utils.js';

function extractPushedDocs(ctx?: Record<string, unknown>): Array<{ id: string; title: string; content: string; category: string }> {
  if (!ctx?.knowledgePack) return [];
  const kp = ctx.knowledgePack as Record<string, unknown>;
  const docs = kp.docs as Array<{ id?: string; title?: string; content?: string; category?: string }> | undefined;
  if (!Array.isArray(docs)) return [];
  return docs.map((d) => ({
    id: d.id ?? 'unknown', title: d.title ?? 'Unknown',
    content: d.content ?? '', category: d.category ?? 'general',
  }));
}

interface StoredSnapshot {
  id: string;
  tenantId: string;
  caseId: string;
  data: SupportContextSnapshot;
}

/**
 * @param cases Optional reference to the gateway's case array.
 * When provided, buildSnapshot updates the case's snapshotId to match.
 */
export function createMockSnapshotService(
  cases?: Case[],
): SnapshotService & { _snapshots: StoredSnapshot[] } {
  const _snapshots: StoredSnapshot[] = [];

  return {
    _snapshots,

    async buildSnapshot(tenantId, userId, caseId, requestId, pushedContext) {
      const snapshotId = genId('scs');
      const ctx = pushedContext as Record<string, unknown> | undefined;
      const state = (ctx?.userState ?? mockUserState(userId, tenantId)) as ReturnType<typeof mockUserState>;
      const history = (ctx?.userHistory ?? mockUserHistory()) as ReturnType<typeof mockUserHistory>;
      const logs = (ctx?.userLogs ?? mockUserLogs()) as ReturnType<typeof mockUserLogs>;
      const clickTimeline = buildClickTimeline(history.events, requestId);

      const snapshot: SupportContextSnapshot = {
        meta: {
          snapshotId,
          createdAt: new Date().toISOString(),
          maxBytes: 5_000_000,
          truncation: { eventsRemoved: 0, logsTrimmed: false, docsRemoved: 0 },
        },
        identity: {
          tenantId, userId,
          roles: state.roles ?? [],
          plan: state.plan ?? 'unknown',
          featuresEnabled: state.featuresEnabled ?? [],
        },
        productState: {
          entities: state.entities ?? [],
          activeErrors: state.activeErrors ?? [],
          limitsReached: state.limitsReached ?? [],
        },
        recentActivity: {
          windowHours: history.windowHours ?? 72,
          events: history.events ?? [],
          clickTimeline,
        },
        backend: {
          recentRequests: logs.recentRequests ?? [],
          jobs: logs.jobs ?? [],
          errors: logs.errors ?? [],
        },
        knowledgePack: {
          docs: extractPushedDocs(ctx),
          runbooks: ctx?.businessRules ? [{ id: 'rules', title: 'Business Rules', content: JSON.stringify(ctx.businessRules), category: 'rules' }] : [],
          changelog: [],
        },
        privacy: { redactionVersion: '1.0', fieldsRemoved: [] },
      };

      _snapshots.push({ id: snapshotId, tenantId, caseId, data: snapshot });

      // Link snapshot to the case so orchestrator can find it
      if (cases) {
        const c = cases.find((c) => c.id === caseId);
        if (c) c.snapshotId = snapshotId;
      }

      return snapshot;
    },

    async getSnapshot(snapshotId, tenantId) {
      const row = _snapshots.find((s) => s.id === snapshotId);
      if (!row) throw new NotFoundError('Snapshot', snapshotId);
      if (row.tenantId !== tenantId) {
        throw new ForbiddenError(`Tenant ${tenantId} cannot access snapshot ${snapshotId}`);
      }
      return row.data;
    },
  };
}
