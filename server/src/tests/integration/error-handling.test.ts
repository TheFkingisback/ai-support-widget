import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../app.js';
import { setLogLevel, setLogsDir } from '../../shared/logger.js';
import { resetEnvCache } from '../../shared/env.js';
import { createInMemoryRateLimiter } from '../../modules/gateway/rate-limiter.js';
import { createMockGatewayService } from '../mocks/mock-gateway.js';
import type { FastifyInstance } from 'fastify';
import type { RateLimiter } from '../../modules/gateway/rate-limiter.js';
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  RateLimitError,
  LLMError,
  ConflictError,
} from '../../shared/errors.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const JWT_SECRET = 'test-secret-error-edge';

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'error-edge-'));
  setLogsDir(tmpDir);
  setLogLevel('low');

  process.env.JWT_SECRET = JWT_SECRET;
  process.env.DATABASE_URL = 'postgres://fake:fake@localhost:5432/fake';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.OPENROUTER_API_KEY = 'sk-fake';
  resetEnvCache();
});

afterAll(() => {
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ==================== Error Class Edge Cases ====================

describe('Error class edge cases', () => {
  it('AppError is instanceof Error', () => {
    const err = new AppError(500, 'TEST_ERROR', 'Test');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.name).toBe('AppError');
  });

  it('AppError preserves custom errorClass', () => {
    const err = new AppError(500, 'INFRA_DOWN', 'DB gone', 'infrastructure');
    expect(err.errorClass).toBe('infrastructure');
  });

  it('LLMError returns 502 and integration class', () => {
    const err = new LLMError('Model unavailable');
    expect(err.statusCode).toBe(502);
    expect(err.errorCode).toBe('LLM_API_ERROR');
    expect(err.errorClass).toBe('integration');
    expect(err.name).toBe('LLMError');
  });

  it('NotFoundError constructs errorCode from resource name', () => {
    const err = new NotFoundError('Snapshot', 'scs_123');
    expect(err.errorCode).toBe('SNAPSHOT_NOT_FOUND');
    expect(err.message).toBe('Snapshot scs_123 not found');
    expect(err.statusCode).toBe(404);
  });

  it('ValidationError preserves field property', () => {
    const err = new ValidationError('must be positive', 'amount');
    expect(err.field).toBe('amount');
    expect(err.statusCode).toBe(400);
  });

  it('ValidationError works without field', () => {
    const err = new ValidationError('Invalid input');
    expect(err.field).toBeUndefined();
    expect(err.statusCode).toBe(400);
  });

  it('ConflictError accepts custom errorCode', () => {
    const err = new ConflictError('Already subscribed', 'SUBSCRIPTION_EXISTS');
    expect(err.errorCode).toBe('SUBSCRIPTION_EXISTS');
    expect(err.statusCode).toBe(409);
  });

  it('ConflictError defaults to CONFLICT errorCode', () => {
    const err = new ConflictError('Duplicate entry');
    expect(err.errorCode).toBe('CONFLICT');
  });

  it('ForbiddenError defaults to FORBIDDEN', () => {
    const err = new ForbiddenError();
    expect(err.message).toBe('Forbidden');
    expect(err.errorCode).toBe('FORBIDDEN');
  });

  it('UnauthorizedError defaults to Unauthorized', () => {
    const err = new UnauthorizedError();
    expect(err.message).toBe('Unauthorized');
  });

  it('error subclasses have proper prototype chain', () => {
    const errors = [
      new NotFoundError('X', '1'),
      new UnauthorizedError(),
      new ForbiddenError(),
      new ValidationError('x'),
      new RateLimitError(),
      new LLMError('x'),
      new ConflictError('x'),
    ];

    for (const err of errors) {
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(Error);
    }
  });
});

// ==================== HTTP Error Response Edge Cases ====================

describe('HTTP error response format', () => {
  let app: FastifyInstance;
  let gateway: ReturnType<typeof createMockGatewayService>;
  let rateLimiter: RateLimiter;
  let token: string;

  beforeAll(async () => {
    gateway = createMockGatewayService();
    rateLimiter = createInMemoryRateLimiter();

    app = await buildApp({
      jwtSecret: JWT_SECRET,
      gatewayService: gateway,
      rateLimiter,
    });

    token = app.jwt.sign({
      tenantId: 'ten_errtestA',
      userId: 'usr_errtestA',
      userEmail: 'err@test.com',
      userRoles: ['user'],
      plan: 'pro',
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
  });

  it('returns proper JSON error structure for 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/cases/cas_nonexistent',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('statusCode', 404);
    expect(body).toHaveProperty('error', 'CASE_NOT_FOUND');
    expect(body).toHaveProperty('message');
    expect(body).toHaveProperty('requestId');
  });

  it('returns proper JSON error for 401 (no token)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/cases/cas_any',
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty('error', 'UNAUTHORIZED');
  });

  it('returns proper JSON error for 401 (invalid token)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/cases/cas_any',
      headers: { authorization: 'Bearer invalid.token.here' },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('UNAUTHORIZED');
  });

  it('returns 400 for empty message body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: '' },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for missing message field', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });

    expect(res.statusCode).toBe(400);
  });

  it('returns 400 for oversized message (>5000 chars)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'x'.repeat(5001) },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid feedback value', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'Feedback validation' },
    });
    const caseId = JSON.parse(createRes.body).case.id;

    const res = await app.inject({
      method: 'POST',
      url: `/api/cases/${caseId}/feedback`,
      headers: { authorization: `Bearer ${token}` },
      payload: { feedback: 'neutral' },
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('VALIDATION_ERROR');
  });

  it('429 response includes error details', async () => {
    for (let i = 0; i < 10; i++) {
      await app.inject({
        method: 'POST',
        url: '/api/cases',
        headers: { authorization: `Bearer ${token}` },
        payload: { message: `Rate limit ${i}` },
      });
    }

    const res = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'Rate limited' },
    });

    expect(res.statusCode).toBe(429);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('RATE_LIMIT');
    expect(body.message).toContain('Rate limit exceeded');
    expect(body.requestId).toBeDefined();
  });

  it('health check accessible without auth (503 without real DB/Redis)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    // 503 expected in test — no real DB/Redis
    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.body);
    expect(body.ok).toBe(false);
    expect(body.version).toBeDefined();
  });

  it('unknown route returns 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/nonexistent',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(404);
  });
});
