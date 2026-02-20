import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../app.js';
import { setLogLevel, setLogsDir } from '../../shared/logger.js';
import { resetEnvCache } from '../../shared/env.js';
import {
  createTenantService,
  encryptToken,
  decryptToken,
  type TenantStore,
  type TenantRecord,
  type TenantService,
} from './tenant.service.js';
import {
  createAnalyticsService,
  type AnalyticsDataSource,
} from './analytics.service.js';
import {
  createAuditService,
  type AuditStore,
  type AuditEntry,
} from './audit.service.js';
import { createAdminAuth } from './admin-auth.js';
import type { FastifyInstance } from 'fastify';
import type { Case, Message, SupportContextSnapshot } from '../../../../shared/types.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const JWT_SECRET = 'test-secret-admin';
const ADMIN_API_KEY = 'test-admin-key-12345';
const TENANT_ID = 'ten_admin_test01';

// --- In-memory TenantStore ---
function createMockTenantStore(): TenantStore & { _records: TenantRecord[] } {
  const _records: TenantRecord[] = [];
  return {
    _records,
    async save(record) { _records.push({ ...record }); },
    async update(id, fields) {
      const idx = _records.findIndex((r) => r.id === id);
      if (idx >= 0) Object.assign(_records[idx], fields);
    },
    async findById(id) {
      return _records.find((r) => r.id === id) ?? null;
    },
    async findAll() { return [..._records]; },
  };
}

// --- In-memory AuditStore ---
function createMockAuditStore(): AuditStore & { _entries: AuditEntry[] } {
  const _entries: AuditEntry[] = [];
  return {
    _entries,
    async findByTenant(tenantId, page, pageSize) {
      const filtered = _entries.filter((e) => e.tenantId === tenantId);
      const start = (page - 1) * pageSize;
      return {
        entries: filtered.slice(start, start + pageSize),
        total: filtered.length,
      };
    },
    async purgeOlderThan(tenantId, olderThan) {
      const cutoff = new Date(olderThan).getTime();
      const before = _entries.length;
      const remaining = _entries.filter(
        (e) => !(e.tenantId === tenantId && new Date(e.createdAt).getTime() < cutoff),
      );
      _entries.length = 0;
      _entries.push(...remaining);
      return before - _entries.length;
    },
  };
}

// --- In-memory AnalyticsDataSource ---
function createMockAnalyticsDataSource(): AnalyticsDataSource & {
  _cases: Case[];
  _messages: Message[];
  _snapshots: SupportContextSnapshot[];
} {
  const _cases: Case[] = [];
  const _messages: Message[] = [];
  const _snapshots: SupportContextSnapshot[] = [];
  return {
    _cases,
    _messages,
    _snapshots,
    async getCasesByTenant(tenantId) {
      return _cases.filter((c) => c.tenantId === tenantId);
    },
    async getMessagesByCases(caseIds) {
      return _messages.filter((m) => caseIds.includes(m.caseId));
    },
    async getSnapshotsByTenant(tenantId) {
      return _snapshots.filter((s) => s.identity.tenantId === tenantId);
    },
  };
}

function makeSnapshot(tenantId: string, errorCodes: string[]): SupportContextSnapshot {
  return {
    meta: {
      snapshotId: 'scs_test',
      createdAt: new Date().toISOString(),
      maxBytes: 1000000,
      truncation: { eventsRemoved: 0, logsTrimmed: false, docsRemoved: 0 },
    },
    identity: {
      tenantId,
      userId: 'usr_test',
      roles: ['user'],
      plan: 'pro',
      featuresEnabled: [],
    },
    productState: {
      entities: [],
      activeErrors: errorCodes.map((code) => ({
        errorCode: code,
        errorClass: 'infra' as const,
        retryable: true,
        userActionable: false,
        resourceId: 'res_1',
        occurredAt: new Date().toISOString(),
      })),
      limitsReached: [],
    },
    recentActivity: { windowHours: 72, events: [], clickTimeline: [] },
    backend: { recentRequests: [], jobs: [], errors: [] },
    knowledgePack: { docs: [], runbooks: [], changelog: [] },
    privacy: { redactionVersion: '1.0', fieldsRemoved: [] },
  };
}

describe('Admin Module', () => {
  let app: FastifyInstance;
  let tmpDir: string;
  let tenantStore: ReturnType<typeof createMockTenantStore>;
  let auditStore: ReturnType<typeof createMockAuditStore>;
  let analyticsDS: ReturnType<typeof createMockAnalyticsDataSource>;
  let tenantService: TenantService;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-test-'));
    setLogsDir(tmpDir);
    setLogLevel('low');

    process.env.JWT_SECRET = JWT_SECRET;
    process.env.DATABASE_URL = 'postgres://fake:fake@localhost:5432/fake';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.OPENROUTER_API_KEY = 'sk-fake';
    resetEnvCache();

    tenantStore = createMockTenantStore();
    auditStore = createMockAuditStore();
    analyticsDS = createMockAnalyticsDataSource();
    tenantService = createTenantService(tenantStore);

    app = await buildApp({
      jwtSecret: JWT_SECRET,
      adminRouteOpts: {
        tenantService,
        analyticsService: createAnalyticsService(analyticsDS),
        auditService: createAuditService(auditStore),
        adminAuth: createAdminAuth(ADMIN_API_KEY),
      },
    });
  });

  beforeEach(() => {
    tenantStore._records.length = 0;
    auditStore._entries.length = 0;
    analyticsDS._cases.length = 0;
    analyticsDS._messages.length = 0;
    analyticsDS._snapshots.length = 0;
  });

  afterAll(async () => {
    await app.close();
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // Test 1: createTenant stores tenant with encrypted serviceToken
  it('createTenant stores tenant with encrypted serviceToken', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/tenants',
      headers: { authorization: `Bearer ${ADMIN_API_KEY}` },
      payload: {
        name: 'Acme Corp',
        plan: 'pro',
        apiBaseUrl: 'https://api.acme.com',
        serviceToken: 'secret-token-123',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.tenant.name).toBe('Acme Corp');
    expect(body.tenant.id).toMatch(/^ten_/);

    // Verify token is encrypted in store (AES-GCM, not plaintext)
    const stored = tenantStore._records[0];
    expect(stored.serviceToken).not.toBe('secret-token-123');
    // Encryption is non-deterministic (random IV), so verify round-trip instead
    expect(decryptToken(stored.serviceToken)).toBe('secret-token-123');
  });

  // Test 2: createTenant sets default config based on plan
  it('createTenant sets default config based on plan', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/tenants',
      headers: { authorization: `Bearer ${ADMIN_API_KEY}` },
      payload: {
        name: 'Starter Co',
        plan: 'starter',
        apiBaseUrl: 'https://api.starter.com',
        serviceToken: 'tok-1',
      },
    });

    const body = JSON.parse(res.body);
    expect(body.tenant.config.maxContextBytes).toBe(1_000_000);
    expect(body.tenant.config.maxEventWindowHours).toBe(24);
    expect(body.tenant.config.modelPolicy).toBe('fast');
    expect(body.tenant.config.retentionDays).toBe(30);
    expect(body.tenant.config.enabledConnectors).toEqual(['email']);
  });

  // Test 3: updateTenant partially updates config
  it('updateTenant partially updates config', async () => {
    // Create first
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/admin/tenants',
      headers: { authorization: `Bearer ${ADMIN_API_KEY}` },
      payload: {
        name: 'Update Co',
        plan: 'pro',
        apiBaseUrl: 'https://api.update.com',
        serviceToken: 'tok-2',
      },
    });
    const tenantId = JSON.parse(createRes.body).tenant.id;

    // Partially update config
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/admin/tenants/${tenantId}`,
      headers: { authorization: `Bearer ${ADMIN_API_KEY}` },
      payload: { config: { maxDocs: 100 } },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    // maxDocs updated
    expect(body.tenant.config.maxDocs).toBe(100);
    // Other config fields preserved
    expect(body.tenant.config.maxContextBytes).toBe(5_000_000);
    expect(body.tenant.config.modelPolicy).toBe('auto');
  });

  // Test 4: getTenant returns tenant by ID
  it('getTenant returns tenant by ID', async () => {
    const tenant = await tenantService.createTenant(
      'Get Co', 'enterprise', undefined, 'https://api.get.com', 'tok-3',
    );

    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/tenants',
      headers: { authorization: `Bearer ${ADMIN_API_KEY}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const found = body.tenants.find((t: { id: string }) => t.id === tenant.id);
    expect(found).toBeDefined();
    expect(found.name).toBe('Get Co');
    expect(found.plan).toBe('enterprise');
  });

  // Test 5: getAnalytics returns correct resolution rate
  it('getAnalytics returns correct resolution rate', async () => {
    // Seed 4 cases: 2 resolved, 1 escalated, 1 active
    const now = new Date();
    analyticsDS._cases.push(
      {
        id: 'cas_1', tenantId: TENANT_ID, userId: 'usr_1', status: 'resolved',
        snapshotId: 'scs_1', createdAt: new Date(now.getTime() - 60000).toISOString(),
        updatedAt: now.toISOString(), resolvedAt: now.toISOString(),
        messageCount: 3, feedback: 'positive',
      },
      {
        id: 'cas_2', tenantId: TENANT_ID, userId: 'usr_1', status: 'resolved',
        snapshotId: 'scs_2', createdAt: new Date(now.getTime() - 60000).toISOString(),
        updatedAt: now.toISOString(), resolvedAt: now.toISOString(),
        messageCount: 5, feedback: 'negative',
      },
      {
        id: 'cas_3', tenantId: TENANT_ID, userId: 'usr_1', status: 'escalated',
        snapshotId: 'scs_3', createdAt: now.toISOString(),
        updatedAt: now.toISOString(), resolvedAt: null,
        messageCount: 2, feedback: null,
      },
      {
        id: 'cas_4', tenantId: TENANT_ID, userId: 'usr_1', status: 'active',
        snapshotId: 'scs_4', createdAt: now.toISOString(),
        updatedAt: now.toISOString(), resolvedAt: null,
        messageCount: 1, feedback: null,
      },
    );

    // Add assistant messages for first response time
    analyticsDS._messages.push(
      {
        id: 'msg_1', caseId: 'cas_1', role: 'user', content: 'help',
        actions: [], evidence: [], confidence: null,
        createdAt: new Date(now.getTime() - 60000).toISOString(),
      },
      {
        id: 'msg_2', caseId: 'cas_1', role: 'assistant', content: 'Sure',
        actions: [], evidence: [], confidence: 0.8,
        createdAt: new Date(now.getTime() - 50000).toISOString(),
      },
    );

    const res = await app.inject({
      method: 'GET',
      url: `/api/admin/tenants/${TENANT_ID}/analytics`,
      headers: { authorization: `Bearer ${ADMIN_API_KEY}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.analytics.totalCases).toBe(4);
    expect(body.analytics.resolvedWithoutHuman).toBe(2);
    expect(body.analytics.resolutionRate).toBe(0.5);
    expect(body.analytics.avgMessagesPerResolution).toBe(4); // (3+5)/2
    expect(body.analytics.csat.positive).toBe(1);
    expect(body.analytics.csat.negative).toBe(1);
  });

  // Test 6: getAnalytics returns top errors from snapshots
  it('getAnalytics returns top errors from snapshots', async () => {
    analyticsDS._cases.push({
      id: 'cas_e1', tenantId: TENANT_ID, userId: 'usr_1', status: 'active',
      snapshotId: 'scs_e1', createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), resolvedAt: null,
      messageCount: 1, feedback: null,
    });
    analyticsDS._snapshots.push(
      makeSnapshot(TENANT_ID, ['UPLOAD_FAILED', 'UPLOAD_FAILED', 'TIMEOUT']),
      makeSnapshot(TENANT_ID, ['UPLOAD_FAILED']),
    );

    const res = await app.inject({
      method: 'GET',
      url: `/api/admin/tenants/${TENANT_ID}/analytics`,
      headers: { authorization: `Bearer ${ADMIN_API_KEY}` },
    });

    const body = JSON.parse(res.body);
    expect(body.analytics.topErrors.length).toBeGreaterThan(0);
    const uploadErr = body.analytics.topErrors.find(
      (e: { errorCode: string }) => e.errorCode === 'UPLOAD_FAILED',
    );
    expect(uploadErr).toBeDefined();
    expect(uploadErr.count).toBe(3);
  });

  // Test 7: getAuditLog returns paginated entries
  it('getAuditLog returns paginated entries', async () => {
    // Seed 5 audit entries
    for (let i = 0; i < 5; i++) {
      auditStore._entries.push({
        id: `aud_${i}`,
        tenantId: TENANT_ID,
        userId: 'usr_1',
        caseId: null,
        action: 'test_action',
        details: { index: i },
        createdAt: new Date().toISOString(),
      });
    }

    const res = await app.inject({
      method: 'GET',
      url: `/api/admin/tenants/${TENANT_ID}/audit?page=1&pageSize=2`,
      headers: { authorization: `Bearer ${ADMIN_API_KEY}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.entries.length).toBe(2);
    expect(body.total).toBe(5);
    expect(body.hasMore).toBe(true);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(2);
  });

  // Test 8: purgeData removes old cases and snapshots
  it('purgeData removes old entries', async () => {
    const old = new Date('2024-01-01').toISOString();
    const recent = new Date().toISOString();

    auditStore._entries.push(
      { id: 'aud_old', tenantId: TENANT_ID, userId: 'u1', caseId: null,
        action: 'old', details: {}, createdAt: old },
      { id: 'aud_new', tenantId: TENANT_ID, userId: 'u1', caseId: null,
        action: 'new', details: {}, createdAt: recent },
    );

    const auditService = createAuditService(auditStore);
    const result = await auditService.purgeData(TENANT_ID, '2025-01-01');

    expect(result.purged).toBe(1);
    expect(auditStore._entries.length).toBe(1);
    expect(auditStore._entries[0].id).toBe('aud_new');
  });

  // Test 9: Admin routes reject non-admin requests with 403
  it('admin routes reject non-admin requests with 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/tenants',
      headers: { authorization: 'Bearer wrong-key' },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('FORBIDDEN');
  });

  // Test 10: listTenants returns all tenants
  it('listTenants returns all tenants', async () => {
    await tenantService.createTenant(
      'Tenant A', 'starter', undefined, 'https://a.com', 'tok-a',
    );
    await tenantService.createTenant(
      'Tenant B', 'pro', undefined, 'https://b.com', 'tok-b',
    );

    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/tenants',
      headers: { authorization: `Bearer ${ADMIN_API_KEY}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.tenants.length).toBe(2);
    const names = body.tenants.map((t: { name: string }) => t.name);
    expect(names).toContain('Tenant A');
    expect(names).toContain('Tenant B');
  });
});
