import crypto from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { snapshots } from './snapshot.schema.js';
import {
  getUserState,
  getUserHistory,
  getUserLogs,
  getBusinessRules,
} from './client-api.js';
import { buildClickTimeline } from './timeline.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors.js';
import { log } from '../../shared/logger.js';
import type {
  SupportContextSnapshot,
  GetUserStateResponse,
  GetUserHistoryResponse,
  GetUserLogsResponse,
  GetBusinessRulesResponse,
} from '../../shared/types.js';

function genId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

export interface SnapshotService {
  buildSnapshot(
    tenantId: string,
    userId: string,
    caseId: string,
    requestId?: string,
    pushedContext?: Record<string, unknown>,
  ): Promise<SupportContextSnapshot>;

  getSnapshot(
    snapshotId: string,
    tenantId: string,
    requestId?: string,
  ): Promise<SupportContextSnapshot>;
}

interface ClientApiOpts {
  baseUrl: string;
  serviceToken: string;
}

export function createSnapshotService(
  db: PostgresJsDatabase,
  clientApiOpts: ClientApiOpts,
): SnapshotService {
  return {
    async buildSnapshot(tenantId, userId, caseId, requestId) {
      log.info('Building snapshot', requestId, { tenantId, userId, caseId });

      const snapshotId = genId('scs');
      const windowHours = 72;

      const [stateResult, historyResult, logsResult, rulesResult] =
        await Promise.allSettled([
          getUserState(clientApiOpts, userId, requestId),
          getUserHistory(clientApiOpts, userId, windowHours, requestId),
          getUserLogs(clientApiOpts, userId, windowHours, requestId),
          getBusinessRules(clientApiOpts, requestId),
        ]);

      const state: GetUserStateResponse | null =
        stateResult.status === 'fulfilled' ? stateResult.value : null;
      const history: GetUserHistoryResponse | null =
        historyResult.status === 'fulfilled' ? historyResult.value : null;
      const logs: GetUserLogsResponse | null =
        logsResult.status === 'fulfilled' ? logsResult.value : null;
      const rules: GetBusinessRulesResponse | null =
        rulesResult.status === 'fulfilled' ? rulesResult.value : null;

      const failedSources: string[] = [];
      if (!state) failedSources.push('user-state');
      if (!history) failedSources.push('user-history');
      if (!logs) failedSources.push('user-logs');
      if (!rules) failedSources.push('business-rules');

      if (failedSources.length > 0) {
        log.warn('Some client APIs failed', requestId, { failedSources });
      }

      const clickTimeline = history
        ? buildClickTimeline(history.events, requestId)
        : [];

      const snapshot: SupportContextSnapshot = {
        meta: {
          snapshotId,
          createdAt: new Date().toISOString(),
          maxBytes: 5_000_000,
          truncation: {
            eventsRemoved: 0,
            logsTrimmed: false,
            docsRemoved: 0,
          },
        },
        identity: {
          tenantId,
          userId,
          roles: state?.roles ?? [],
          plan: state?.plan ?? 'unknown',
          featuresEnabled: state?.featuresEnabled ?? [],
        },
        productState: {
          entities: state?.entities ?? [],
          activeErrors: state?.activeErrors ?? [],
          limitsReached: state?.limitsReached ?? [],
        },
        recentActivity: {
          windowHours: history?.windowHours ?? windowHours,
          events: history?.events ?? [],
          clickTimeline,
        },
        backend: {
          recentRequests: logs?.recentRequests ?? [],
          jobs: logs?.jobs ?? [],
          errors: logs?.errors ?? [],
        },
        knowledgePack: {
          docs: [],
          runbooks: [],
          changelog: [],
        },
        privacy: {
          redactionVersion: '1.0',
          fieldsRemoved: [],
        },
      };

      const snapshotJson = JSON.stringify(snapshot);
      const bytesTotal = Buffer.byteLength(snapshotJson, 'utf-8');

      await db.insert(snapshots).values({
        id: snapshotId,
        tenantId,
        userId,
        caseId,
        data: snapshot,
        bytesTotal,
        truncation: snapshot.meta.truncation,
        createdAt: new Date(),
      });

      log.info('Snapshot built', requestId, {
        snapshotId,
        bytesTotal,
        sourcesOk: 4 - failedSources.length,
        sourcesFailed: failedSources.length,
      });

      return snapshot;
    },

    async getSnapshot(snapshotId, tenantId, requestId) {
      log.info('Getting snapshot', requestId, { snapshotId, tenantId });

      const rows = await db
        .select()
        .from(snapshots)
        .where(and(eq(snapshots.id, snapshotId), eq(snapshots.tenantId, tenantId)))
        .limit(1);

      if (rows.length === 0) {
        throw new NotFoundError('Snapshot', snapshotId);
      }

      return rows[0].data as SupportContextSnapshot;
    },
  };
}
