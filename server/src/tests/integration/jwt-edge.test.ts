import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import { setLogLevel, setLogsDir } from '../../shared/logger.js';
import { resetEnvCache } from '../../shared/env.js';
import { createInMemoryRateLimiter } from '../../modules/gateway/rate-limiter.js';
import { createMockGatewayService } from '../mocks/mock-gateway.js';
import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const JWT_SECRET = 'test-secret-jwt-edge';

describe('Malformed JWT Edge Cases', () => {
  let app: FastifyInstance;
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jwt-edge-'));
    setLogsDir(tmpDir);
    setLogLevel('off');

    process.env.JWT_SECRET = JWT_SECRET;
    process.env.DATABASE_URL = 'postgres://fake:fake@localhost:5432/fake';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.OPENROUTER_API_KEY = 'sk-fake';
    resetEnvCache();

    app = await buildApp({
      jwtSecret: JWT_SECRET,
      gatewayService: createMockGatewayService(),
      rateLimiter: createInMemoryRateLimiter(),
    });
  });

  afterAll(async () => {
    await app.close();
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('JWT with missing tenantId is handled gracefully', async () => {
    const token = app.jwt.sign({
      userId: 'usr_noTenant',
      userEmail: 'noTenant@example.com',
      userRoles: ['user'],
      plan: 'pro',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'No tenant in JWT' },
    });

    // Should still process (tenantId will be undefined in the case)
    // The key thing is it doesn't crash the server
    expect([200, 400, 401]).toContain(res.statusCode);
  });

  it('JWT with missing userId is handled gracefully', async () => {
    const token = app.jwt.sign({
      tenantId: 'ten_noUser',
      userEmail: 'noUser@example.com',
      userRoles: ['user'],
      plan: 'pro',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'No userId in JWT' },
    });

    expect([200, 400, 401]).toContain(res.statusCode);
  });

  it('JWT with empty payload is handled gracefully', async () => {
    const token = app.jwt.sign({});

    const res = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'Empty JWT payload' },
    });

    expect([200, 400, 401]).toContain(res.statusCode);
  });

  it('completely invalid JWT string returns 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: 'Bearer not.a.valid.jwt' },
      payload: { message: 'Invalid JWT' },
    });

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).error).toBe('UNAUTHORIZED');
  });

  it('JWT signed with wrong secret returns 401', async () => {
    // Build a separate app instance to sign with a different secret
    const wrongToken = app.jwt.sign(
      { tenantId: 'ten_wrong', userId: 'usr_wrong' },
    );
    // Tamper with the signature by changing last chars
    const tampered = wrongToken.slice(0, -4) + 'xxxx';

    const res = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${tampered}` },
      payload: { message: 'Tampered JWT' },
    });

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).error).toBe('UNAUTHORIZED');
  });
});
