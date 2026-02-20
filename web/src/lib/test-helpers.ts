import type { Tenant, Case, AnalyticsSummary, AuditEntry, Message } from './types';

export function mockTenant(overrides?: Partial<Tenant>): Tenant {
  return {
    id: 'ten_test123',
    name: 'Test Corp',
    plan: 'pro',
    config: {
      maxContextBytes: 5_000_000,
      maxEventWindowHours: 72,
      maxLogLines: 500,
      maxDocs: 20,
      modelPolicy: 'auto',
      retentionDays: 90,
      enabledConnectors: ['email', 'zendesk'],
    },
    createdAt: '2026-01-15T10:00:00.000Z',
    ...overrides,
  };
}

export function mockCase(overrides?: Partial<Case>): Case {
  return {
    id: 'cas_test001',
    tenantId: 'ten_test123',
    userId: 'usr_abc',
    status: 'active',
    snapshotId: 'scs_snap001',
    createdAt: '2026-02-01T12:00:00.000Z',
    updatedAt: '2026-02-01T12:05:00.000Z',
    resolvedAt: null,
    messageCount: 3,
    feedback: null,
    ...overrides,
  };
}

export function mockAnalytics(overrides?: Partial<AnalyticsSummary>): AnalyticsSummary {
  return {
    totalCases: 50,
    resolvedWithoutHuman: 35,
    resolutionRate: 0.7,
    avgMessagesPerResolution: 4.2,
    avgTimeToFirstResponse: 1200,
    avgTimeToResolution: 180000,
    topIntents: [
      { intent: 'upload', count: 15 },
      { intent: 'billing', count: 10 },
    ],
    topErrors: [
      { errorCode: 'UPLOAD_TOO_LARGE', count: 12 },
      { errorCode: 'RATE_LIMITED', count: 8 },
    ],
    csat: { positive: 30, negative: 5, total: 35 },
    ...overrides,
  };
}

export function mockAuditEntry(overrides?: Partial<AuditEntry>): AuditEntry {
  return {
    id: 'aud_001',
    tenantId: 'ten_test123',
    userId: 'usr_abc',
    caseId: 'cas_test001',
    action: 'case_created',
    details: { message: 'User created a support case' },
    createdAt: '2026-02-01T12:00:00.000Z',
    ...overrides,
  };
}

export function mockMessage(overrides?: Partial<Message>): Message {
  return {
    id: 'msg_001',
    caseId: 'cas_test001',
    role: 'user',
    content: 'My upload is failing',
    actions: [],
    evidence: [],
    confidence: null,
    createdAt: '2026-02-01T12:00:00.000Z',
    ...overrides,
  };
}

/** Mock fetch that intercepts calls and returns configured responses.
 *  Patterns are matched longest-first so specific paths beat general ones. */
export function createMockFetch(handlers: Record<string, unknown>) {
  const sorted = Object.entries(handlers).sort((a, b) => b[0].length - a[0].length);
  return async (url: string | URL | Request): Promise<Response> => {
    const urlStr = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
    for (const [pattern, body] of sorted) {
      if (urlStr.includes(pattern)) {
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    return new Response(JSON.stringify({ message: 'Not found' }), { status: 404 });
  };
}
