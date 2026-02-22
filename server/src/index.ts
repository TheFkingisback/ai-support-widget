import { buildApp } from './app.js';
import { getEnv } from './shared/env.js';
import { log, setLogLevel } from './shared/logger.js';
import { getDb } from './shared/db.js';
import { createGatewayService } from './modules/gateway/gateway.service.js';
import { createSnapshotService } from './modules/snapshot/snapshot.service.js';
import { createContextService } from './modules/context/context.service.js';
import { createOrchestratorService } from './modules/orchestrator/orchestrator.service.js';
import { createInMemoryRateLimiter } from './modules/gateway/rate-limiter.js';
import { createTenantService } from './modules/admin/tenant.service.js';
import { createAnalyticsService } from './modules/admin/analytics.service.js';
import { createAuditService } from './modules/admin/audit.service.js';
import { createCostService } from './modules/admin/cost.service.js';
import { createModelListService } from './modules/orchestrator/model-list.service.js';
import { createAdminAuth } from './modules/admin/admin-auth.js';
import { createDbTenantStore, createDbCostStore, createDbAuditStore } from './shared/db-stores.js';
import { createDbAnalyticsDataSource, createDbSessionDataSource } from './shared/db-data-sources.js';

async function main() {
  const env = getEnv();
  setLogLevel(env.LOG_LEVEL);

  const db = getDb(env.DATABASE_URL);
  const tenantStore = createDbTenantStore(db);
  const tenantService = createTenantService(tenantStore);
  const gateway = createGatewayService(db);
  const snapshotSvc = createSnapshotService(db, {
    baseUrl: 'unused-push-model',
    serviceToken: 'unused-push-model',
  });

  const costStore = createDbCostStore(db);
  const costSvc = createCostService(costStore);

  const orchestrator = createOrchestratorService({
    gatewayService: gateway,
    snapshotService: snapshotSvc,
    contextService: createContextService(),
    costRecorder: costSvc,
    tenantService,
    apiKey: env.OPENROUTER_API_KEY,
    modelPolicy: 'fast',
  });

  const modelListService = createModelListService(env.OPENROUTER_API_KEY);
  const adminAuth = createAdminAuth(env.ADMIN_API_KEY);
  const sessionDataSource = createDbSessionDataSource(db);

  const app = await buildApp({
    jwtSecret: env.JWT_SECRET,
    gatewayService: gateway,
    rateLimiter: createInMemoryRateLimiter(),
    snapshotService: snapshotSvc,
    orchestratorService: orchestrator,
    adminRouteOpts: {
      tenantService,
      analyticsService: createAnalyticsService(createDbAnalyticsDataSource(db)),
      auditService: createAuditService(createDbAuditStore(db)),
      adminAuth,
      modelListService,
      costService: costSvc,
    },
    sessionAdminOpts: { dataSource: sessionDataSource, adminAuth },
  });

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  log.info(`Server running on port ${env.PORT}`);
}

main().catch((err) => { log.error(`Fatal: ${err}`); process.exit(1); });
