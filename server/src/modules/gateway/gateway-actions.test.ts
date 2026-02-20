import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../app.js';
import { setLogLevel, setLogsDir } from '../../shared/logger.js';
import { resetEnvCache } from '../../shared/env.js';
import { createInMemoryRateLimiter } from './rate-limiter.js';
import type { GatewayService } from './gateway.service.js';
import type { RateLimiter } from './rate-limiter.js';
import type { OrchestratorService } from '../orchestrator/orchestrator.service.js';
import type { FastifyInstance } from 'fastify';
import type { Case, Message, SuggestedAction } from '../../shared/types.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const JWT_SECRET = 'test-secret-actions';

function genId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

function createMockGatewayService(): GatewayService & { _cases: Case[] } {
  const _cases: Case[] = [];
  const _messages: Message[] = [];

  return {
    _cases,
    async createCase(tenantId, userId, firstMessage) {
      const caseId = genId('cas');
      const now = new Date().toISOString();
      const c: Case = {
        id: caseId, tenantId, userId, status: 'active',
        snapshotId: genId('scs'), createdAt: now, updatedAt: now,
        resolvedAt: null, messageCount: 1, feedback: null,
      };
      _cases.push(c);
      const msg: Message = {
        id: genId('msg'), caseId, role: 'user', content: firstMessage,
        actions: [], evidence: [], confidence: null, createdAt: now,
      };
      _messages.push(msg);
      return { case: c, message: msg };
    },
    async addMessage(caseId, role, content, opts) {
      const c = _cases.find((c) => c.id === caseId);
      if (!c) throw new NotFoundError('Case', caseId);
      const msg: Message = {
        id: genId('msg'), caseId, role, content,
        actions: opts?.actions ?? [], evidence: opts?.evidence ?? [],
        confidence: opts?.confidence ?? null, createdAt: new Date().toISOString(),
      };
      _messages.push(msg);
      return msg;
    },
    async getCase(caseId, tenantId) {
      const c = _cases.find((c) => c.id === caseId);
      if (!c) throw new NotFoundError('Case', caseId);
      if (c.tenantId !== tenantId) throw new ForbiddenError('Tenant isolation');
      return { case: c, messages: _messages.filter((m) => m.caseId === caseId) };
    },
    async addFeedback() {},
    async escalateCase() {},
    async logAudit() {},
  };
}

function createMockOrchestrator(svc: GatewayService): OrchestratorService {
  return {
    async handleMessage() {
      return {} as Message;
    },
    async handleAction(caseId, tenantId, action) {
      await svc.getCase(caseId, tenantId);
      return `Handled ${action.type}: ${action.label}`;
    },
  };
}

describe('Gateway Actions Route', () => {
  let app: FastifyInstance;
  let tmpDir: string;
  let service: ReturnType<typeof createMockGatewayService>;
  let rateLimiter: RateLimiter;
  let token: string;

  const TENANT_ID = 'ten_actiontest01';
  const USER_ID = 'usr_actionuser01';

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'actions-test-'));
    setLogsDir(tmpDir);
    setLogLevel('low');

    process.env.JWT_SECRET = JWT_SECRET;
    process.env.DATABASE_URL = 'postgres://fake:fake@localhost:5432/fake';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.OPENROUTER_API_KEY = 'sk-fake';
    resetEnvCache();

    service = createMockGatewayService();
    rateLimiter = createInMemoryRateLimiter();

    app = await buildApp({
      jwtSecret: JWT_SECRET,
      gatewayService: service,
      rateLimiter,
      orchestratorService: createMockOrchestrator(service),
    });

    token = app.jwt.sign({
      tenantId: TENANT_ID,
      userId: USER_ID,
      userEmail: 'test@example.com',
      userRoles: ['user'],
      plan: 'pro',
    });
  });

  beforeEach(() => {
    service._cases.length = 0;
  });

  afterAll(async () => {
    await app.close();
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('POST /api/cases/:caseId/actions returns result with orchestrator', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'Action test' },
    });
    const caseId = JSON.parse(createRes.body).case.id;

    const res = await app.inject({
      method: 'POST',
      url: `/api/cases/${caseId}/actions`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        action: { type: 'retry', label: 'Retry upload', payload: {} },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.result).toContain('Handled retry');
  });

  it('POST /api/cases/:caseId/actions returns 401 without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/cases/cas_fake/actions',
      payload: {
        action: { type: 'retry', label: 'Retry', payload: {} },
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/cases/:caseId/actions returns 400 for invalid body', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'Validation test' },
    });
    const caseId = JSON.parse(createRes.body).case.id;

    const res = await app.inject({
      method: 'POST',
      url: `/api/cases/${caseId}/actions`,
      headers: { authorization: `Bearer ${token}` },
      payload: { action: { type: 'invalid_type' } },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toBe('VALIDATION_ERROR');
  });

  it('POST /api/cases/:caseId/actions rejects cross-tenant', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'Cross tenant test' },
    });
    const caseId = JSON.parse(createRes.body).case.id;

    const otherToken = app.jwt.sign({
      tenantId: 'ten_other999',
      userId: 'usr_other999',
      userEmail: 'other@example.com',
      userRoles: ['user'],
      plan: 'starter',
    });

    const res = await app.inject({
      method: 'POST',
      url: `/api/cases/${caseId}/actions`,
      headers: { authorization: `Bearer ${otherToken}` },
      payload: {
        action: { type: 'retry', label: 'Retry', payload: {} },
      },
    });
    expect(res.statusCode).toBe(403);
  });
});
