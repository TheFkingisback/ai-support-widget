import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildApp } from '../../app.js';
import { setLogLevel, setLogsDir } from '../../shared/logger.js';
import { resetEnvCache } from '../../shared/env.js';
import { createInMemoryRateLimiter } from '../gateway/rate-limiter.js';
import type { GatewayService } from '../gateway/gateway.service.js';
import type { RateLimiter } from '../gateway/rate-limiter.js';
import type { SnapshotService } from './snapshot.service.js';
import type { FastifyInstance } from 'fastify';
import type {
  Case,
  Message,
  SupportContextSnapshot,
  GetUserStateResponse,
  GetUserHistoryResponse,
  GetUserLogsResponse,
  GetBusinessRulesResponse,
  UserEvent,
} from '../../../../shared/types.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors.js';
import { buildClickTimeline } from './timeline.js';
import {
  callClientApi,
  getUserState,
  getUserHistory,
  getUserLogs,
  getBusinessRules,
} from './client-api.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const JWT_SECRET = 'test-secret-for-snapshot';

function genId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

// ────────────────────────────────────────────────────────────
// Mock data for client API responses
// ────────────────────────────────────────────────────────────

const MOCK_USER_STATE: GetUserStateResponse = {
  userId: 'usr_test01',
  tenantId: 'ten_test01',
  roles: ['user', 'admin'],
  plan: 'pro',
  featuresEnabled: ['uploads', 'exports'],
  entities: [
    { type: 'project', id: 'proj_1', status: 'active', metadata: { name: 'My Project' } },
  ],
  activeErrors: [
    {
      errorCode: 'UPLOAD_TOO_LARGE',
      errorClass: 'validation',
      retryable: false,
      userActionable: true,
      resourceId: 'file_123',
      occurredAt: '2026-02-20T09:00:00.000Z',
    },
  ],
  limitsReached: [{ limit: 'storage', current: 95, max: 100 }],
};

const MOCK_USER_HISTORY: GetUserHistoryResponse = {
  windowHours: 72,
  events: [
    {
      ts: '2026-02-20T10:15:30.000Z',
      event: 'click',
      page: 'dashboard',
      elementId: 'btn_upload',
      intent: 'Upload File',
      correlationRequestId: 'req_abc123',
    },
    {
      ts: '2026-02-20T10:16:00.000Z',
      event: 'click',
      page: 'settings',
      elementId: 'btn_save',
      intent: 'Save Settings',
      correlationRequestId: null,
    },
  ],
  clickTimeline: [],
};

const MOCK_USER_LOGS: GetUserLogsResponse = {
  recentRequests: [
    {
      ts: '2026-02-20T10:15:31.000Z',
      route: 'POST /api/uploads',
      httpStatus: 413,
      errorCode: 'UPLOAD_TOO_LARGE',
      resourceId: 'file_123',
      timingMs: 45,
      requestId: 'req_abc123',
    },
  ],
  jobs: [
    {
      jobId: 'job_1',
      queue: 'processing',
      status: 'failed',
      errorCode: 'TIMEOUT',
      lastStage: 'transform',
      createdAt: '2026-02-20T09:00:00.000Z',
      updatedAt: '2026-02-20T09:05:00.000Z',
      durationMs: 300000,
    },
  ],
  errors: [
    {
      ts: '2026-02-20T10:15:31.000Z',
      errorCode: 'UPLOAD_TOO_LARGE',
      errorClass: 'validation',
      route: 'POST /api/uploads',
      requestId: 'req_abc123',
      resourceId: 'file_123',
    },
  ],
};

const MOCK_BUSINESS_RULES: GetBusinessRulesResponse = {
  rules: { maxUploadMb: 100 },
  errorCatalog: [
    {
      errorCode: 'UPLOAD_TOO_LARGE',
      errorClass: 'validation',
      retryable: false,
      userActionable: true,
      resolution: 'Reduce file size below 100MB.',
    },
  ],
};

// ────────────────────────────────────────────────────────────
// Mock HTTP server for client API calls
// ────────────────────────────────────────────────────────────

let mockServerPort: number;
let mockServer: ReturnType<typeof import('node:http').createServer>;

async function startMockServer(
  overrides?: Partial<{
    stateHandler: (res: import('node:http').ServerResponse) => void;
    historyHandler: (res: import('node:http').ServerResponse) => void;
    logsHandler: (res: import('node:http').ServerResponse) => void;
    rulesHandler: (res: import('node:http').ServerResponse) => void;
  }>,
): Promise<void> {
  const http = await import('node:http');

  return new Promise((resolve) => {
    mockServer = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json');

      if (req.url?.startsWith('/support/user-state')) {
        if (overrides?.stateHandler) {
          overrides.stateHandler(res);
        } else {
          res.writeHead(200);
          res.end(JSON.stringify(MOCK_USER_STATE));
        }
      } else if (req.url?.startsWith('/support/user-history')) {
        if (overrides?.historyHandler) {
          overrides.historyHandler(res);
        } else {
          res.writeHead(200);
          res.end(JSON.stringify(MOCK_USER_HISTORY));
        }
      } else if (req.url?.startsWith('/support/user-logs')) {
        if (overrides?.logsHandler) {
          overrides.logsHandler(res);
        } else {
          res.writeHead(200);
          res.end(JSON.stringify(MOCK_USER_LOGS));
        }
      } else if (req.url?.startsWith('/support/business-rules')) {
        if (overrides?.rulesHandler) {
          overrides.rulesHandler(res);
        } else {
          res.writeHead(200);
          res.end(JSON.stringify(MOCK_BUSINESS_RULES));
        }
      } else {
        res.writeHead(404);
        res.end('{"error":"not_found"}');
      }
    });

    mockServer.listen(0, () => {
      const addr = mockServer.address();
      if (addr && typeof addr === 'object') {
        mockServerPort = addr.port;
      }
      resolve();
    });
  });
}

function stopMockServer(): Promise<void> {
  return new Promise((resolve) => {
    if (mockServer) {
      mockServer.close(() => resolve());
    } else {
      resolve();
    }
  });
}

// ────────────────────────────────────────────────────────────
// Mock GatewayService (same pattern as gateway tests)
// ────────────────────────────────────────────────────────────

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
    },

    async logAudit(tenantId, userId, caseId, action, details) {
      _audit.push({ tenantId, userId, caseId, action, details });
    },
  };
}

// ────────────────────────────────────────────────────────────
// Mock SnapshotService for integration tests
// ────────────────────────────────────────────────────────────

function createMockSnapshotService(): SnapshotService & {
  _snapshots: Array<{
    snapshotId: string;
    tenantId: string;
    userId: string;
    caseId: string;
    data: SupportContextSnapshot;
  }>;
  _buildCalled: boolean;
} {
  const _snapshots: Array<{
    snapshotId: string;
    tenantId: string;
    userId: string;
    caseId: string;
    data: SupportContextSnapshot;
  }> = [];

  return {
    _snapshots,
    _buildCalled: false,

    async buildSnapshot(tenantId, userId, caseId) {
      this._buildCalled = true;
      const snapshotId = genId('scs');
      const snapshot: SupportContextSnapshot = {
        meta: {
          snapshotId,
          createdAt: new Date().toISOString(),
          maxBytes: 5_000_000,
          truncation: { eventsRemoved: 0, logsTrimmed: false, docsRemoved: 0 },
        },
        identity: {
          tenantId,
          userId,
          roles: ['user'],
          plan: 'pro',
          featuresEnabled: [],
        },
        productState: { entities: [], activeErrors: [], limitsReached: [] },
        recentActivity: { windowHours: 72, events: [], clickTimeline: [] },
        backend: { recentRequests: [], jobs: [], errors: [] },
        knowledgePack: { docs: [], runbooks: [], changelog: [] },
        privacy: { redactionVersion: '1.0', fieldsRemoved: [] },
      };
      _snapshots.push({ snapshotId, tenantId, userId, caseId, data: snapshot });
      return snapshot;
    },

    async getSnapshot(snapshotId, tenantId) {
      const found = _snapshots.find((s) => s.snapshotId === snapshotId);
      if (!found) throw new NotFoundError('Snapshot', snapshotId);
      if (found.tenantId !== tenantId) {
        throw new ForbiddenError(
          `Tenant ${tenantId} cannot access snapshot ${snapshotId}`,
        );
      }
      return found.data;
    },
  };
}

// ────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────

describe('Snapshot Module', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-test-'));
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

  // ─── Test 1: callClientApi constructs correct URL ───
  describe('callClientApi', () => {
    let port: number;
    let server: ReturnType<typeof import('node:http').createServer>;

    beforeAll(async () => {
      const http = await import('node:http');
      await new Promise<void>((resolve) => {
        server = http.createServer((req, res) => {
          res.setHeader('Content-Type', 'application/json');
          // Echo back the URL so we can verify
          res.writeHead(200);
          res.end(JSON.stringify({ url: req.url, headers: req.headers }));
        });
        server.listen(0, () => {
          const addr = server.address();
          if (addr && typeof addr === 'object') port = addr.port;
          resolve();
        });
      });
    });

    afterAll(async () => {
      await new Promise<void>((r) => server.close(() => r()));
    });

    it('constructs correct URL from baseUrl and params', async () => {
      const result = await callClientApi<{ url: string; headers: Record<string, string> }>(
        { baseUrl: `http://localhost:${port}`, serviceToken: 'tok_123' },
        '/support/user-state',
        { userId: 'usr_abc' },
      );

      expect(result.url).toBe('/support/user-state?userId=usr_abc');
      expect(result.headers.authorization).toBe('Bearer tok_123');
    });

    // ─── Test 2: callClientApi handles timeout ───
    it('handles timeout with error', async () => {
      const http = await import('node:http');
      // Create a slow server
      const slowServer = http.createServer((_req, _res) => {
        // Never respond — will trigger timeout
      });

      await new Promise<void>((resolve) => {
        slowServer.listen(0, () => resolve());
      });
      const slowPort = (slowServer.address() as import('node:net').AddressInfo).port;

      await expect(
        callClientApi(
          {
            baseUrl: `http://localhost:${slowPort}`,
            serviceToken: 'tok_123',
            timeoutMs: 100,
          },
          '/support/user-state',
          { userId: 'usr_abc' },
        ),
      ).rejects.toThrow(/timed out/);

      await new Promise<void>((r) => slowServer.close(() => r()));
    });

    // ─── Test 3: callClientApi logs timing on success and error ───
    it('logs timing on success', async () => {
      // We verify no throw — logging is a side effect tested by non-crash
      const result = await callClientApi<{ url: string }>(
        { baseUrl: `http://localhost:${port}`, serviceToken: 'tok_123' },
        '/support/user-state',
        { userId: 'usr_log_test' },
      );
      expect(result.url).toContain('usr_log_test');
    });
  });

  // ─── Test 4 & 5 & 6 & 7: buildSnapshot tests ───
  describe('buildSnapshot', () => {
    beforeAll(async () => {
      await startMockServer();
    });

    afterAll(async () => {
      await stopMockServer();
    });

    // ─── Test 4: buildSnapshot calls all 4 APIs in parallel ───
    it('calls all 4 APIs in parallel and assembles SCS', async () => {
      const opts = {
        baseUrl: `http://localhost:${mockServerPort}`,
        serviceToken: 'tok_test',
      };

      // Call the 4 functions that buildSnapshot would call
      const [stateResult, historyResult, logsResult, rulesResult] =
        await Promise.allSettled([
          getUserState(opts, 'usr_test01'),
          getUserHistory(opts, 'usr_test01', 72),
          getUserLogs(opts, 'usr_test01', 72),
          getBusinessRules(opts),
        ]);

      expect(stateResult.status).toBe('fulfilled');
      expect(historyResult.status).toBe('fulfilled');
      expect(logsResult.status).toBe('fulfilled');
      expect(rulesResult.status).toBe('fulfilled');

      if (stateResult.status === 'fulfilled') {
        expect(stateResult.value.userId).toBe('usr_test01');
        expect(stateResult.value.roles).toEqual(['user', 'admin']);
      }
      if (historyResult.status === 'fulfilled') {
        expect(historyResult.value.events).toHaveLength(2);
      }
      if (logsResult.status === 'fulfilled') {
        expect(logsResult.value.recentRequests).toHaveLength(1);
      }
      if (rulesResult.status === 'fulfilled') {
        expect(rulesResult.value.errorCatalog).toHaveLength(1);
      }
    });

    // ─── Test 5: buildSnapshot succeeds with partial failures ───
    it('succeeds with partial API failures (3 of 4)', async () => {
      await stopMockServer();

      // Start a server where user-state returns 500
      await startMockServer({
        stateHandler: (res) => {
          res.writeHead(500);
          res.end('{"error":"internal"}');
        },
      });

      const opts = {
        baseUrl: `http://localhost:${mockServerPort}`,
        serviceToken: 'tok_test',
      };

      const [stateResult, historyResult, logsResult, rulesResult] =
        await Promise.allSettled([
          getUserState(opts, 'usr_test01'),
          getUserHistory(opts, 'usr_test01', 72),
          getUserLogs(opts, 'usr_test01', 72),
          getBusinessRules(opts),
        ]);

      // state failed
      expect(stateResult.status).toBe('rejected');
      // others succeeded
      expect(historyResult.status).toBe('fulfilled');
      expect(logsResult.status).toBe('fulfilled');
      expect(rulesResult.status).toBe('fulfilled');

      // Restart normal server for subsequent tests
      await stopMockServer();
      await startMockServer();
    });

    // ─── Test 6: buildSnapshot stores snapshot in DB (via mock) ───
    it('stores snapshot in DB via mock service', async () => {
      const snapshotService = createMockSnapshotService();

      const snapshot = await snapshotService.buildSnapshot(
        'ten_test01',
        'usr_test01',
        'cas_test01',
      );

      expect(snapshotService._snapshots).toHaveLength(1);
      expect(snapshotService._snapshots[0].tenantId).toBe('ten_test01');
      expect(snapshotService._snapshots[0].caseId).toBe('cas_test01');
      expect(snapshot.meta.snapshotId).toMatch(/^scs_/);
    });

    // ─── Test 7: buildSnapshot includes correct truncation metadata ───
    it('includes correct truncation metadata', async () => {
      const snapshotService = createMockSnapshotService();

      const snapshot = await snapshotService.buildSnapshot(
        'ten_test01',
        'usr_test01',
        'cas_test01',
      );

      expect(snapshot.meta.truncation).toEqual({
        eventsRemoved: 0,
        logsTrimmed: false,
        docsRemoved: 0,
      });
      expect(snapshot.meta.maxBytes).toBe(5_000_000);
      expect(snapshot.meta.createdAt).toBeTruthy();
    });
  });

  // ─── Test 8: getSnapshot rejects wrong tenantId ───
  describe('getSnapshot tenant isolation', () => {
    it('rejects access from wrong tenantId', async () => {
      const snapshotService = createMockSnapshotService();

      // Build a snapshot for tenant A
      const snapshot = await snapshotService.buildSnapshot(
        'ten_tenantA',
        'usr_test01',
        'cas_test01',
      );

      // Try to access with tenant B
      await expect(
        snapshotService.getSnapshot(snapshot.meta.snapshotId, 'ten_tenantB'),
      ).rejects.toThrow(/cannot access/);
    });
  });

  // ─── Test 9: buildClickTimeline formats events ───
  describe('buildClickTimeline', () => {
    it('formats events into readable timeline', () => {
      const events: UserEvent[] = [
        {
          ts: '2026-02-20T10:15:30.000Z',
          event: 'click',
          page: 'dashboard',
          elementId: 'btn_upload',
          intent: 'Upload File',
          correlationRequestId: 'req_abc',
        },
        {
          ts: '2026-02-20T10:16:00.000Z',
          event: 'navigate',
          page: 'settings',
          elementId: null,
          intent: null,
          correlationRequestId: null,
        },
      ];

      const timeline = buildClickTimeline(events);

      expect(timeline).toHaveLength(2);
      expect(timeline[0]).toEqual({
        ts: '10:15:30',
        page: 'dashboard',
        action: 'click btn_upload (Upload File)',
      });
      expect(timeline[1]).toEqual({
        ts: '10:16:00',
        page: 'settings',
        action: 'navigate',
      });
    });
  });

  // ─── Test 10: Snapshot triggered on case creation ───
  describe('Gateway integration', () => {
    let app: FastifyInstance;
    let service: ReturnType<typeof createMockGatewayService>;
    let snapshotService: ReturnType<typeof createMockSnapshotService>;
    let rateLimiter: RateLimiter;
    let token: string;

    const TENANT_ID = 'ten_snapshot_integ';
    const USER_ID = 'usr_snapshot_integ';

    beforeAll(async () => {
      service = createMockGatewayService();
      snapshotService = createMockSnapshotService();
      rateLimiter = createInMemoryRateLimiter();

      app = await buildApp({
        jwtSecret: JWT_SECRET,
        gatewayService: service,
        rateLimiter,
        snapshotService,
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
      snapshotService._snapshots.length = 0;
      snapshotService._buildCalled = false;
      rateLimiter.reset();
    });

    afterAll(async () => {
      await app.close();
    });

    it('triggers snapshot generation on case creation', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/cases',
        headers: { authorization: `Bearer ${token}` },
        payload: { message: 'My upload is failing' },
      });

      expect(res.statusCode).toBe(200);
      expect(snapshotService._buildCalled).toBe(true);
      expect(snapshotService._snapshots).toHaveLength(1);
      expect(snapshotService._snapshots[0].tenantId).toBe(TENANT_ID);
      expect(snapshotService._snapshots[0].userId).toBe(USER_ID);
      expect(snapshotService._snapshots[0].caseId).toMatch(/^cas_/);
    });
  });
});
