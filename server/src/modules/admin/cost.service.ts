import type { LLMCostEntry, CostSummary, CostByModel, TenantId, CaseId } from '../../shared/types.js';
import { log } from '../../shared/logger.js';

export interface CostStore {
  insert(entry: LLMCostEntry): Promise<void>;
  findByTenantAndMonth(tenantId: TenantId, month: string): Promise<LLMCostEntry[]>;
}

export interface RecordCostParams {
  tenantId: TenantId;
  model: string;
  tokensIn: number;
  tokensOut: number;
  estimatedCost: number;
  caseId: CaseId;
}

/** Narrow interface the orchestrator depends on — recording only. */
export interface CostRecorder {
  record(params: RecordCostParams, requestId?: string): Promise<void>;
}

export interface CostService extends CostRecorder {
  getMonthlySummary(tenantId: TenantId, month: string, requestId?: string): Promise<CostSummary>;
}

export function createCostService(store: CostStore): CostService {
  return {
    async record(params, requestId) {
      const entry: LLMCostEntry = {
        id: `cost_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        tenantId: params.tenantId,
        model: params.model,
        tokensIn: params.tokensIn,
        tokensOut: params.tokensOut,
        estimatedCost: params.estimatedCost,
        caseId: params.caseId,
        createdAt: new Date().toISOString(),
      };
      try {
        await store.insert(entry);
        log.info('CostService.record: stored', requestId, {
          tenantId: params.tenantId, model: params.model, cost: params.estimatedCost,
        });
      } catch (err) {
        log.warn('CostService.record: failed (non-fatal)', requestId, {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },

    async getMonthlySummary(tenantId, month, requestId) {
      log.info('CostService.getMonthlySummary', requestId, { tenantId, month });
      const entries = await store.findByTenantAndMonth(tenantId, month);
      return aggregateEntries(tenantId, month, entries);
    },
  };
}

function aggregateEntries(tenantId: TenantId, month: string, entries: LLMCostEntry[]): CostSummary {
  const byModelMap = new Map<string, CostByModel>();

  for (const e of entries) {
    const existing = byModelMap.get(e.model);
    if (existing) {
      existing.callCount += 1;
      existing.tokensIn += e.tokensIn;
      existing.tokensOut += e.tokensOut;
      existing.cost += e.estimatedCost;
    } else {
      byModelMap.set(e.model, {
        model: e.model,
        callCount: 1,
        tokensIn: e.tokensIn,
        tokensOut: e.tokensOut,
        cost: e.estimatedCost,
      });
    }
  }

  const byModel = [...byModelMap.values()];
  return {
    tenantId,
    month,
    totalCost: entries.reduce((s, e) => s + e.estimatedCost, 0),
    totalCalls: entries.length,
    totalTokensIn: entries.reduce((s, e) => s + e.tokensIn, 0),
    totalTokensOut: entries.reduce((s, e) => s + e.tokensOut, 0),
    byModel,
  };
}
