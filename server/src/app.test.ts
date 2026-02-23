import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from './app.js';
import { setLogLevel, setLogsDir } from './shared/logger.js';
import { resetEnvCache } from './shared/env.js';
import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const JWT_SECRET = 'test-secret-for-vitest';

describe('App', () => {
  let app: FastifyInstance;
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-test-'));
    setLogsDir(tmpDir);
    setLogLevel('low');

    process.env.JWT_SECRET = JWT_SECRET;
    process.env.DATABASE_URL = 'postgres://fake:fake@localhost:5432/fake';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.OPENROUTER_API_KEY = 'sk-fake';
    resetEnvCache();

    app = await buildApp({ jwtSecret: JWT_SECRET });

    // Register a protected test route BEFORE any inject calls
    app.get(
      '/api/test-auth',
      { preHandler: [app.authenticate] },
      async (request) => {
        return { tenantId: request.authPayload.tenantId };
      },
    );
  });

  afterAll(async () => {
    await app.close();
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('health check returns version (503 without real DB/Redis)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/health',
    });
    // 503 expected in test — no real DB/Redis
    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(false);
    expect(body.version).toBe('0.1.0');
  });

  it('auth middleware rejects invalid JWT with 401', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/test-auth',
      headers: {
        authorization: 'Bearer invalid.token.here',
      },
    });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('UNAUTHORIZED');
  });

  it('auth middleware extracts tenantId from valid JWT', async () => {
    const token = app.jwt.sign({
      tenantId: 'ten_test123',
      userId: 'usr_test456',
      userEmail: 'test@example.com',
      userRoles: ['user'],
      plan: 'pro',
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/test-auth',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.tenantId).toBe('ten_test123');
  });
});
