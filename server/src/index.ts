import { createActionService } from './modules/actions/action-service.js';
import { createActionStore } from './modules/actions/action-store.js';
import { createRedisRateLimiter } from './modules/gateway/rate-limiter.js';
import { getRedis } from './shared/redis.js';
import { buildApp } from './app.js';
import { getEnv } from './shared/env.js';
import { errorCode, log, setLogLevel } from './shared/logger.js';
import { getDb } from './shared/db.js';
import { createGatewayService } from './modules/gateway/gateway.service.js';
import { createSnapshotService } from './modules/snapshot/snapshot.service.js';
import { createContextService } from './modules/context/context.service.js';
import { createOrchestratorService } from './modules/orchestrator/orchestrator.service.js';
import { withConversation } from './modules/orchestrator/tenant-capacity.js';
import { createQueuedOrchestrator } from './modules/orchestrator/queued-orchestrator.js';
import { createTenantService } from './modules/admin/tenant.service.js';
import { createAnalyticsService } from './modules/admin/analytics.service.js';
import { createAuditService } from './modules/admin/audit.service.js';
import { createCostService } from './modules/admin/cost.service.js';
import { createModelListService } from './modules/orchestrator/model-list.service.js';
import { createAdminAuth, createLoginHandler } from './modules/admin/admin-auth.js';
import { createDbTenantStore, createDbCostStore, createDbAuditStore } from './shared/db-stores.js';
import { createDbAnalyticsDataSource, createDbSessionDataSource } from './shared/db-data-sources.js';
import { sessionMcpStore } from './modules/sessions/session-mcp.js';
import { createSessionStore } from './modules/sessions/session.store.js';
import { createWorkspaceStore } from './modules/workspaces/workspace-store.js';
import { createWorkspaceMail } from './modules/workspaces/workspace-mail.js';
import { createTurnIdempotency } from './modules/gateway/turn-idempotency.js';
import { createSuggestionStore } from './modules/workspaces/suggestions.js';

async function main() {
  const env = getEnv();
  setLogLevel(env.LOG_LEVEL);

  const db = getDb(env.DATABASE_URL);
  const tenantStore = createDbTenantStore(db);
  const tenantService = createTenantService(tenantStore);
  const limiter = createRedisRateLimiter(getRedis(env.REDIS_URL));
  const gateway = createGatewayService(db);
  const snapshotSvc = createSnapshotService(db, tenantService);
  const sessionMcp = sessionMcpStore(getRedis(env.REDIS_URL));
  const costStore = createDbCostStore(db);
  const costSvc = createCostService(costStore, async (entry) => {
    const redis = getRedis(env.REDIS_URL);
    const date = new Date().toISOString().slice(0, 10);
    const key = `support:daily-cost:${date}:${entry.tenantId}`;
    const threshold = env.DAILY_COST_ALERT_USD ?? 25;
    const crossed = await redis.eval(
      "local v=tonumber(redis.call('INCRBYFLOAT',KEYS[1],ARGV[1])); redis.call('EXPIRE',KEYS[1],172800); " +
      "return v>=tonumber(ARGV[2]) and v-tonumber(ARGV[1])<tonumber(ARGV[2]) and 1 or 0",
      1, key, entry.estimatedCost, threshold,
    );
    if (crossed) log.warn('Workspace daily model spend threshold reached', undefined, { tenantId: entry.tenantId, threshold, date });
  });

  const orchestrator = createOrchestratorService({
    withConversation: (scope, work) => withConversation(getRedis(env.REDIS_URL), scope, work),
    gatewayService: gateway,
    snapshotService: snapshotSvc,
    contextService: createContextService(),
    costRecorder: costSvc,
    tenantService,
    resolveMcp: sessionMcp.resolve,
    actions: createActionService(createActionStore(db), gateway),
    apiKey: env.OPENROUTER_API_KEY,
    modelPolicy: 'fast',
  });
  const queueMode = env.TURN_QUEUE_MODE ?? 'off';
  const queue = queueMode === 'off' ? undefined : await createQueuedOrchestrator(orchestrator, env.REDIS_URL, queueMode, env.TURN_WORKER_CONCURRENCY ?? 8);
  if (queueMode === 'worker' && queue) {
    log.info('Support turn worker is ready');
    const shutdown = () => { void queue.close().finally(() => process.exit(0)); };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
    return;
  }

  const modelListService = createModelListService(env.OPENROUTER_API_KEY);
  const authOpts = {
    superAdminKey: env.ADMIN_API_KEY, jwtSecret: env.ADMIN_JWT_SECRET, tenantService,
    adminEmail: env.ADMIN_EMAIL, adminPasswordHash: env.ADMIN_PASSWORD_HASH,
  };
  const adminAuth = createAdminAuth(authOpts);
  const loginHandler = createLoginHandler(authOpts, limiter);
  const sessionDataSource = createDbSessionDataSource(db);
  const sessionStore = createSessionStore(db);
  const suggestions = createSuggestionStore(db);
  const workspaceOpts = env.WORKSPACE_PUBLIC_ORIGIN ? {
    rateLimiter: limiter, store: createWorkspaceStore(db), sessions: sessionStore, widgetSecret: env.WIDGET_JWT_SECRET,
    publicOrigin: env.WORKSPACE_PUBLIC_ORIGIN,
    suggestions,
    mail: env.POSTMARK_SERVER_TOKEN && env.POSTMARK_FROM
      ? createWorkspaceMail(env.POSTMARK_SERVER_TOKEN, env.POSTMARK_FROM) : undefined,
  } : undefined;

  const app = await buildApp({
    jwtSecret: env.WIDGET_JWT_SECRET,
    sessionRouteOpts: {
      mcp: sessionMcp, rateLimiter: limiter, store: sessionStore, tenantService, widgetSecret: env.WIDGET_JWT_SECRET, adminAuth,
    },
    workspaceOpts,
    rateLimiter: limiter,
    gatewayService: gateway,
    suggestions,
    turnIdempotency: createTurnIdempotency(db),
    snapshotService: snapshotSvc,
    orchestratorService: queue?.service ?? orchestrator,
    adminRouteOpts: {
      tenantService,
      analyticsService: createAnalyticsService(createDbAnalyticsDataSource(db)),
      auditService: createAuditService(createDbAuditStore(db)),
      adminAuth,
      loginHandler,
      modelListService,
      costService: costSvc,
      getCasesByTenant: createDbAnalyticsDataSource(db).getCasesByTenant,
    },
    sessionAdminOpts: { dataSource: sessionDataSource, adminAuth },
  });

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  if (queue) {
    const shutdown = () => { void app.close().finally(() => queue.close()).finally(() => process.exit(0)); };
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
  }
  log.info(`Server running on port ${env.PORT}`);
}

main().catch((err) => { log.error('Startup failed', undefined, { errorCode: errorCode(err) }); process.exit(1); });
