import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../app.js';
import { setLogLevel, setLogsDir } from '../../shared/logger.js';
import { resetEnvCache } from '../../shared/env.js';
import { createInMemoryRateLimiter } from '../../modules/gateway/rate-limiter.js';
import { createMockGatewayService } from '../mocks/mock-gateway.js';
import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const JWT_SECRET = 'test-secret-concurrent';

describe('Concurrent Tenant Operations', () => {
  let app: FastifyInstance;
  let tmpDir: string;
  let gateway: ReturnType<typeof createMockGatewayService>;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'concurrent-test-'));
    setLogsDir(tmpDir);
    setLogLevel('off');

    process.env.JWT_SECRET = JWT_SECRET;
    process.env.DATABASE_URL = 'postgres://fake:fake@localhost:5432/fake';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.OPENROUTER_API_KEY = 'sk-fake';
    resetEnvCache();

    gateway = createMockGatewayService();

    app = await buildApp({
      jwtSecret: JWT_SECRET,
      gatewayService: gateway,
      rateLimiter: createInMemoryRateLimiter(),
    });
  });

  beforeEach(() => {
    gateway._cases.length = 0;
    gateway._messages.length = 0;
    gateway._audit.length = 0;
  });

  afterAll(async () => {
    await app.close();
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('two tenants creating cases simultaneously do not interfere', async () => {
    const tokenA = app.jwt.sign({
      tenantId: 'ten_concA', userId: 'usr_concA',
      userEmail: 'a@conc.com', userRoles: ['user'], plan: 'pro',
    });
    const tokenB = app.jwt.sign({
      tenantId: 'ten_concB', userId: 'usr_concB',
      userEmail: 'b@conc.com', userRoles: ['user'], plan: 'pro',
    });

    // Fire both concurrently
    const [resA, resB] = await Promise.all([
      app.inject({
        method: 'POST', url: '/api/cases',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: { message: 'Tenant A concurrent case' },
      }),
      app.inject({
        method: 'POST', url: '/api/cases',
        headers: { authorization: `Bearer ${tokenB}` },
        payload: { message: 'Tenant B concurrent case' },
      }),
    ]);

    expect(resA.statusCode).toBe(200);
    expect(resB.statusCode).toBe(200);

    const bodyA = JSON.parse(resA.body);
    const bodyB = JSON.parse(resB.body);

    // Each case belongs to the correct tenant
    expect(bodyA.case.tenantId).toBe('ten_concA');
    expect(bodyB.case.tenantId).toBe('ten_concB');

    // IDs are distinct
    expect(bodyA.case.id).not.toBe(bodyB.case.id);

    // Both cases exist in the store
    expect(gateway._cases).toHaveLength(2);
  });

  it('concurrent messages from different tenants preserve isolation', async () => {
    const tokenA = app.jwt.sign({
      tenantId: 'ten_concA2', userId: 'usr_concA2',
      userEmail: 'a@conc.com', userRoles: ['user'], plan: 'pro',
    });
    const tokenB = app.jwt.sign({
      tenantId: 'ten_concB2', userId: 'usr_concB2',
      userEmail: 'b@conc.com', userRoles: ['user'], plan: 'pro',
    });

    // Create cases for each
    const createA = await app.inject({
      method: 'POST', url: '/api/cases',
      headers: { authorization: `Bearer ${tokenA}` },
      payload: { message: 'A base case' },
    });
    const createB = await app.inject({
      method: 'POST', url: '/api/cases',
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { message: 'B base case' },
    });
    const caseA = JSON.parse(createA.body).case.id;
    const caseB = JSON.parse(createB.body).case.id;

    // Send messages concurrently
    const [msgA, msgB] = await Promise.all([
      app.inject({
        method: 'POST', url: `/api/cases/${caseA}/messages`,
        headers: { authorization: `Bearer ${tokenA}` },
        payload: { content: 'A follow-up' },
      }),
      app.inject({
        method: 'POST', url: `/api/cases/${caseB}/messages`,
        headers: { authorization: `Bearer ${tokenB}` },
        payload: { content: 'B follow-up' },
      }),
    ]);

    expect(msgA.statusCode).toBe(200);
    expect(msgB.statusCode).toBe(200);

    // Verify messages went to correct cases
    expect(JSON.parse(msgA.body).message.caseId).toBe(caseA);
    expect(JSON.parse(msgB.body).message.caseId).toBe(caseB);
  });
});
