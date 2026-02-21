import { buildApp } from './app.js';
import { getEnv } from './shared/env.js';
import { log, setLogLevel } from './shared/logger.js';
import { createMockGatewayService } from './tests/mocks/mock-gateway.js';
import { createMockSnapshotService } from './tests/mocks/mock-snapshot.js';
import { createContextService } from './modules/context/context.service.js';
import { createOrchestratorService } from './modules/orchestrator/orchestrator.service.js';
import { createInMemoryRateLimiter } from './modules/gateway/rate-limiter.js';
import { createTenantService, type TenantStore, type TenantRecord } from './modules/admin/tenant.service.js';
import { createAnalyticsService, type AnalyticsDataSource } from './modules/admin/analytics.service.js';
import { createAuditService, type AuditStore, type AuditEntry } from './modules/admin/audit.service.js';
import { createCostService, type CostStore } from './modules/admin/cost.service.js';
import { createModelListService } from './modules/orchestrator/model-list.service.js';
import { createAdminAuth } from './modules/admin/admin-auth.js';
import type { LLMCostEntry } from './shared/types.js';
import type { SessionDataSource } from './modules/admin/session-admin.routes.js';

const ADMIN_API_KEY = 'admin-dev-key';

function createMemTenantStore(): TenantStore {
  const r: TenantRecord[] = [];
  return {
    async save(rec) { r.push({ ...rec }); },
    async update(id, f) { const i = r.findIndex((x) => x.id === id); if (i >= 0) Object.assign(r[i], f); },
    async findById(id) { return r.find((x) => x.id === id) ?? null; },
    async findAll() { return [...r]; },
  };
}

function createMemAuditStore(): AuditStore {
  const e: AuditEntry[] = [];
  return {
    async findByTenant(tid, p, ps) {
      const f = e.filter((x) => x.tenantId === tid); const s = (p - 1) * ps;
      return { entries: f.slice(s, s + ps), total: f.length };
    },
    async purgeOlderThan() { return 0; },
  };
}

function createMemAnalyticsDS(): AnalyticsDataSource {
  return {
    async getCasesByTenant() { return []; },
    async getMessagesByCases() { return []; },
    async getSnapshotsByTenant() { return []; },
  };
}

function createMemCostStore(): CostStore & { entries: LLMCostEntry[] } {
  const entries: LLMCostEntry[] = [];
  return {
    entries,
    async insert(entry) { entries.push(entry); },
    async findByTenantAndMonth(tid, month) {
      return entries.filter((e) => e.tenantId === tid && e.createdAt.startsWith(month));
    },
  };
}

async function main() {
  const env = getEnv();
  setLogLevel(env.LOG_LEVEL);

  const gateway = createMockGatewayService();
  const snapshotSvc = createMockSnapshotService(gateway._cases);
  const costStore = createMemCostStore();
  const costSvc = createCostService(costStore);

  const orchestrator = createOrchestratorService({
    gatewayService: gateway,
    snapshotService: snapshotSvc,
    contextService: createContextService(),
    costRecorder: costSvc,
    apiKey: env.OPENROUTER_API_KEY,
    modelPolicy: 'fast',
  });

  const tenantService = createTenantService(createMemTenantStore());
  const modelListService = createModelListService(env.OPENROUTER_API_KEY);
  const adminAuth = createAdminAuth(ADMIN_API_KEY);

  const sessionDataSource: SessionDataSource = {
    getAllCases: () => gateway._cases,
    getMessages: (caseId) => gateway._messages.filter((m) => m.caseId === caseId),
    getSnapshotByCaseId: (caseId) => {
      const s = snapshotSvc._snapshots.find((s) => s.caseId === caseId);
      return s?.data ?? null;
    },
    getCostsByCaseId: (caseId) => costStore.entries.filter((e) => e.caseId === caseId),
  };

  const app = await buildApp({
    jwtSecret: env.JWT_SECRET,
    gatewayService: gateway,
    rateLimiter: createInMemoryRateLimiter(),
    snapshotService: snapshotSvc,
    orchestratorService: orchestrator,
    adminRouteOpts: {
      tenantService,
      analyticsService: createAnalyticsService(createMemAnalyticsDS()),
      auditService: createAuditService(createMemAuditStore()),
      adminAuth,
      modelListService,
      costService: costSvc,
    },
    sessionAdminOpts: { dataSource: sessionDataSource, adminAuth },
  });

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  log.info(`Server running on http://localhost:${env.PORT}`);
  log.info(`Admin API key: ${ADMIN_API_KEY}`);
}

main().catch((err) => { log.error(`Fatal: ${err}`); process.exit(1); });
