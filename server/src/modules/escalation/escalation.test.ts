import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { setLogLevel, setLogsDir } from '../../shared/logger.js';
import { resetEnvCache } from '../../shared/env.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors.js';
import { buildTicket } from './ticket-builder.js';
import { createEscalationService } from './escalation.service.js';
import type { EscalationDeps, TicketRecord } from './escalation.service.js';
import type { Connector, TicketPayload } from './connectors/connector.js';
import type { GatewayService } from '../gateway/gateway.service.js';
import type { SnapshotService } from '../snapshot/snapshot.service.js';
import type { Case, Message, SupportContextSnapshot } from '../../../../shared/types.js';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function genId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

const TENANT_ID = 'ten_escalation01';
const USER_ID = 'usr_escuser01';

function makeMockSnapshot(overrides?: Partial<SupportContextSnapshot>): SupportContextSnapshot {
  return {
    meta: {
      snapshotId: genId('scs'),
      createdAt: new Date().toISOString(),
      maxBytes: 5_000_000,
      truncation: { eventsRemoved: 0, logsTrimmed: false, docsRemoved: 0 },
    },
    identity: {
      tenantId: TENANT_ID,
      userId: USER_ID,
      roles: ['user'],
      plan: 'pro',
      featuresEnabled: ['uploads'],
    },
    productState: {
      entities: [],
      activeErrors: [
        {
          errorCode: 'UPLOAD_TIMEOUT',
          errorClass: 'infra',
          retryable: true,
          userActionable: false,
          resourceId: 'file_123',
          occurredAt: new Date().toISOString(),
        },
      ],
      limitsReached: [],
    },
    recentActivity: {
      windowHours: 72,
      events: [],
      clickTimeline: [
        { ts: '2026-02-20T10:00:00Z', page: '/uploads', action: 'click upload button' },
        { ts: '2026-02-20T10:01:00Z', page: '/uploads', action: 'select file' },
      ],
    },
    backend: { recentRequests: [], jobs: [], errors: [] },
    knowledgePack: { docs: [], runbooks: [], changelog: [] },
    privacy: { redactionVersion: '1.0', fieldsRemoved: [] },
    ...overrides,
  };
}

function makeMockCase(): Case {
  return {
    id: genId('cas'),
    tenantId: TENANT_ID,
    userId: USER_ID,
    status: 'active',
    snapshotId: genId('scs'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    resolvedAt: null,
    messageCount: 3,
    feedback: null,
  };
}

function makeMockMessages(caseId: string): Message[] {
  return [
    {
      id: genId('msg'), caseId, role: 'user',
      content: 'My file upload keeps failing with a timeout error',
      actions: [], evidence: [], confidence: null,
      createdAt: '2026-02-20T10:00:00Z',
    },
    {
      id: genId('msg'), caseId, role: 'assistant',
      content: 'I can see your upload is hitting a timeout. The UPLOAD_TIMEOUT error indicates an infrastructure issue.',
      actions: [], confidence: 0.8,
      evidence: [
        { type: 'error_code', label: 'Error Code', value: 'UPLOAD_TIMEOUT' },
        { type: 'resource_id', label: 'File', value: 'file_123' },
      ],
      createdAt: '2026-02-20T10:01:00Z',
    },
    {
      id: genId('msg'), caseId, role: 'user',
      content: 'Can you escalate this to a human?',
      actions: [], evidence: [], confidence: null,
      createdAt: '2026-02-20T10:02:00Z',
    },
  ];
}

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'escalation-test-'));
  setLogsDir(tmpDir);
  setLogLevel('low');
  process.env.JWT_SECRET = 'test-secret';
  process.env.DATABASE_URL = 'postgres://fake:fake@localhost:5432/fake';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.OPENROUTER_API_KEY = 'sk-fake';
  resetEnvCache();
});

afterAll(() => {
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('Ticket Builder', () => {
  // Test 1: buildTicket includes conversation summary
  it('buildTicket includes conversation summary', () => {
    const caseData = makeMockCase();
    const messages = makeMockMessages(caseData.id);
    const snapshot = makeMockSnapshot();

    const ticket = buildTicket(caseData, messages, snapshot);

    expect(ticket.summary).toBeTruthy();
    expect(ticket.summary.length).toBeLessThanOrEqual(120);
    expect(ticket.description).toContain('User Reported');
    expect(ticket.description).toContain('AI Diagnosis');
    expect(ticket.description).toContain('file upload keeps failing');
  });

  // Test 2: buildTicket includes evidence from messages
  it('buildTicket includes evidence from messages', () => {
    const caseData = makeMockCase();
    const messages = makeMockMessages(caseData.id);
    const snapshot = makeMockSnapshot();

    const ticket = buildTicket(caseData, messages, snapshot);

    expect(ticket.description).toContain('Evidence');
    expect(ticket.description).toContain('UPLOAD_TIMEOUT');
    expect(ticket.description).toContain('file_123');
  });

  // Test 3: buildTicket includes click timeline from snapshot
  it('buildTicket includes click timeline from snapshot', () => {
    const caseData = makeMockCase();
    const messages = makeMockMessages(caseData.id);
    const snapshot = makeMockSnapshot();

    const ticket = buildTicket(caseData, messages, snapshot);

    expect(ticket.description).toContain('Click Timeline');
    expect(ticket.description).toContain('/uploads');
    expect(ticket.description).toContain('click upload button');
    expect(ticket.description).toContain('select file');
  });
});

describe('Connectors', () => {
  // Test 4: Zendesk connector sends correct API call
  it('Zendesk connector sends correct API call', async () => {
    let capturedUrl = '';
    let capturedBody = '';
    let capturedHeaders: Record<string, string> = {};

    const origFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedUrl = String(input);
        capturedBody = init?.body as string;
        capturedHeaders = Object.fromEntries(
          Object.entries(init?.headers as Record<string, string>),
        );
        return new Response(
          JSON.stringify({ ticket: { id: 99001 } }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        );
      };

      const { createZendeskConnector } = await import('./connectors/zendesk.js');
      const connector = createZendeskConnector({
        subdomain: 'testco',
        apiToken: 'zd-token',
        email: 'agent@testco.com',
      });

      const result = await connector.createTicket({
        summary: 'Upload timeout',
        description: 'Detailed description',
        tags: ['UPLOAD_TIMEOUT'],
        priority: 'high',
        caseId: 'cas_test001',
        tenantId: TENANT_ID,
      });

      expect(capturedUrl).toContain('testco.zendesk.com/api/v2/tickets.json');
      expect(capturedHeaders['Authorization']).toContain('Basic');
      const parsed = JSON.parse(capturedBody);
      expect(parsed.ticket.subject).toBe('Upload timeout');
      expect(parsed.ticket.priority).toBe('high');
      expect(parsed.ticket.tags).toContain('UPLOAD_TIMEOUT');
      expect(result.externalId).toBe('99001');
      expect(result.externalUrl).toContain('testco.zendesk.com');
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  // Test 5: Jira connector sends correct API call
  it('Jira connector sends correct API call', async () => {
    let capturedUrl = '';
    let capturedBody = '';

    const origFetch = globalThis.fetch;
    try {
      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        capturedUrl = String(input);
        capturedBody = init?.body as string;
        return new Response(
          JSON.stringify({ key: 'SUP-42' }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        );
      };

      const { createJiraConnector } = await import('./connectors/jira.js');
      const connector = createJiraConnector({
        baseUrl: 'https://testco.atlassian.net',
        email: 'dev@testco.com',
        apiToken: 'jira-token',
        projectKey: 'SUP',
      });

      const result = await connector.createTicket({
        summary: 'Upload timeout',
        description: 'Detailed description',
        tags: ['UPLOAD_TIMEOUT'],
        priority: 'high',
        caseId: 'cas_test002',
        tenantId: TENANT_ID,
      });

      expect(capturedUrl).toContain('atlassian.net/rest/api/3/issue');
      const parsed = JSON.parse(capturedBody);
      expect(parsed.fields.summary).toBe('Upload timeout');
      expect(parsed.fields.project.key).toBe('SUP');
      expect(parsed.fields.priority.name).toBe('High');
      expect(result.externalId).toBe('SUP-42');
      expect(result.externalUrl).toContain('browse/SUP-42');
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  // Test 6: Email connector sends email with ticket content
  it('Email connector sends email with ticket content', async () => {
    let sentTo = '';
    let sentSubject = '';
    let sentBody = '';

    const { createEmailConnector } = await import('./connectors/email.js');
    const connector = createEmailConnector({
      sendFn: async (to, subject, body) => {
        sentTo = to;
        sentSubject = subject;
        sentBody = body;
      },
      recipientEmail: 'support@testco.com',
    });

    await connector.createTicket({
      summary: 'Upload timeout',
      description: 'Detailed ticket description here',
      tags: ['UPLOAD_TIMEOUT'],
      priority: 'high',
      caseId: 'cas_test003',
      tenantId: TENANT_ID,
    });

    expect(sentTo).toBe('support@testco.com');
    expect(sentSubject).toContain('HIGH');
    expect(sentSubject).toContain('Upload timeout');
    expect(sentBody).toContain('cas_test003');
    expect(sentBody).toContain('Detailed ticket description here');
  });
});

describe('Escalation Service', () => {
  let mockCase: Case;
  let mockMessages: Message[];
  let mockSnapshot: SupportContextSnapshot;
  let storedTickets: TicketRecord[];
  let escalatedCases: string[];
  let connectorUsed: string;
  let connectorPayload: TicketPayload | null;

  function buildDeps(overrides?: Partial<EscalationDeps>): EscalationDeps {
    const mockGateway: GatewayService = {
      async createCase() { throw new Error('not needed'); },
      async addMessage() { throw new Error('not needed'); },
      async getCase(caseId, tenantId) {
        if (mockCase.id !== caseId) throw new NotFoundError('Case', caseId);
        if (mockCase.tenantId !== tenantId) {
          throw new ForbiddenError(`Tenant ${tenantId} cannot access case ${caseId}`);
        }
        return { case: mockCase, messages: mockMessages };
      },
      async addFeedback() { throw new Error('not needed'); },
      async escalateCase(caseId) {
        escalatedCases.push(caseId);
        mockCase.status = 'escalated';
      },
      async logAudit() {},
    };

    const mockSnapshotService: SnapshotService = {
      async buildSnapshot() { throw new Error('not needed'); },
      async getSnapshot(snapshotId, tenantId) {
        if (mockSnapshot.meta.snapshotId !== snapshotId) {
          throw new NotFoundError('Snapshot', snapshotId);
        }
        return mockSnapshot;
      },
    };

    const mockZendesk: Connector = {
      name: 'zendesk',
      async createTicket(payload) {
        connectorUsed = 'zendesk';
        connectorPayload = payload;
        return { externalId: 'ZD-1001', externalUrl: 'https://test.zendesk.com/tickets/1001' };
      },
    };

    const mockEmail: Connector = {
      name: 'email',
      async createTicket(payload) {
        connectorUsed = 'email';
        connectorPayload = payload;
        return { externalId: 'email_cas_xxx', externalUrl: 'mailto:support@test.com' };
      },
    };

    return {
      gatewayService: mockGateway,
      snapshotService: mockSnapshotService,
      ticketStore: { async save(record) { storedTickets.push(record); } },
      connectors: { zendesk: mockZendesk, email: mockEmail },
      tenantConnectorMap: { [TENANT_ID]: 'zendesk', 'ten_emailonly': 'email' },
      defaultConnector: 'email',
      ...overrides,
    };
  }

  beforeEach(() => {
    mockCase = makeMockCase();
    mockMessages = makeMockMessages(mockCase.id);
    mockSnapshot = makeMockSnapshot({ meta: {
      snapshotId: mockCase.snapshotId,
      createdAt: new Date().toISOString(),
      maxBytes: 5_000_000,
      truncation: { eventsRemoved: 0, logsTrimmed: false, docsRemoved: 0 },
    }});
    storedTickets = [];
    escalatedCases = [];
    connectorUsed = '';
    connectorPayload = null;
  });

  // Test 7: escalate selects correct connector for tenant
  it('escalate selects correct connector for tenant', async () => {
    const service = createEscalationService(buildDeps());
    await service.escalate(mockCase.id, TENANT_ID, 'Need human help');

    expect(connectorUsed).toBe('zendesk');

    // Now test with a different tenant using email fallback
    const emailCase = makeMockCase();
    emailCase.tenantId = 'ten_emailonly';
    mockCase = emailCase;
    mockMessages = makeMockMessages(emailCase.id);
    mockSnapshot = makeMockSnapshot({
      meta: {
        snapshotId: emailCase.snapshotId,
        createdAt: new Date().toISOString(),
        maxBytes: 5_000_000,
        truncation: { eventsRemoved: 0, logsTrimmed: false, docsRemoved: 0 },
      },
      identity: { ...makeMockSnapshot().identity, tenantId: 'ten_emailonly' },
    });

    const service2 = createEscalationService(buildDeps());
    await service2.escalate(emailCase.id, 'ten_emailonly', undefined);

    expect(connectorUsed).toBe('email');
  });

  // Test 8: escalate updates case status to 'escalated'
  it('escalate updates case status to escalated', async () => {
    const service = createEscalationService(buildDeps());
    expect(mockCase.status).toBe('active');

    await service.escalate(mockCase.id, TENANT_ID, 'Need human help');

    expect(escalatedCases).toContain(mockCase.id);
    expect(mockCase.status).toBe('escalated');
  });

  // Test 9: escalate stores ticket record in DB
  it('escalate stores ticket record in DB', async () => {
    const service = createEscalationService(buildDeps());
    const result = await service.escalate(mockCase.id, TENANT_ID, 'Need help');

    expect(storedTickets).toHaveLength(1);
    const ticket = storedTickets[0];
    expect(ticket.tenantId).toBe(TENANT_ID);
    expect(ticket.caseId).toBe(mockCase.id);
    expect(ticket.externalId).toBe('ZD-1001');
    expect(ticket.connector).toBe('zendesk');
    expect(ticket.status).toBe('open');
    expect(ticket.id).toMatch(/^tkt_/);

    expect(result.ticketId).toBe('ZD-1001');
    expect(result.ticketUrl).toContain('zendesk.com');
  });
});
