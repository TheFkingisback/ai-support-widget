import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../app.js';
import { setLogLevel, setLogsDir } from '../../shared/logger.js';
import { resetEnvCache } from '../../shared/env.js';
import { createTenantService } from './tenant.service.js';
import { createAnalyticsService } from './analytics.service.js';
import { createAuditService } from './audit.service.js';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Tenant, AuditEntry, Case, Message, SupportContextSnapshot } from '../../shared/types.js';
import { genId } from '../../tests/mocks/test-utils.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const JWT_SECRET = 'test-secret-admin-isol';
const ADMIN_KEY = 'admin-secret-key';
const TENANT_A = 'ten_adminIsolA';
const TENANT_B = 'ten_adminIsolB';

describe('Admin API Tenant Isolation', () => {
  let app: FastifyInstance;
  let tmpDir: string;
  let tenants: Tenant[];
  let auditEntries: AuditEntry[];
  let cases: Case[];

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-isol-'));
    setLogsDir(tmpDir);
    setLogLevel('off');

    process.env.JWT_SECRET = JWT_SECRET;
    process.env.DATABASE_URL = 'postgres://fake:fake@localhost:5432/fake';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.OPENROUTER_API_KEY = 'sk-fake';
    resetEnvCache();

    tenants = [];
    auditEntries = [];
    cases = [];

    const tenantStore = {
      async save(t: Tenant) { tenants.push(t); },
      async findById(id: string) { return tenants.find((t) => t.id === id) ?? null; },
      async findAll() { return tenants; },
      async update(id: string, u: Partial<Tenant>) {
        const t = tenants.find((t) => t.id === id);
        if (t) Object.assign(t, u);
        return t ?? null;
      },
      async delete(id: string) {
        const idx = tenants.findIndex((t) => t.id === id);
        if (idx >= 0) tenants.splice(idx, 1);
      },
    };

    const analyticsDataSource = {
      async getCasesByTenant(tenantId: string) {
        return cases.filter((c) => c.tenantId === tenantId);
      },
      async getMessagesByCases() { return [] as Message[]; },
      async getSnapshotsByTenant() { return [] as SupportContextSnapshot[]; },
    };

    const auditStore = {
      async findByTenant(tenantId: string, page: number, pageSize: number) {
        const filtered = auditEntries.filter((e) => e.tenantId === tenantId);
        const start = (page - 1) * pageSize;
        return { entries: filtered.slice(start, start + pageSize), total: filtered.length };
      },
      async purgeOlderThan() { return 0; },
    };

    const tenantService = createTenantService(tenantStore);
    const analyticsService = createAnalyticsService(analyticsDataSource);
    const auditService = createAuditService(auditStore);

    const adminAuth = async (request: FastifyRequest, reply: FastifyReply) => {
      const key = request.headers['x-admin-key'];
      if (key !== ADMIN_KEY) {
        reply.code(403).send({ error: 'FORBIDDEN', message: 'Invalid admin key' });
      }
    };

    app = await buildApp({
      jwtSecret: JWT_SECRET,
      adminRouteOpts: {
        tenantService,
        analyticsService,
        auditService,
        adminAuth,
        getCasesByTenant: async (tenantId) => cases.filter((c) => c.tenantId === tenantId),
      },
    });
  });

  beforeEach(() => {
    tenants.length = 0;
    auditEntries.length = 0;
    cases.length = 0;
  });

  afterAll(async () => {
    await app.close();
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('analytics endpoint scopes data to requested tenant', async () => {
    // Add cases for both tenants
    cases.push(
      { id: genId('cas'), tenantId: TENANT_A, userId: 'u1', status: 'resolved',
        snapshotId: '', createdAt: '', updatedAt: '', resolvedAt: '', messageCount: 1, feedback: null },
      { id: genId('cas'), tenantId: TENANT_A, userId: 'u2', status: 'active',
        snapshotId: '', createdAt: '', updatedAt: '', resolvedAt: null, messageCount: 1, feedback: null },
      { id: genId('cas'), tenantId: TENANT_B, userId: 'u3', status: 'resolved',
        snapshotId: '', createdAt: '', updatedAt: '', resolvedAt: '', messageCount: 1, feedback: null },
    );

    const resA = await app.inject({
      method: 'GET',
      url: `/api/admin/tenants/${TENANT_A}/analytics`,
      headers: { 'x-admin-key': ADMIN_KEY },
    });
    const analyticsA = JSON.parse(resA.body).analytics;

    const resB = await app.inject({
      method: 'GET',
      url: `/api/admin/tenants/${TENANT_B}/analytics`,
      headers: { 'x-admin-key': ADMIN_KEY },
    });
    const analyticsB = JSON.parse(resB.body).analytics;

    // Tenant A has 2 cases, Tenant B has 1
    expect(analyticsA.totalCases).toBe(2);
    expect(analyticsB.totalCases).toBe(1);
  });

  it('audit endpoint only returns entries for requested tenant', async () => {
    auditEntries.push(
      { id: 'aud_1', tenantId: TENANT_A, userId: 'u1', caseId: null, action: 'login',
        details: {}, createdAt: new Date().toISOString() },
      { id: 'aud_2', tenantId: TENANT_B, userId: 'u2', caseId: null, action: 'login',
        details: {}, createdAt: new Date().toISOString() },
      { id: 'aud_3', tenantId: TENANT_A, userId: 'u1', caseId: null, action: 'export',
        details: {}, createdAt: new Date().toISOString() },
    );

    const res = await app.inject({
      method: 'GET',
      url: `/api/admin/tenants/${TENANT_A}/audit`,
      headers: { 'x-admin-key': ADMIN_KEY },
    });

    const body = JSON.parse(res.body);
    expect(body.total).toBe(2);
    expect(body.entries.every((e: AuditEntry) => e.tenantId === TENANT_A)).toBe(true);
  });

  it('cases endpoint only returns cases for requested tenant', async () => {
    cases.push(
      { id: 'cas_a1', tenantId: TENANT_A, userId: 'u1', status: 'active',
        snapshotId: '', createdAt: '', updatedAt: '', resolvedAt: null, messageCount: 1, feedback: null },
      { id: 'cas_b1', tenantId: TENANT_B, userId: 'u2', status: 'active',
        snapshotId: '', createdAt: '', updatedAt: '', resolvedAt: null, messageCount: 1, feedback: null },
    );

    const res = await app.inject({
      method: 'GET',
      url: `/api/admin/tenants/${TENANT_A}/cases`,
      headers: { 'x-admin-key': ADMIN_KEY },
    });

    const body = JSON.parse(res.body);
    expect(body.cases).toHaveLength(1);
    expect(body.cases[0].id).toBe('cas_a1');
  });
});
