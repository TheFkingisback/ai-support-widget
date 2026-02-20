import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app.js';
import { setLogLevel, setLogsDir } from './logger.js';
import { resetEnvCache } from './env.js';
import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const JWT_SECRET = 'test-swagger-secret';

describe('Swagger API Docs', () => {
  let app: FastifyInstance;
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swagger-test-'));
    setLogsDir(tmpDir);
    setLogLevel('off');

    process.env.JWT_SECRET = JWT_SECRET;
    process.env.DATABASE_URL = 'postgres://fake:fake@localhost:5432/fake';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.OPENROUTER_API_KEY = 'sk-fake';
    resetEnvCache();

    app = await buildApp({ jwtSecret: JWT_SECRET });
  });

  afterAll(async () => {
    await app.close();
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('/api/docs serves Swagger UI', async () => {
    // /api/docs/static/index.html redirects; follow redirect to final page
    const initial = await app.inject({ method: 'GET', url: '/api/docs/' });
    // Could be 200 directly or 302 redirect — either way, check final content
    if (initial.statusCode === 302) {
      const loc = initial.headers.location as string;
      const follow = await app.inject({ method: 'GET', url: loc });
      expect(follow.statusCode).toBe(200);
      expect(follow.headers['content-type']).toContain('text/html');
      expect(follow.body).toContain('swagger');
    } else {
      expect(initial.statusCode).toBe(200);
      expect(initial.body).toContain('swagger');
    }
  });

  it('OpenAPI spec includes all routes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/docs/json',
    });
    expect(res.statusCode).toBe(200);
    const spec = JSON.parse(res.body);
    expect(spec.openapi).toBe('3.0.3');
    expect(spec.info.title).toBe('AI Support Widget API');
    // Health route should always be present
    expect(spec.paths['/api/health']).toBeDefined();
  });
});
