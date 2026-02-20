import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../app.js';
import { setLogLevel, setLogsDir } from '../../shared/logger.js';
import { resetEnvCache } from '../../shared/env.js';
import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const JWT_SECRET = 'test-secret-security';
const TENANT = 'ten_sec01';
const USER = 'usr_sec01';

describe('Security Headers & JWT MaxAge', () => {
  let app: FastifyInstance;
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'security-test-'));
    setLogsDir(tmpDir);
    setLogLevel('off');

    process.env.JWT_SECRET = JWT_SECRET;
    process.env.DATABASE_URL = 'postgres://fake:fake@localhost:5432/fake';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.OPENROUTER_API_KEY = 'sk-fake';
    delete process.env.JWT_MAX_AGE;
    resetEnvCache();

    app = await buildApp({ jwtSecret: JWT_SECRET });

    // Register a test-only authenticated route
    app.get('/api/test-auth', { preHandler: [app.authenticate] }, async () => {
      return { ok: true };
    });
  });

  afterAll(async () => {
    await app.close();
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('sets X-Content-Type-Options: nosniff', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets X-Frame-Options header', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('sets Content-Security-Policy header', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('removes X-Powered-By header', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('rejects JWT token older than maxAge (default 8h)', async () => {
    // Sign a token with iat 24 hours ago embedded in the payload
    const iatPast = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
    const oldToken = app.jwt.sign(
      { tenantId: TENANT, userId: USER, userEmail: 'a@test.com', userRoles: ['user'], plan: 'pro', iat: iatPast },
    );

    const res = await app.inject({
      method: 'GET',
      url: '/api/test-auth',
      headers: { authorization: `Bearer ${oldToken}` },
    });

    expect(res.statusCode).toBe(401);
  });

  it('accepts a fresh JWT token', async () => {
    const freshToken = app.jwt.sign({
      tenantId: TENANT,
      userId: USER,
      userEmail: 'a@test.com',
      userRoles: ['user'],
      plan: 'pro',
    });

    const res = await app.inject({
      method: 'GET',
      url: '/api/test-auth',
      headers: { authorization: `Bearer ${freshToken}` },
    });

    expect(res.statusCode).toBe(200);
  });

  it('enforces bodyLimit on Fastify instance', () => {
    // Verify the bodyLimit was set on the server
    const limit = (app.server as unknown as Record<string, unknown>).maxRequestBodySize;
    // Fastify stores bodyLimit internally — verify via initialConfig
    const initialConfig = app.initialConfig;
    expect(initialConfig.bodyLimit).toBe(1_048_576);
  });
});
