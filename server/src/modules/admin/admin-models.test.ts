import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import { setLogLevel, setLogsDir } from '../../shared/logger.js';
import { resetEnvCache } from '../../shared/env.js';
import { createTenantService, type TenantStore, type TenantRecord } from './tenant.service.js';
import { createAnalyticsService, type AnalyticsDataSource } from './analytics.service.js';
import { createAuditService, type AuditStore } from './audit.service.js';
import { createAdminAuth } from './admin-auth.js';
import type { ModelListService } from '../orchestrator/model-list.service.js';
import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const JWT_SECRET = 'test-secret-models';
const ADMIN_API_KEY = 'test-admin-key-models';

function createMockTenantStore(): TenantStore {
  const records: TenantRecord[] = [];
  return {
    async save(r) { records.push({ ...r }); },
    async update(id, f) { const i = records.findIndex((r) => r.id === id); if (i >= 0) Object.assign(records[i], f); },
    async findById(id) { return records.find((r) => r.id === id) ?? null; },
    async findAll() { return [...records]; },
  };
}

function createMockAuditStore(): AuditStore {
  return {
    async findByTenant() { return { entries: [], total: 0 }; },
    async purgeOlderThan() { return 0; },
  };
}

function createMockAnalyticsDS(): AnalyticsDataSource {
  return {
    async getCasesByTenant() { return []; },
    async getMessagesByCases() { return []; },
    async getSnapshotsByTenant() { return []; },
  };
}

const MOCK_MODELS = [
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'anthropic', promptPricing: 0.003, completionPricing: 0.015 },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'openai', promptPricing: 0.005, completionPricing: 0.015 },
];

function createMockModelListService(): ModelListService {
  return {
    async getModels() { return MOCK_MODELS; },
  };
}

describe('GET /api/admin/models', () => {
  let app: FastifyInstance;
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-models-'));
    setLogsDir(tmpDir);
    setLogLevel('off');

    process.env.JWT_SECRET = JWT_SECRET;
    process.env.DATABASE_URL = 'postgres://fake:fake@localhost:5432/fake';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.OPENROUTER_API_KEY = 'sk-fake';
    resetEnvCache();

    app = await buildApp({
      jwtSecret: JWT_SECRET,
      adminRouteOpts: {
        tenantService: createTenantService(createMockTenantStore()),
        analyticsService: createAnalyticsService(createMockAnalyticsDS()),
        auditService: createAuditService(createMockAuditStore()),
        adminAuth: createAdminAuth(ADMIN_API_KEY),
        modelListService: createMockModelListService(),
      },
    });
  });

  afterAll(async () => {
    await app.close();
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns model list with valid admin auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/models',
      headers: { authorization: `Bearer ${ADMIN_API_KEY}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.models).toHaveLength(2);
    expect(body.models[0].id).toBe('anthropic/claude-sonnet-4');
    expect(body.models[1].provider).toBe('openai');
  });

  it('rejects request without admin auth', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/models',
      headers: { authorization: 'Bearer wrong-key' },
    });

    expect(res.statusCode).toBe(403);
  });

  it('returns models with pricing info', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/models',
      headers: { authorization: `Bearer ${ADMIN_API_KEY}` },
    });

    const body = JSON.parse(res.body);
    const claude = body.models[0];
    expect(claude.promptPricing).toBe(0.003);
    expect(claude.completionPricing).toBe(0.015);
  });
});
