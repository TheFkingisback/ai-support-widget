import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../app.js';
import { setLogLevel, setLogsDir } from '../../shared/logger.js';
import { resetEnvCache } from '../../shared/env.js';
import { createInMemoryRateLimiter } from './rate-limiter.js';
import { createMockGatewayService } from '../../tests/mocks/mock-gateway.js';
import type { FastifyInstance } from 'fastify';
import type { RateLimiter } from './rate-limiter.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const JWT_SECRET = 'test-secret-ratelimit';

describe('Message Rate Limit Boundary', () => {
  let app: FastifyInstance;
  let tmpDir: string;
  let gateway: ReturnType<typeof createMockGatewayService>;
  let rateLimiter: RateLimiter;
  let token: string;

  const TENANT_ID = 'ten_ratelim01';
  const USER_ID = 'usr_ratelim01';

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ratelim-test-'));
    setLogsDir(tmpDir);
    setLogLevel('off');

    process.env.JWT_SECRET = JWT_SECRET;
    process.env.DATABASE_URL = 'postgres://fake:fake@localhost:5432/fake';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.OPENROUTER_API_KEY = 'sk-fake';
    resetEnvCache();

    gateway = createMockGatewayService();
    rateLimiter = createInMemoryRateLimiter();

    app = await buildApp({
      jwtSecret: JWT_SECRET,
      gatewayService: gateway,
      rateLimiter,
    });

    token = app.jwt.sign({
      tenantId: TENANT_ID, userId: USER_ID,
      userEmail: 'test@example.com', userRoles: ['user'], plan: 'pro',
    });
  });

  beforeEach(() => {
    gateway._cases.length = 0;
    gateway._messages.length = 0;
    gateway._audit.length = 0;
    rateLimiter.reset();
  });

  afterAll(async () => {
    await app.close();
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('allows exactly 30 messages then rejects 31st with 429', async () => {
    // Create a case first
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'Rate limit test case' },
    });
    expect(createRes.statusCode).toBe(200);
    const caseId = JSON.parse(createRes.body).case.id;

    // Send exactly 30 messages (the limit per minute)
    for (let i = 0; i < 30; i++) {
      const res = await app.inject({
        method: 'POST',
        url: `/api/cases/${caseId}/messages`,
        headers: { authorization: `Bearer ${token}` },
        payload: { content: `Message ${i + 1}` },
      });
      expect(res.statusCode).toBe(200);
    }

    // The 31st should be rate limited
    const res = await app.inject({
      method: 'POST',
      url: `/api/cases/${caseId}/messages`,
      headers: { authorization: `Bearer ${token}` },
      payload: { content: 'Should be rate limited' },
    });

    expect(res.statusCode).toBe(429);
    expect(JSON.parse(res.body).error).toBe('RATE_LIMIT');
  });

  it('message rate limit is independent per tenant', async () => {
    // Create case for tenant A
    const createA = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'Tenant A case' },
    });
    const caseIdA = JSON.parse(createA.body).case.id;

    // Exhaust tenant A's message quota
    for (let i = 0; i < 30; i++) {
      await app.inject({
        method: 'POST',
        url: `/api/cases/${caseIdA}/messages`,
        headers: { authorization: `Bearer ${token}` },
        payload: { content: `A msg ${i}` },
      });
    }

    // Tenant B should still have quota
    const tokenB = app.jwt.sign({
      tenantId: 'ten_ratelimB01', userId: 'usr_ratelimB01',
      userEmail: 'b@example.com', userRoles: ['user'], plan: 'pro',
    });
    const createB = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { message: 'Tenant B case' },
    });
    const caseIdB = JSON.parse(createB.body).case.id;

    const res = await app.inject({
      method: 'POST',
      url: `/api/cases/${caseIdB}/messages`,
      headers: { authorization: `Bearer ${tokenB}` },
      payload: { content: 'B can still send' },
    });
    expect(res.statusCode).toBe(200);
  });
});
