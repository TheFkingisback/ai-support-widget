import crypto from 'node:crypto';
import type { SupportContextSnapshot, Case } from '../../../../shared/types.js';
import type { SnapshotService } from '../../modules/snapshot/snapshot.service.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors.js';
import {
  mockUserState,
  mockUserHistory,
  mockUserLogs,
} from './client-apis.js';
import { buildClickTimeline } from '../../modules/snapshot/timeline.js';

function genId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
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

    async buildSnapshot(tenantId, userId, caseId, requestId) {
      const snapshotId = genId('scs');
      const state = mockUserState(userId, tenantId);
      const history = mockUserHistory();
      const logs = mockUserLogs();
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
          roles: state.roles,
          plan: state.plan,
          featuresEnabled: state.featuresEnabled,
        },
        productState: {
          entities: state.entities,
          activeErrors: state.activeErrors,
          limitsReached: state.limitsReached,
        },
        recentActivity: {
          windowHours: history.windowHours,
          events: history.events,
          clickTimeline,
        },
        backend: {
          recentRequests: logs.recentRequests,
          jobs: logs.jobs,
          errors: logs.errors,
        },
        knowledgePack: { docs: [], runbooks: [], changelog: [] },
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
