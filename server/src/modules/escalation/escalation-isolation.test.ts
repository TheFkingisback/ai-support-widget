import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { setLogLevel, setLogsDir } from '../../shared/logger.js';
import { resetEnvCache } from '../../shared/env.js';
import { NotFoundError, ForbiddenError } from '../../shared/errors.js';
import { createEscalationService } from './escalation.service.js';
import type { EscalationDeps, TicketRecord } from './escalation.service.js';
import type { Connector } from './connectors/connector.js';
import type { GatewayService } from '../gateway/gateway.service.js';
import type { SnapshotService } from '../snapshot/snapshot.service.js';
import type { Case, Message, SupportContextSnapshot } from '../../shared/types.js';
import { genId } from '../../tests/mocks/test-utils.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const TENANT_A = 'ten_escIsolA';
const TENANT_B = 'ten_escIsolB';

function makeMockSnapshot(tenantId: string, snapshotId: string): SupportContextSnapshot {
  return {
    meta: {
      snapshotId, createdAt: new Date().toISOString(),
      maxBytes: 5_000_000, truncation: { eventsRemoved: 0, logsTrimmed: false, docsRemoved: 0 },
    },
    identity: {
      tenantId, userId: 'usr_test', roles: ['user'], plan: 'pro', featuresEnabled: [],
    },
    productState: { entities: [], activeErrors: [], limitsReached: [] },
    recentActivity: { windowHours: 72, events: [], clickTimeline: [] },
    backend: { recentRequests: [], jobs: [], errors: [] },
    knowledgePack: { docs: [], runbooks: [], changelog: [] },
    privacy: { redactionVersion: '1.0', fieldsRemoved: [] },
  };
}

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'esc-isol-'));
  setLogsDir(tmpDir);
  setLogLevel('off');
  process.env.JWT_SECRET = 'test-secret';
  process.env.DATABASE_URL = 'postgres://fake:fake@localhost:5432/fake';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.OPENROUTER_API_KEY = 'sk-fake';
  resetEnvCache();
});

afterAll(() => {
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('Escalation Tenant Isolation', () => {
  let caseA: Case;
  let storedTickets: TicketRecord[];
  let escalatedCases: string[];

  function buildDeps(): EscalationDeps {
    const mockGateway: GatewayService = {
      async createCase() { throw new Error('unused'); },
      async addMessage() { throw new Error('unused'); },
      async getCase(caseId, tenantId) {
        if (caseA.id !== caseId) throw new NotFoundError('Case', caseId);
        if (caseA.tenantId !== tenantId) {
          throw new ForbiddenError(`Tenant ${tenantId} cannot access case ${caseId}`);
        }
        const msgs: Message[] = [{
          id: genId('msg'), caseId, role: 'user', content: 'Help',
          actions: [], evidence: [], confidence: null, createdAt: new Date().toISOString(),
        }];
        return { case: caseA, messages: msgs };
      },
      async addFeedback() { throw new Error('unused'); },
      async escalateCase(caseId) { escalatedCases.push(caseId); caseA.status = 'escalated'; },
      async logAudit() {},
    };

    const mockSnapshotService: SnapshotService = {
      async buildSnapshot() { throw new Error('unused'); },
      async getSnapshot(snapshotId, tenantId) {
        return makeMockSnapshot(tenantId, snapshotId);
      },
    };

    const mockConnector: Connector = {
      name: 'mock',
      async createTicket() {
        return { externalId: 'EXT-1', externalUrl: 'https://mock.tickets/1' };
      },
    };

    return {
      gatewayService: mockGateway,
      snapshotService: mockSnapshotService,
      ticketStore: { async save(record) { storedTickets.push(record); } },
      connectors: { mock: mockConnector },
      tenantConnectorMap: {},
      defaultConnector: 'mock',
    };
  }

  beforeEach(() => {
    caseA = {
      id: genId('cas'), tenantId: TENANT_A, userId: 'usr_A',
      status: 'active', snapshotId: genId('scs'),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      resolvedAt: null, messageCount: 1, feedback: null,
    };
    storedTickets = [];
    escalatedCases = [];
  });

  it('tenant B cannot escalate tenant A case', async () => {
    const service = createEscalationService(buildDeps());

    await expect(
      service.escalate(caseA.id, TENANT_B, 'Cross-tenant escalation'),
    ).rejects.toThrow(ForbiddenError);

    // No ticket should be created
    expect(storedTickets).toHaveLength(0);
    expect(escalatedCases).toHaveLength(0);
  });

  it('tenant A can escalate own case', async () => {
    const service = createEscalationService(buildDeps());

    const result = await service.escalate(caseA.id, TENANT_A, 'Need help');

    expect(result.ticketId).toBe('EXT-1');
    expect(storedTickets).toHaveLength(1);
    expect(storedTickets[0].tenantId).toBe(TENANT_A);
    expect(escalatedCases).toContain(caseA.id);
  });

  it('nonexistent case returns NotFoundError not ForbiddenError', async () => {
    const service = createEscalationService(buildDeps());

    await expect(
      service.escalate('cas_nonexistent', TENANT_A, 'Should not find'),
    ).rejects.toThrow(NotFoundError);
  });
});
