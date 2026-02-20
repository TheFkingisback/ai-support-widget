import { log } from '../../shared/logger.js';
import type { PaginatedResponse, AuditEntry } from '../../../../shared/types.js';

export type { AuditEntry };

export interface AuditStore {
  findByTenant(
    tenantId: string,
    page: number,
    pageSize: number,
  ): Promise<{ entries: AuditEntry[]; total: number }>;
  purgeOlderThan(tenantId: string, olderThan: string): Promise<number>;
}

export interface AuditService {
  getAuditLog(
    tenantId: string,
    page: number,
    pageSize: number,
    requestId?: string,
  ): Promise<PaginatedResponse<AuditEntry>>;

  purgeData(
    tenantId: string,
    olderThan: string,
    requestId?: string,
  ): Promise<{ purged: number }>;
}

export function createAuditService(store: AuditStore): AuditService {
  return {
    async getAuditLog(tenantId, page, pageSize, requestId) {
      log.info('Getting audit log', requestId, { tenantId, page, pageSize });

      const { entries, total } = await store.findByTenant(tenantId, page, pageSize);

      return {
        data: entries,
        total,
        page,
        pageSize,
        hasMore: page * pageSize < total,
      };
    },

    async purgeData(tenantId, olderThan, requestId) {
      log.warn('Purging data', requestId, { tenantId, olderThan });

      const purged = await store.purgeOlderThan(tenantId, olderThan);

      log.warn('Data purged', requestId, { tenantId, purged });
      return { purged };
    },
  };
}
