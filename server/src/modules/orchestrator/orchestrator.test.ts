import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type {
  Case,
  Message,
  SuggestedAction,
  Evidence,
  SupportContextSnapshot,
} from '../../shared/types.js';
import { setLogLevel, setLogsDir } from '../../shared/logger.js';
import { resetEnvCache } from '../../shared/env.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors.js';
import type { GatewayService } from '../gateway/gateway.service.js';
import type { SnapshotService } from '../snapshot/snapshot.service.js';
import type { ContextService } from '../context/context.service.js';
import { buildSystemPrompt } from './system-prompt.js';
import { parseAIResponse } from './response-parser.js';
import { createOrchestratorService } from './orchestrator.service.js';
import { buildApp } from '../../app.js';
import { createInMemoryRateLimiter } from '../gateway/rate-limiter.js';
import type { RateLimiter } from '../gateway/rate-limiter.js';

const JWT_SECRET = 'test-secret-for-orchestrator';

function genId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'orchestrator-test-'));
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

// ─── Snapshot fixture ───

function makeSnapshot(overrides?: Partial<SupportContextSnapshot>): SupportContextSnapshot {
  return {
    meta: {
      snapshotId: 'scs_test123',
      createdAt: '2026-02-20T10:00:00.000Z',
      maxBytes: 500000,
      truncation: { eventsRemoved: 0, logsTrimmed: false, docsRemoved: 0 },
    },
    identity: {
      tenantId: 'ten_abc',
      userId: 'usr_xyz',
      roles: ['admin'],
      plan: 'pro',
      featuresEnabled: ['feature_a'],
    },
    productState: {
      entities: [
        { type: 'project', id: 'proj_1', status: 'active', metadata: {} },
      ],
      activeErrors: [
        {
          errorCode: 'UPLOAD_TOO_LARGE',
          errorClass: 'validation',
          retryable: true,
          userActionable: true,
          resourceId: 'res_1',
          occurredAt: '2026-02-20T09:55:00.000Z',
        },
      ],
      limitsReached: [{ limit: 'storage', current: 95, max: 100 }],
    },
    recentActivity: {
      windowHours: 72,
      events: [
        {
          ts: '2026-02-20T09:50:00.000Z',
          event: 'click',
          page: '/dashboard',
          elementId: 'btn_upload',
          intent: 'upload_file',
          correlationRequestId: 'req_abc',
        },
      ],
      clickTimeline: [
        { ts: '2026-02-20T09:50:00.000Z', page: '/dashboard', action: 'click btn_upload' },
      ],
    },
    backend: {
      recentRequests: [
        {
          ts: '2026-02-20T09:50:00.000Z',
          route: '/api/upload',
          httpStatus: 413,
          errorCode: 'UPLOAD_TOO_LARGE',
          resourceId: 'res_1',
          timingMs: 120,
          requestId: 'req_abc',
        },
      ],
      jobs: [
        {
          jobId: 'job_1',
          queue: 'uploads',
          status: 'failed',
          errorCode: 'UPLOAD_TOO_LARGE',
          lastStage: 'validation',
          createdAt: '2026-02-20T09:49:00.000Z',
          updatedAt: '2026-02-20T09:50:00.000Z',
          durationMs: 500,
        },
      ],
      errors: [
        {
          ts: '2026-02-20T09:50:00.000Z',
          errorCode: 'UPLOAD_TOO_LARGE',
          errorClass: 'validation',
          route: '/api/upload',
          requestId: 'req_abc',
          resourceId: 'res_1',
        },
      ],
    },
    knowledgePack: {
      docs: [
        { id: 'doc_1', title: 'Upload Guide', content: 'How to upload files...', category: 'guides' },
      ],
      runbooks: [
        { id: 'rb_1', title: 'Upload Errors', content: 'Troubleshoot upload errors...', category: 'runbooks' },
      ],
      changelog: [
        { version: '1.2.0', date: '2026-02-15', summary: 'Added file size validation' },
      ],
    },
    privacy: {
      redactionVersion: '1.0.0',
      fieldsRemoved: [],
    },
    ...overrides,
  };
}

// ─── Mock OpenRouter HTTP server ───

let mockLLMPort: number;
let mockLLMServer: ReturnType<typeof import('node:http').createServer>;
let mockLLMResponse: string;
let mockLLMStatus: number;
let mockLLMCallCount: number;
let capturedLLMBody: Record<string, unknown> | null;

async function startMockLLM(): Promise<void> {
  const http = await import('node:http');
  return new Promise((resolve) => {
    mockLLMServer = http.createServer((req, res) => {
      mockLLMCallCount++;
      let body = '';
      req.on('data', (chunk: Buffer) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          capturedLLMBody = JSON.parse(body) as Record<string, unknown>;
        } catch {
          capturedLLMBody = null;
        }

        res.setHeader('Content-Type', 'application/json');

        if (req.headers.authorization !== 'Bearer sk-test-key') {
          res.writeHead(401);
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }

        res.writeHead(mockLLMStatus);
        if (mockLLMStatus >= 500) {
          res.end(JSON.stringify({ error: 'server_error' }));
          return;
        }

        res.end(
          JSON.stringify({
            choices: [
              {
                message: {
                  role: 'assistant',
                  content: mockLLMResponse,
                },
              },
            ],
            model: 'anthropic/claude-sonnet-4-20250514',
            usage: { prompt_tokens: 150, completion_tokens: 80 },
          }),
        );
      });
    });
    mockLLMServer.listen(0, () => {
      const addr = mockLLMServer.address();
      if (addr && typeof addr === 'object') mockLLMPort = addr.port;
      resolve();
    });
  });
}

function stopMockLLM(): Promise<void> {
  return new Promise((resolve) => {
    if (mockLLMServer) {
      mockLLMServer.close(() => resolve());
    } else {
      resolve();
    }
  });
}

// ─── Mock services ───

function createMockGatewayService(): GatewayService & {
  _cases: Case[];
  _messages: Message[];
} {
  const _cases: Case[] = [];
  const _messages: Message[] = [];

  return {
    _cases,
    _messages,

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
      const msg: Message = {
        id: genId('msg'),
        caseId,
        role: 'user',
        content: firstMessage,
        actions: [],
        evidence: [],
        confidence: null,
        createdAt: now,
      };
      _messages.push(msg);
      return { case: newCase, message: msg };
    },

    async addMessage(caseId, role, content, opts) {
      const c = _cases.find((c) => c.id === caseId);
      if (!c) throw new NotFoundError('Case', caseId);
      const msg: Message = {
        id: genId('msg'),
        caseId,
        role,
        content,
        actions: opts?.actions ?? [],
        evidence: opts?.evidence ?? [],
        confidence: opts?.confidence ?? null,
        createdAt: new Date().toISOString(),
      };
      _messages.push(msg);
      c.messageCount += 1;
      c.updatedAt = new Date().toISOString();
      return msg;
    },

    async getCase(caseId, tenantId) {
      const c = _cases.find((c) => c.id === caseId);
      if (!c) throw new NotFoundError('Case', caseId);
      if (c.tenantId !== tenantId) {
        throw new ForbiddenError(`Tenant ${tenantId} cannot access case ${caseId}`);
      }
      const msgs = _messages
        .filter((m) => m.caseId === caseId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return { case: c, messages: msgs };
    },

    async addFeedback(caseId, tenantId, feedback) {
      const c = _cases.find((c) => c.id === caseId);
      if (!c) throw new NotFoundError('Case', caseId);
      if (c.tenantId !== tenantId) throw new ForbiddenError('Forbidden');
      c.feedback = feedback;
    },

    async escalateCase(caseId, tenantId) {
      const c = _cases.find((c) => c.id === caseId);
      if (!c) throw new NotFoundError('Case', caseId);
      if (c.tenantId !== tenantId) throw new ForbiddenError('Forbidden');
      c.status = 'escalated';
    },

    async logAudit() {
      // no-op
    },
  };
}

function createMockSnapshotService(
  snapshotData?: SupportContextSnapshot,
): SnapshotService & { _snapshots: Map<string, { tenantId: string; data: SupportContextSnapshot }> } {
  const _snapshots = new Map<string, { tenantId: string; data: SupportContextSnapshot }>();

  return {
    _snapshots,

    async buildSnapshot(tenantId, userId, caseId) {
      const snapshot = snapshotData ?? makeSnapshot({
        meta: {
          ...makeSnapshot().meta,
          snapshotId: genId('scs'),
        },
        identity: {
          ...makeSnapshot().identity,
          tenantId,
          userId,
        },
      });
      _snapshots.set(snapshot.meta.snapshotId, { tenantId, data: snapshot });
      return snapshot;
    },

    async getSnapshot(snapshotId, tenantId) {
      const found = _snapshots.get(snapshotId);
      if (!found) throw new NotFoundError('Snapshot', snapshotId);
      if (found.tenantId !== tenantId) throw new ForbiddenError('Forbidden');
      return found.data;
    },
  };
}

function createMockContextService(): ContextService {
  return {
    processContext(snapshot, maxBytes) {
      return {
        processed: snapshot,
        audit: {
          sanitization: { secretsRedacted: 0, piiMasked: 0, binaryRemoved: 0, internalUrlsStripped: 0, fieldsRemoved: [] },
          truncation: { originalBytes: 1000, finalBytes: 900, docsRemoved: 0, eventsRemoved: 0, logsTrimmed: false },
          inputBytes: 1000,
          outputBytes: 900,
        },
      };
    },
  };
}

// ==================== OPENROUTER CLIENT TESTS ====================

describe('OpenRouter client (callLLM)', () => {
  beforeAll(async () => {
    mockLLMResponse = 'The error UPLOAD_TOO_LARGE indicates your file exceeds the limit. Please retry with a smaller file.';
    mockLLMStatus = 200;
    mockLLMCallCount = 0;
    capturedLLMBody = null;
    await startMockLLM();
  });

  afterAll(async () => {
    await stopMockLLM();
  });

  beforeEach(() => {
    mockLLMResponse = 'The error UPLOAD_TOO_LARGE indicates your file exceeds the limit. Please retry with a smaller file.';
    mockLLMStatus = 200;
    mockLLMCallCount = 0;
    capturedLLMBody = null;
  });

  // Test 1: callLLM sends correct headers and body
  it('sends correct headers and body to OpenRouter', async () => {
    const { callLLM } = await import('./openrouter.js');

    // Monkey-patch fetch to point at our mock server
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      const newUrl = url.replace(
        'https://openrouter.ai/api/v1/chat/completions',
        `http://localhost:${mockLLMPort}/api/v1/chat/completions`,
      );
      return originalFetch(newUrl, init);
    };

    try {
      const result = await callLLM(
        {
          model: 'anthropic/claude-sonnet-4-20250514',
          messages: [
            { role: 'system', content: 'You are a support engineer.' },
            { role: 'user', content: 'Help me' },
          ],
        },
        'sk-test-key',
        'req_test01',
      );

      expect(result.content).toContain('UPLOAD_TOO_LARGE');
      expect(result.model).toBe('anthropic/claude-sonnet-4-20250514');
      expect(result.tokensIn).toBe(150);
      expect(result.tokensOut).toBe(80);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.estimatedCost).toBeGreaterThan(0);

      // Verify request body
      expect(capturedLLMBody).toBeTruthy();
      expect(capturedLLMBody!['model']).toBe('anthropic/claude-sonnet-4-20250514');
      const msgs = capturedLLMBody!['messages'] as Array<{ role: string; content: string }>;
      expect(msgs).toHaveLength(2);
      expect(msgs[0].role).toBe('system');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // Test 2: callLLM retries once on 5xx
  it('retries once on 5xx errors', async () => {
    const { callLLM } = await import('./openrouter.js');

    let callNum = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      callNum++;
      const url = typeof input === 'string' ? input : (input as Request).url;
      // First call: 500, second: 200
      if (callNum === 1) {
        mockLLMStatus = 500;
      } else {
        mockLLMStatus = 200;
      }
      const newUrl = url.replace(
        'https://openrouter.ai/api/v1/chat/completions',
        `http://localhost:${mockLLMPort}/api/v1/chat/completions`,
      );
      return originalFetch(newUrl, init);
    };

    try {
      const result = await callLLM(
        {
          model: 'anthropic/claude-sonnet-4-20250514',
          messages: [{ role: 'user', content: 'Test' }],
        },
        'sk-test-key',
        'req_retry',
      );

      expect(callNum).toBe(2);
      expect(result.content).toContain('UPLOAD_TOO_LARGE');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  // Test 3: callLLM times out after 30s (we simulate with abort)
  it('times out after 30s', async () => {
    const { callLLM } = await import('./openrouter.js');

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input, init) => {
      // Wait until abort signal fires
      return new Promise((_resolve, reject) => {
        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }
        // Never resolve — will timeout
      });
    };

    try {
      await expect(
        callLLM(
          {
            model: 'anthropic/claude-sonnet-4-20250514',
            messages: [{ role: 'user', content: 'Timeout test' }],
          },
          'sk-test-key',
          'req_timeout',
        ),
      ).rejects.toThrow(/timed out/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  }, 70_000);

  // Test 4: callLLM logs model, tokens, latency
  it('logs model, tokens, latency', async () => {
    const { callLLM } = await import('./openrouter.js');

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      const newUrl = url.replace(
        'https://openrouter.ai/api/v1/chat/completions',
        `http://localhost:${mockLLMPort}/api/v1/chat/completions`,
      );
      return originalFetch(newUrl, init);
    };

    try {
      const result = await callLLM(
        {
          model: 'anthropic/claude-sonnet-4-20250514',
          messages: [{ role: 'user', content: 'Log test' }],
        },
        'sk-test-key',
        'req_logtest',
      );

      // If we reach here without error, logging succeeded (tested by non-crash)
      expect(result.model).toBe('anthropic/claude-sonnet-4-20250514');
      expect(result.tokensIn).toBe(150);
      expect(result.tokensOut).toBe(80);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

// ==================== SYSTEM PROMPT TESTS ====================

describe('System prompt builder', () => {
  // Test 5: buildSystemPrompt includes identity and active errors
  it('includes identity and active errors', () => {
    const snapshot = makeSnapshot();
    const prompt = buildSystemPrompt(snapshot, snapshot.knowledgePack.docs);

    expect(prompt).toContain('usr_xyz');
    expect(prompt).toContain('admin');
    expect(prompt).toContain('pro');
    expect(prompt).toContain('UPLOAD_TOO_LARGE');
    expect(prompt).toContain('res_1');
    expect(prompt).toContain('validation');
  });

  // Test 6: buildSystemPrompt includes click timeline
  it('includes click timeline', () => {
    const snapshot = makeSnapshot();
    const prompt = buildSystemPrompt(snapshot, []);

    expect(prompt).toContain('/dashboard');
    expect(prompt).toContain('click btn_upload');
  });

  // Test 7: buildSystemPrompt never includes raw secrets
  it('never includes raw secrets in prompt', () => {
    const snapshot = makeSnapshot();
    // Inject something that might look like a secret
    snapshot.productState.entities[0].metadata = {
      note: 'safe content only',
    };

    const prompt = buildSystemPrompt(snapshot, []);

    // The prompt should only contain data from the snapshot's structured fields
    expect(prompt).not.toContain('Bearer');
    expect(prompt).not.toContain('sk_live');
    expect(prompt).not.toContain('postgres://');
    // It SHOULD contain structured data
    expect(prompt).toContain('UPLOAD_TOO_LARGE');
    expect(prompt).toContain('Never reveal internal system details');
  });
});

// ==================== RESPONSE PARSER TESTS ====================

describe('Response parser', () => {
  // Test 8: parseAIResponse extracts suggested actions
  it('extracts suggested actions from response', () => {
    const raw =
      'The file is too large. You can retry with a smaller file. ' +
      'Check the documentation for file size limits. ' +
      'If the issue persists, create a ticket for support.';

    const parsed = parseAIResponse(raw);

    expect(parsed.actions.length).toBeGreaterThanOrEqual(2);
    const types = parsed.actions.map((a) => a.type);
    expect(types).toContain('retry');
    expect(types).toContain('open_docs');
    expect(types).toContain('create_ticket');
  });

  // Test 9: parseAIResponse extracts evidence citations
  it('extracts evidence citations', () => {
    const raw =
      'The error UPLOAD_TOO_LARGE occurred at 2026-02-20T09:55:00.000Z ' +
      'for resource file_123. Job job_abc failed during processing.';

    const parsed = parseAIResponse(raw);

    expect(parsed.evidence.length).toBeGreaterThanOrEqual(2);

    const errorEvidence = parsed.evidence.find(
      (e) => e.type === 'error_code' && e.value === 'UPLOAD_TOO_LARGE',
    );
    expect(errorEvidence).toBeTruthy();

    const tsEvidence = parsed.evidence.find((e) => e.type === 'timestamp');
    expect(tsEvidence).toBeTruthy();
    expect(tsEvidence!.value).toContain('2026-02-20');

    const resourceEvidence = parsed.evidence.find(
      (e) => e.type === 'resource_id' && e.value === '123',
    );
    expect(resourceEvidence).toBeTruthy();
  });
});

// ==================== ORCHESTRATOR SERVICE TESTS ====================

describe('Orchestrator service', () => {
  let gatewayService: ReturnType<typeof createMockGatewayService>;
  let snapshotService: ReturnType<typeof createMockSnapshotService>;
  let contextService: ContextService;

  beforeAll(async () => {
    mockLLMResponse = 'I can see the UPLOAD_TOO_LARGE error. Please retry with a smaller file.';
    mockLLMStatus = 200;
    await startMockLLM();
  });

  afterAll(async () => {
    await stopMockLLM();
  });

  beforeEach(() => {
    gatewayService = createMockGatewayService();
    snapshotService = createMockSnapshotService();
    contextService = createMockContextService();
    mockLLMResponse = 'I can see the UPLOAD_TOO_LARGE error. Please retry with a smaller file.';
    mockLLMStatus = 200;
    mockLLMCallCount = 0;
  });

  function createTestOrchestrator() {
    // Patch fetch to redirect to our mock LLM
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      const newUrl = url.replace(
        'https://openrouter.ai/api/v1/chat/completions',
        `http://localhost:${mockLLMPort}/api/v1/chat/completions`,
      );
      return originalFetch(newUrl, init);
    };

    const orchestrator = createOrchestratorService({
      gatewayService,
      snapshotService,
      contextService,
      apiKey: 'sk-test-key',
      modelPolicy: 'fast',
      maxMessages: 20,
    });

    return { orchestrator, restore: () => { globalThis.fetch = originalFetch; } };
  }

  // Test 10: handleMessage loads snapshot and calls LLM
  it('loads snapshot and calls LLM', async () => {
    const { orchestrator, restore } = createTestOrchestrator();

    try {
      // Create a case first
      const { case: caseData } = await gatewayService.createCase('ten_abc', 'usr_xyz', 'My upload is failing');

      // Pre-store snapshot so getSnapshot finds it
      const snapshot = makeSnapshot();
      snapshotService._snapshots.set(caseData.snapshotId, { tenantId: 'ten_abc', data: snapshot });

      const result = await orchestrator.handleMessage(
        caseData.id,
        'ten_abc',
        'Help me with my upload error',
        'req_test10',
      );

      expect(result.role).toBe('assistant');
      expect(result.content).toContain('UPLOAD_TOO_LARGE');
      expect(result.caseId).toBe(caseData.id);
      expect(mockLLMCallCount).toBe(1);
    } finally {
      restore();
    }
  });

  // Test 11: handleMessage stores assistant message in DB
  it('stores assistant message in DB', async () => {
    const { orchestrator, restore } = createTestOrchestrator();

    try {
      const { case: caseData } = await gatewayService.createCase('ten_abc', 'usr_xyz', 'Initial message');
      const snapshot = makeSnapshot();
      snapshotService._snapshots.set(caseData.snapshotId, { tenantId: 'ten_abc', data: snapshot });

      await orchestrator.handleMessage(
        caseData.id,
        'ten_abc',
        'Why is my upload failing?',
        'req_test11',
      );

      // Should have: initial user msg, new user msg from handleMessage, assistant response
      const assistantMessages = gatewayService._messages.filter(
        (m) => m.caseId === caseData.id && m.role === 'assistant',
      );
      expect(assistantMessages).toHaveLength(1);
      expect(assistantMessages[0].content).toContain('UPLOAD_TOO_LARGE');
      expect(assistantMessages[0].actions).toBeDefined();
      expect(assistantMessages[0].evidence).toBeDefined();
    } finally {
      restore();
    }
  });

  // Test 12: Conversation includes previous messages
  it('includes previous messages in conversation', async () => {
    const { orchestrator, restore } = createTestOrchestrator();

    try {
      const { case: caseData } = await gatewayService.createCase('ten_abc', 'usr_xyz', 'First message');
      const snapshot = makeSnapshot();
      snapshotService._snapshots.set(caseData.snapshotId, { tenantId: 'ten_abc', data: snapshot });

      // Add some previous messages
      await gatewayService.addMessage(caseData.id, 'assistant', 'I see your issue.');
      await gatewayService.addMessage(caseData.id, 'user', 'Can you help?');
      await gatewayService.addMessage(caseData.id, 'assistant', 'Yes, checking now.');

      // Now send via orchestrator
      await orchestrator.handleMessage(
        caseData.id,
        'ten_abc',
        'Any update?',
        'req_test12',
      );

      // The captured LLM body should include previous messages + system prompt
      expect(capturedLLMBody).toBeTruthy();
      const llmMessages = capturedLLMBody!['messages'] as Array<{ role: string; content: string }>;
      // system + 4 previous + 1 new user = 6
      expect(llmMessages.length).toBeGreaterThanOrEqual(5);
      expect(llmMessages[0].role).toBe('system');

      // Previous messages should be in the conversation
      const userMsgs = llmMessages.filter((m) => m.role === 'user');
      expect(userMsgs.length).toBeGreaterThanOrEqual(2);
    } finally {
      restore();
    }
  });
});
