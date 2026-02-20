import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { buildApp } from '../../app.js';
import { setLogLevel, setLogsDir } from '../../shared/logger.js';
import { resetEnvCache } from '../../shared/env.js';
import { createInMemoryRateLimiter } from '../../modules/gateway/rate-limiter.js';
import { createMockGatewayService } from '../mocks/mock-gateway.js';
import { createMockSnapshotService } from '../mocks/mock-snapshot.js';
import { createContextService } from '../../modules/context/context.service.js';
import { createOrchestratorService } from '../../modules/orchestrator/orchestrator.service.js';
import { createMockOpenRouterServer } from '../mocks/openrouter.js';
import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const JWT_SECRET = 'test-secret-fullflow';
const TENANT_ID = 'ten_fullflow01';
const USER_ID = 'usr_fullflow01';

describe('Full Flow Integration', () => {
  let app: FastifyInstance;
  let tmpDir: string;
  let gateway: ReturnType<typeof createMockGatewayService>;
  let snapshotSvc: ReturnType<typeof createMockSnapshotService>;
  let mockLLM: ReturnType<typeof createMockOpenRouterServer>;
  let llmUrl: string;
  let token: string;
  let originalFetch: typeof globalThis.fetch;

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fullflow-test-'));
    setLogsDir(tmpDir);
    setLogLevel('low');
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.DATABASE_URL = 'postgres://fake:fake@localhost:5432/fake';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.OPENROUTER_API_KEY = 'sk-fake-test';
    resetEnvCache();

    mockLLM = createMockOpenRouterServer();
    llmUrl = await mockLLM.start();
    originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('openrouter.ai')) {
        return originalFetch(url.replace(/https?:\/\/openrouter\.ai/, llmUrl), init);
      }
      return originalFetch(input, init);
    };

    gateway = createMockGatewayService();
    snapshotSvc = createMockSnapshotService(gateway._cases);
    const orchestrator = createOrchestratorService({
      gatewayService: gateway, snapshotService: snapshotSvc,
      contextService: createContextService(), apiKey: 'sk-fake-test', modelPolicy: 'fast',
    });
    app = await buildApp({
      jwtSecret: JWT_SECRET, gatewayService: gateway,
      rateLimiter: createInMemoryRateLimiter(), snapshotService: snapshotSvc,
      orchestratorService: orchestrator,
    });
    token = app.jwt.sign({
      tenantId: TENANT_ID, userId: USER_ID,
      userEmail: 'user@fullflow.com', userRoles: ['user'], plan: 'pro',
    });
  });

  beforeEach(() => {
    gateway._cases.length = 0;
    gateway._messages.length = 0;
    gateway._audit.length = 0;
    snapshotSvc._snapshots.length = 0;
    mockLLM.calls.length = 0;
  });

  afterAll(async () => {
    globalThis.fetch = originalFetch;
    await app.close();
    mockLLM.server.close();
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  // Test 1: case → snapshot → sanitize → LLM → response with evidence
  it('full pipeline: case → snapshot → sanitize → LLM → response with evidence', async () => {
    // 1. Create case
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'my upload failed' },
    });
    expect(createRes.statusCode).toBe(200);
    const caseData = JSON.parse(createRes.body);
    const caseId = caseData.case.id;
    expect(caseId).toMatch(/^cas_/);

    // 2. Verify snapshot was generated
    expect(snapshotSvc._snapshots.length).toBe(1);
    const snap = snapshotSvc._snapshots[0];
    expect(snap.tenantId).toBe(TENANT_ID);
    expect(snap.data.productState.activeErrors.length).toBeGreaterThan(0);

    // 3. Send message to trigger LLM
    const msgRes = await app.inject({
      method: 'POST',
      url: `/api/cases/${caseId}/messages`,
      headers: { authorization: `Bearer ${token}` },
      payload: { content: 'my upload failed' },
    });
    expect(msgRes.statusCode).toBe(200);
    const msgBody = JSON.parse(msgRes.body);

    // 4. Verify LLM was called
    expect(mockLLM.calls.length).toBe(1);
    const llmReq = JSON.parse(mockLLM.calls[0].body);
    expect(llmReq.messages[0].role).toBe('system');
    expect(llmReq.messages[0].content).toContain('UPLOAD_TOO_LARGE');

    // 5. Verify AI response contains evidence and actions
    expect(msgBody.message.role).toBe('assistant');
    expect(msgBody.message.content).toContain('UPLOAD_TOO_LARGE');
    expect(msgBody.message.evidence.length).toBeGreaterThan(0);
    expect(msgBody.message.actions.length).toBeGreaterThan(0);

    // Verify evidence includes error code and job id
    const evidenceTypes = msgBody.message.evidence.map((e: { type: string }) => e.type);
    expect(evidenceTypes).toContain('error_code');
  });

  // Test 2: follow-up message includes conversation history
  it('follow-up message includes conversation history', async () => {
    // Create case + initial message
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'my upload failed' },
    });
    const caseId = JSON.parse(createRes.body).case.id;

    // First LLM message
    await app.inject({
      method: 'POST',
      url: `/api/cases/${caseId}/messages`,
      headers: { authorization: `Bearer ${token}` },
      payload: { content: 'my upload failed' },
    });

    // Follow-up message
    await app.inject({
      method: 'POST',
      url: `/api/cases/${caseId}/messages`,
      headers: { authorization: `Bearer ${token}` },
      payload: { content: 'how do I reduce the file size?' },
    });

    // Second LLM call should include prior messages
    expect(mockLLM.calls.length).toBe(2);
    const secondReq = JSON.parse(mockLLM.calls[1].body);

    // Should have system + initial user + assistant response + follow-up user
    // At minimum: system, user (original), user (first msg), assistant, user (follow-up)
    expect(secondReq.messages.length).toBeGreaterThanOrEqual(4);

    // Verify conversation context is present
    const userMessages = secondReq.messages.filter((m: { role: string }) => m.role === 'user');
    expect(userMessages.length).toBeGreaterThanOrEqual(2);
  });

  // Test 3: feedback updates case
  it('feedback updates case', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/cases',
      headers: { authorization: `Bearer ${token}` },
      payload: { message: 'test feedback' },
    });
    const caseId = JSON.parse(createRes.body).case.id;

    // Add positive feedback
    const fbRes = await app.inject({
      method: 'POST',
      url: `/api/cases/${caseId}/feedback`,
      headers: { authorization: `Bearer ${token}` },
      payload: { feedback: 'positive' },
    });
    expect(fbRes.statusCode).toBe(200);

    // Verify case reflects feedback
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/cases/${caseId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(JSON.parse(getRes.body).case.feedback).toBe('positive');
  });
});
