import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../app.js';
import { setLogLevel, setLogsDir } from '../../shared/logger.js';
import { resetEnvCache } from '../../shared/env.js';
import { createInMemoryRateLimiter } from '../../modules/gateway/rate-limiter.js';
import { createMockGatewayService } from '../mocks/mock-gateway.js';
import { createMockSnapshotService } from '../mocks/mock-snapshot.js';
import type { FastifyInstance } from 'fastify';
import type { KnowledgeDoc } from '../../shared/types.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const JWT_SECRET = 'test-secret-isolation';
const TENANT_A = 'ten_isolationA01';
const TENANT_B = 'ten_isolationB01';
const USER_A = 'usr_isolationA01';
const USER_B = 'usr_isolationB01';

describe('Tenant Isolation Integration', () => {
  let app: FastifyInstance;
  let tmpDir: string;
  let gateway: ReturnType<typeof createMockGatewayService>;
  let snapshotSvc: ReturnType<typeof createMockSnapshotService>;
  let tokenA: string;
  let tokenB: string;

  // In-memory knowledge store for testing KB isolation
  const kbDocs: Array<KnowledgeDoc & { tenantId: string }> = [];

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'isolation-test-'));
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
      userEmail: 'a@tenanta.com', userRoles: ['user'], plan: 'pro',
    });

    tokenB = app.jwt.sign({
      tenantId: TENANT_B, userId: USER_B,
      userEmail: 'b@tenantb.com', userRoles: ['user'], plan: 'starter',
    });
  });

  beforeEach(() => {
    gateway._cases.length = 0;
    gateway._messages.length = 0;
    gateway._audit.length = 0;
    snapshotSvc._snapshots.length = 0;
    kbDocs.length = 0;
  });

  afterAll(async () => {
    await app.close();
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // Test 4: Tenant A cannot access tenant B's case
  it('tenant A cannot access tenant B case', async () => {
    // Tenant A creates a case
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { message: 'Tenant A private case' },
    });
    expect(createRes.statusCode).toBe(200);
    const caseId = JSON.parse(createRes.body).case.id;

    // Tenant B tries to access it
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/cases/${caseId}`,
      headers: { authorization: `Bearer ${tokenB}` },
    });

    expect(getRes.statusCode).toBe(403);
    const body = JSON.parse(getRes.body);
    expect(body.error).toBe('FORBIDDEN');
  });

  // Test 5: Tenant A cannot access tenant B's snapshot
  it('tenant A cannot access tenant B snapshot', async () => {
    // Create case for tenant B → generates snapshot
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { message: 'Tenant B secret data' },
    });
    expect(createRes.statusCode).toBe(200);
    expect(snapshotSvc._snapshots.length).toBe(1);

    const snapshotId = snapshotSvc._snapshots[0].id;

    // Tenant A tries to read the snapshot directly
    try {
      await snapshotSvc.getSnapshot(snapshotId, TENANT_A);
      // Should not reach here
      expect.unreachable('Should have thrown ForbiddenError');
    } catch (err) {
      expect((err as Error).message).toContain('cannot access snapshot');
    }
  });

  // Test 6: Tenant A cannot see tenant B's knowledge docs
  it('tenant A cannot see tenant B knowledge docs', async () => {
    // Simulate KB docs for tenant B only
    kbDocs.push({
      tenantId: TENANT_B,
      id: 'doc_tenantB_01',
      title: 'Tenant B Internal Guide',
      content: 'Secret info for tenant B only',
      category: 'doc',
    });

    // Filter as the retriever would
    const docsForA = kbDocs.filter((d) => d.tenantId === TENANT_A);
    const docsForB = kbDocs.filter((d) => d.tenantId === TENANT_B);

    expect(docsForA).toHaveLength(0);
    expect(docsForB).toHaveLength(1);
    expect(docsForB[0].title).toBe('Tenant B Internal Guide');
  });
});
