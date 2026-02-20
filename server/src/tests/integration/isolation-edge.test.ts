import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../app.js';
import { setLogLevel, setLogsDir } from '../../shared/logger.js';
import { resetEnvCache } from '../../shared/env.js';
import { createInMemoryRateLimiter } from '../../modules/gateway/rate-limiter.js';
import { createMockGatewayService } from '../mocks/mock-gateway.js';
import { createMockSnapshotService } from '../mocks/mock-snapshot.js';
import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const JWT_SECRET = 'test-secret-isolation-edge';
const TENANT_A = 'ten_isoEdgeA01';
const TENANT_B = 'ten_isoEdgeB01';
const USER_A = 'usr_isoEdgeA01';
const USER_B = 'usr_isoEdgeB01';

describe('Tenant Isolation Edge Cases', () => {
  let app: FastifyInstance;
  let tmpDir: string;
  let gateway: ReturnType<typeof createMockGatewayService>;
  let snapshotSvc: ReturnType<typeof createMockSnapshotService>;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'iso-edge-'));
    setLogsDir(tmpDir);
    setLogLevel('low');

    process.env.JWT_SECRET = JWT_SECRET;
    process.env.DATABASE_URL = 'postgres://fake:fake@localhost:5432/fake';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.OPENROUTER_API_KEY = 'sk-fake';
    resetEnvCache();

    gateway = createMockGatewayService();
    snapshotSvc = createMockSnapshotService();

    app = await buildApp({
      jwtSecret: JWT_SECRET,
      gatewayService: gateway,
      rateLimiter: createInMemoryRateLimiter(),
      snapshotService: snapshotSvc,
    });

    tokenA = app.jwt.sign({
      tenantId: TENANT_A, userId: USER_A,
      userEmail: 'a@a.com', userRoles: ['user'], plan: 'pro',
    });
    tokenB = app.jwt.sign({
      tenantId: TENANT_B, userId: USER_B,
      userEmail: 'b@b.com', userRoles: ['user'], plan: 'pro',
    });
  });

  beforeEach(() => {
    gateway._cases.length = 0;
    gateway._messages.length = 0;
    gateway._audit.length = 0;
    snapshotSvc._snapshots.length = 0;
  });

  afterAll(async () => {
    await app.close();
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('tenant B cannot add message to tenant A case', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { message: 'Tenant A case' },
    });
    const caseId = JSON.parse(createRes.body).case.id;

    const res = await app.inject({
      method: 'POST',
      url: `/api/cases/${caseId}/messages`,
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { content: 'Injected message from B' },
    });

    expect(res.statusCode).toBe(403);
  });

  it('tenant B cannot add feedback to tenant A case', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { message: 'Feedback isolation test' },
    });
    const caseId = JSON.parse(createRes.body).case.id;

    const res = await app.inject({
      method: 'POST',
      url: `/api/cases/${caseId}/feedback`,
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { feedback: 'positive' },
    });

    expect(res.statusCode).toBe(403);
  });

  it('tenant B cannot escalate tenant A case', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { message: 'Escalation isolation test' },
    });
    const caseId = JSON.parse(createRes.body).case.id;

    const res = await app.inject({
      method: 'POST',
      url: `/api/cases/${caseId}/escalate`,
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { reason: 'Trying to escalate from B' },
    });

    expect(res.statusCode).toBe(403);
  });

  it('accessing nonexistent case returns 404 not 403', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/cases/cas_doesnotexist',
      headers: { authorization: `Bearer ${tokenA}` },
    });

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).error).toBe('CASE_NOT_FOUND');
  });

  it('each tenant only sees their own cases in isolation', async () => {
    // Create cases for both tenants
    await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { message: 'A case 1' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { message: 'A case 2' },
    });
    await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { message: 'B case 1' },
    });

    // Verify counts in underlying store
    const casesA = gateway._cases.filter((c) => c.tenantId === TENANT_A);
    const casesB = gateway._cases.filter((c) => c.tenantId === TENANT_B);
    expect(casesA).toHaveLength(2);
    expect(casesB).toHaveLength(1);

    // Tenant B cannot access tenant A's cases
    for (const c of casesA) {
      const res = await app.inject({
        method: 'GET',
        url: `/api/cases/${c.id}`,
        headers: { authorization: `Bearer ${tokenB}` },
      });
      expect(res.statusCode).toBe(403);
    }
  });

  it('snapshot tenantId mismatch throws ForbiddenError', async () => {
    // Create case as tenant B → generates snapshot
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { message: 'Snapshot isolation' },
    });
    expect(createRes.statusCode).toBe(200);

    if (snapshotSvc._snapshots.length > 0) {
      const snapshotId = snapshotSvc._snapshots[0].id;
      await expect(
        snapshotSvc.getSnapshot(snapshotId, TENANT_A),
      ).rejects.toThrow(/cannot access snapshot/);
    }
  });
});
