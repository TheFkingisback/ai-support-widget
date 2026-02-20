import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../app.js';
import { setLogLevel, setLogsDir } from '../../shared/logger.js';
import { resetEnvCache } from '../../shared/env.js';
import { createInMemoryRateLimiter } from './rate-limiter.js';
import type { GatewayService } from './gateway.service.js';
import type { RateLimiter } from './rate-limiter.js';
import type { FastifyInstance } from 'fastify';
import type { Case, Message } from '../../shared/types.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const JWT_SECRET = 'test-secret-for-gateway';

function genId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

/**
 * In-memory mock of GatewayService that mirrors real DB behavior.
 */
function createMockGatewayService(): GatewayService & {
  _cases: Case[];
  _messages: Message[];
  _audit: Array<{
    tenantId: string;
    userId: string;
    caseId: string | null;
    action: string;
    details: Record<string, unknown>;
  }>;
} {
  const _cases: Case[] = [];
  const _messages: Message[] = [];
  const _audit: Array<{
    tenantId: string;
    userId: string;
    caseId: string | null;
    action: string;
    details: Record<string, unknown>;
  }> = [];

  return {
    _cases,
    _messages,
    _audit,

    async createCase(tenantId, userId, firstMessage) {
      const caseId = genId('cas');
      const snapshotId = genId('scs');
      const now = new Date().toISOString();

      const newCase: Case = {
        id: caseId,
        tenantId,
        userId,
        status: 'active',
        snapshotId,
        createdAt: now,
        updatedAt: now,
        resolvedAt: null,
        messageCount: 1,
        feedback: null,
      };
      _cases.push(newCase);

      const msgId = genId('msg');
      const msg: Message = {
        id: msgId,
        caseId,
        role: 'user',
        content: firstMessage,
        actions: [],
        evidence: [],
        confidence: null,
        createdAt: now,
      };
      _messages.push(msg);

      _audit.push({
        tenantId,
        userId,
        caseId,
        action: 'case_created',
        details: { firstMessage: firstMessage.slice(0, 100) },
      });

      return { case: newCase, message: msg };
    },

    async addMessage(caseId, role, content, opts) {
      const c = _cases.find((c) => c.id === caseId);
      if (!c) throw new NotFoundError('Case', caseId);

      const msgId = genId('msg');
      const now = new Date().toISOString();
      const msg: Message = {
        id: msgId,
        caseId,
        role,
        content,
        actions: opts?.actions ?? [],
        evidence: opts?.evidence ?? [],
        confidence: opts?.confidence ?? null,
        createdAt: now,
      };
      _messages.push(msg);
      c.messageCount += 1;
      c.updatedAt = now;

      return msg;
    },

    async getCase(caseId, tenantId) {
      const c = _cases.find((c) => c.id === caseId);
      if (!c) throw new NotFoundError('Case', caseId);
      if (c.tenantId !== tenantId) {
        throw new ForbiddenError(
          `Tenant ${tenantId} cannot access case ${caseId}`,
        );
      }

      const msgs = _messages
        .filter((m) => m.caseId === caseId)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );

      return { case: c, messages: msgs };
    },

    async addFeedback(caseId, tenantId, feedback) {
      const c = _cases.find((c) => c.id === caseId);
      if (!c) throw new NotFoundError('Case', caseId);
      if (c.tenantId !== tenantId) {
        throw new ForbiddenError(
          `Tenant ${tenantId} cannot access case ${caseId}`,
        );
      }
      c.feedback = feedback;
      c.updatedAt = new Date().toISOString();

      _audit.push({
        tenantId,
        userId: c.userId,
        caseId,
        action: 'feedback_added',
        details: { feedback },
      });
    },

    async escalateCase(caseId, tenantId, reason) {
      const c = _cases.find((c) => c.id === caseId);
      if (!c) throw new NotFoundError('Case', caseId);
      if (c.tenantId !== tenantId) {
        throw new ForbiddenError(
          `Tenant ${tenantId} cannot access case ${caseId}`,
        );
      }
      c.status = 'escalated';
      c.updatedAt = new Date().toISOString();

      _audit.push({
        tenantId,
        userId: c.userId,
        caseId,
        action: 'case_escalated',
        details: { reason: reason ?? 'No reason provided' },
      });
    },

    async logAudit(tenantId, userId, caseId, action, details) {
      _audit.push({ tenantId, userId, caseId, action, details });
    },
  };
}

describe('Gateway Module', () => {
  let app: FastifyInstance;
  let tmpDir: string;
  let service: ReturnType<typeof createMockGatewayService>;
  let rateLimiter: RateLimiter;
  let token: string;

  const TENANT_ID = 'ten_testgateway01';
  const USER_ID = 'usr_testuser01';

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gateway-test-'));
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
    service._messages.length = 0;
    service._audit.length = 0;
    rateLimiter.reset();
  });

  afterAll(async () => {
    await app.close();
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // Test 1: createCase returns case with correct tenantId and userId
  it('createCase returns case with correct tenantId and userId', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'My upload is failing' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.case.tenantId).toBe(TENANT_ID);
    expect(body.case.userId).toBe(USER_ID);
    expect(body.case.status).toBe('active');
    expect(body.snapshot.id).toBeDefined();
  });

  // Test 2: createCase generates cas_ prefixed ID
  it('createCase generates cas_ prefixed ID', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'Another issue' },
    });

    const body = JSON.parse(res.body);
    expect(body.case.id).toMatch(/^cas_/);
  });

  // Test 3: addMessage stores message with correct role and content
  it('addMessage stores message with correct role and content', async () => {
    // Create a case first
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'Initial message' },
    });
    const caseId = JSON.parse(createRes.body).case.id;

    // Add a message
    const res = await app.inject({
      method: 'POST',
      url: `/api/cases/${caseId}/messages`,
      headers: { authorization: `Bearer ${token}` },
      payload: { content: 'Follow-up question' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.message.role).toBe('user');
    expect(body.message.content).toBe('Follow-up question');
    expect(body.message.id).toMatch(/^msg_/);
  });

  // Test 4: getCase returns messages in chronological order
  it('getCase returns messages in chronological order', async () => {
    // Create a case
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'First message' },
    });
    const caseId = JSON.parse(createRes.body).case.id;

    // Add more messages
    await app.inject({
      method: 'POST',
      url: `/api/cases/${caseId}/messages`,
      headers: { authorization: `Bearer ${token}` },
      payload: { content: 'Second message' },
    });
    await app.inject({
      method: 'POST',
      url: `/api/cases/${caseId}/messages`,
      headers: { authorization: `Bearer ${token}` },
      payload: { content: 'Third message' },
    });

    // Get case
    const res = await app.inject({
      method: 'GET',
      url: `/api/cases/${caseId}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.messages).toHaveLength(3);
    expect(body.messages[0].content).toBe('First message');
    expect(body.messages[1].content).toBe('Second message');
    expect(body.messages[2].content).toBe('Third message');

    // Verify chronological order
    for (let i = 1; i < body.messages.length; i++) {
      const prev = new Date(body.messages[i - 1].createdAt).getTime();
      const curr = new Date(body.messages[i].createdAt).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  // Test 5: getCase rejects access from wrong tenantId (tenant isolation)
  it('getCase rejects access from wrong tenantId', async () => {
    // Create case under TENANT_ID
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'Tenant A case' },
    });
    const caseId = JSON.parse(createRes.body).case.id;

    // Sign a token for a different tenant
    const otherToken = app.jwt.sign({
      tenantId: 'ten_other999',
      userId: 'usr_other999',
      userEmail: 'other@example.com',
      userRoles: ['user'],
      plan: 'starter',
    });

    // Try to access with wrong tenant
    const res = await app.inject({
      method: 'GET',
      url: `/api/cases/${caseId}`,
      headers: { authorization: `Bearer ${otherToken}` },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('FORBIDDEN');
  });

  // Test 6: addFeedback updates case feedback field
  it('addFeedback updates case feedback field', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'Feedback test' },
    });
    const caseId = JSON.parse(createRes.body).case.id;

    const res = await app.inject({
      method: 'POST',
      url: `/api/cases/${caseId}/feedback`,
      headers: { authorization: `Bearer ${token}` },
      payload: { feedback: 'positive' },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).ok).toBe(true);

    // Verify feedback was stored
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/cases/${caseId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(JSON.parse(getRes.body).case.feedback).toBe('positive');
  });

  // Test 7: escalateCase changes status to 'escalated'
  it('escalateCase changes status to escalated', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'Escalation test' },
    });
    const caseId = JSON.parse(createRes.body).case.id;

    const res = await app.inject({
      method: 'POST',
      url: `/api/cases/${caseId}/escalate`,
      headers: { authorization: `Bearer ${token}` },
      payload: { reason: 'Need human help' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.ticketId).toBeDefined();
    expect(body.ticketUrl).toBeDefined();

    // Verify status changed
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/cases/${caseId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(JSON.parse(getRes.body).case.status).toBe('escalated');
  });

  // Test 8: Rate limiter returns 429 after limit exceeded
  it('rate limiter returns 429 after limit exceeded', async () => {
    // Create 10 cases (the limit per minute)
    for (let i = 0; i < 10; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/cases',
        headers: { authorization: `Bearer ${token}` },
        payload: { message: `Case number ${i + 1}` },
      });
      expect(res.statusCode).toBe(200);
    }

    // The 11th should be rate limited
    const res = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'Should be rate limited' },
    });

    expect(res.statusCode).toBe(429);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('RATE_LIMIT');
  });

  // Test 9: Audit log records case creation
  it('audit log records case creation', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'Audit test message' },
    });

    expect(service._audit.length).toBeGreaterThanOrEqual(1);
    const auditEntry = service._audit.find(
      (a) => a.action === 'case_created',
    );
    expect(auditEntry).toBeDefined();
    expect(auditEntry!.tenantId).toBe(TENANT_ID);
    expect(auditEntry!.userId).toBe(USER_ID);
    expect(auditEntry!.caseId).toMatch(/^cas_/);
  });

  // Test 10: POST /api/cases returns 401 without auth token
  it('POST /api/cases returns 401 without auth token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/cases',
      payload: { message: 'No auth' },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('UNAUTHORIZED');
  });
});
