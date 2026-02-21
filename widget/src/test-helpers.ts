import { vi } from 'vitest';
import type { Case, Message, SuggestedAction, Evidence } from './types.js';
import type { ApiClient } from './api.js';

/** Mock API client for widget tests */
export function createMockApiClient(overrides?: Partial<ApiClient>): ApiClient {
  return {
    createCase: vi.fn().mockResolvedValue({
      case: mockCase(),
      snapshot: { id: 'scs_test1' },
    }),
    sendMessage: vi.fn().mockResolvedValue(mockAssistantMessage()),
    addFeedback: vi.fn().mockResolvedValue(undefined),
    escalate: vi.fn().mockResolvedValue({
      ticketId: 'tkt_123',
      ticketUrl: 'https://tickets.example.com/tkt_123',
    }),
    executeAction: vi.fn().mockResolvedValue('Action completed'),
    ...overrides,
  };
}

export function mockCase(): Case {
  return {
    id: 'cas_test1',
    tenantId: 'ten_test1',
    userId: 'usr_test1',
    status: 'active',
    snapshotId: 'scs_test1',
    createdAt: '2026-02-20T10:00:00.000Z',
    updatedAt: '2026-02-20T10:00:00.000Z',
    resolvedAt: null,
    messageCount: 1,
    feedback: null,
  };
}

export function mockAssistantMessage(): Message {
  return {
    id: 'msg_ai1',
    caseId: 'cas_test1',
    role: 'assistant',
    content: 'I can see an UPLOAD_TOO_LARGE error on your recent upload.',
    actions: mockActions(),
    evidence: mockEvidence(),
    confidence: 0.85,
    createdAt: '2026-02-20T10:00:01.000Z',
  };
}

export function mockActions(): SuggestedAction[] {
  return [
    { type: 'retry', label: 'Retry upload', payload: { resourceId: 'res_1' } },
    { type: 'open_docs', label: 'View docs', payload: { url: 'https://docs.example.com/upload-limits' } },
    { type: 'create_ticket', label: 'Create ticket', payload: {} },
  ];
}

export function mockEvidence(): Evidence[] {
  return [
    { type: 'error_code', label: 'Error', value: 'UPLOAD_TOO_LARGE' },
    { type: 'job_id', label: 'Job', value: 'job_abc123' },
    { type: 'timestamp', label: 'Occurred', value: '2026-02-20T09:55:00.000Z' },
    { type: 'log_excerpt', label: 'Log', value: 'Error: file size 52MB exceeds limit 50MB' },
  ];
}
