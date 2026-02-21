import { describe, it, expect, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { createCostService, type CostStore } from './cost.service.js';
import type { LLMCostEntry } from '../../shared/types.js';
import { registerAdminRoutes } from './admin.routes.js';
import type { TenantService } from './tenant.service.js';
import type { AnalyticsService } from './analytics.service.js';
import type { AuditService } from './audit.service.js';

function createMockStore(): CostStore & { entries: LLMCostEntry[] } {
  const entries: LLMCostEntry[] = [];
  return {
    entries,
    async insert(entry) { entries.push(entry); },
    async findByTenantAndMonth(tenantId, month) {
      return entries.filter((e) =>
        e.tenantId === tenantId && e.createdAt.startsWith(month),
      );
    },
  };
}

describe('CostService', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => { store = createMockStore(); });

  it('records a cost entry', async () => {
    const svc = createCostService(store);
    await svc.record({
      tenantId: 'ten_a', model: 'anthropic/claude-sonnet-4-20250514',
      tokensIn: 500, tokensOut: 200, estimatedCost: 0.0045, caseId: 'cas_1',
    });
    expect(store.entries).toHaveLength(1);
    expect(store.entries[0].tenantId).toBe('ten_a');
    expect(store.entries[0].model).toBe('anthropic/claude-sonnet-4-20250514');
  });

  it('aggregates monthly summary with model breakdown', async () => {
    const svc = createCostService(store);
    const base = { tenantId: 'ten_a' as const, caseId: 'cas_1' as const };

    await svc.record({ ...base, model: 'modelA', tokensIn: 100, tokensOut: 50, estimatedCost: 0.01 });
    await svc.record({ ...base, model: 'modelA', tokensIn: 200, tokensOut: 80, estimatedCost: 0.02 });
    await svc.record({ ...base, model: 'modelB', tokensIn: 300, tokensOut: 100, estimatedCost: 0.05 });

    const summary = await svc.getMonthlySummary('ten_a', new Date().toISOString().slice(0, 7));
    expect(summary.totalCalls).toBe(3);
    expect(summary.totalCost).toBeCloseTo(0.08);
    expect(summary.totalTokensIn).toBe(600);
    expect(summary.totalTokensOut).toBe(230);
    expect(summary.byModel).toHaveLength(2);

    const modelA = summary.byModel.find((m) => m.model === 'modelA');
    expect(modelA?.callCount).toBe(2);
    expect(modelA?.cost).toBeCloseTo(0.03);
  });

  it('returns empty summary when no entries', async () => {
    const svc = createCostService(store);
    const summary = await svc.getMonthlySummary('ten_a', '2026-01');
    expect(summary.totalCalls).toBe(0);
    expect(summary.totalCost).toBe(0);
    expect(summary.byModel).toHaveLength(0);
  });

  it('isolates entries by tenant', async () => {
    const svc = createCostService(store);
    await svc.record({
      tenantId: 'ten_a', model: 'modelA', tokensIn: 100,
      tokensOut: 50, estimatedCost: 0.01, caseId: 'cas_1',
    });
    await svc.record({
      tenantId: 'ten_b', model: 'modelA', tokensIn: 200,
      tokensOut: 80, estimatedCost: 0.02, caseId: 'cas_2',
    });

    const month = new Date().toISOString().slice(0, 7);
    const summaryA = await svc.getMonthlySummary('ten_a', month);
    const summaryB = await svc.getMonthlySummary('ten_b', month);

    expect(summaryA.totalCalls).toBe(1);
    expect(summaryB.totalCalls).toBe(1);
    expect(summaryA.totalCost).toBeCloseTo(0.01);
    expect(summaryB.totalCost).toBeCloseTo(0.02);
  });
});

describe('GET /api/admin/tenants/:id/costs', () => {
  it('returns cost summary for tenant', async () => {
    const store = createMockStore();
    const costService = createCostService(store);
    await costService.record({
      tenantId: 'ten_x', model: 'modelA', tokensIn: 100,
      tokensOut: 50, estimatedCost: 0.01, caseId: 'cas_1',
    });

    const app = Fastify();
    await registerAdminRoutes(app, {
      tenantService: {} as TenantService,
      analyticsService: {} as AnalyticsService,
      auditService: {} as AuditService,
      adminAuth: async () => {},
      costService,
    });

    const month = new Date().toISOString().slice(0, 7);
    const res = await app.inject({
      method: 'GET',
      url: `/api/admin/tenants/ten_x/costs?month=${month}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.costs.totalCalls).toBe(1);
    expect(body.costs.tenantId).toBe('ten_x');
  });

  it('defaults month to current month', async () => {
    const store = createMockStore();
    const costService = createCostService(store);

    const app = Fastify();
    await registerAdminRoutes(app, {
      tenantService: {} as TenantService,
      analyticsService: {} as AnalyticsService,
      auditService: {} as AuditService,
      adminAuth: async () => {},
      costService,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/tenants/ten_x/costs',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.costs.month).toBe(new Date().toISOString().slice(0, 7));
  });
});
