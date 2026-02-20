import { describe, it, expect, beforeAll } from 'vitest';
import { setLogLevel, setLogsDir } from '../../shared/logger.js';
import { createContextService } from '../../modules/context/context.service.js';
import type { SupportContextSnapshot } from '../../../../shared/types.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function makeSnapshotWithSecrets(): SupportContextSnapshot {
  return {
    meta: {
      snapshotId: 'scs_sanitize_test01',
      createdAt: '2026-02-20T10:00:00.000Z',
      maxBytes: 5_000_000,
      truncation: { eventsRemoved: 0, logsTrimmed: false, docsRemoved: 0 },
    },
    identity: {
      tenantId: 'ten_santest01',
      userId: 'usr_santest01',
      roles: ['user'],
      plan: 'pro',
      featuresEnabled: ['uploads'],
    },
    productState: {
      entities: [
        {
          type: 'config',
          id: 'cfg_001',
          status: 'active',
          metadata: {
            dbUrl: 'postgres://admin:s3cretPass@db.internal.corp:5432/prod',
            apiKey: 'sk_live_abc123def456ghi789jkl012mno345pqr',
            jwtToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
            bearerToken: 'Bearer sk_prod_verysecrettoken1234567890abcdef',
          },
        },
      ],
      activeErrors: [
        {
          errorCode: 'UPLOAD_TOO_LARGE',
          errorClass: 'validation',
          retryable: true,
          userActionable: true,
          resourceId: 'upload_xyz789',
          occurredAt: '2026-02-20T09:00:00.000Z',
        },
      ],
      limitsReached: [],
    },
    recentActivity: {
      windowHours: 72,
      events: [
        {
          ts: '2026-02-20T09:00:00.000Z',
          event: 'api_call',
          page: '/settings',
          elementId: null,
          intent: null,
          correlationRequestId: null,
        },
      ],
      clickTimeline: [
        {
          ts: '2026-02-20T09:00:00.000Z',
          page: '/settings',
          action: 'Viewed settings page with secret redis://cache.internal.local:6379/0',
        },
      ],
    },
    backend: {
      recentRequests: [
        {
          ts: '2026-02-20T09:00:00.000Z',
          route: 'GET /api/config',
          httpStatus: 200,
          errorCode: null,
          resourceId: null,
          timingMs: 50,
          requestId: 'req_001',
        },
      ],
      jobs: [],
      errors: [
        {
          ts: '2026-02-20T09:00:00.000Z',
          errorCode: 'CONN_FAILED',
          errorClass: 'infra',
          route: 'POST /api/data',
          requestId: 'req_002',
          resourceId: null,
        },
      ],
    },
    knowledgePack: {
      docs: [
        {
          id: 'doc_001',
          title: 'Internal Network Guide',
          content: 'Connect to http://192.168.1.100:8080/admin for internal dashboard. Contact admin@company.com or call +1-555-123-4567.',
          category: 'doc',
        },
      ],
      runbooks: [],
      changelog: [],
    },
    privacy: {
      redactionVersion: '1.0',
      fieldsRemoved: [],
    },
  };
}

describe('Sanitization Integration', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sanitize-test-'));
    setLogsDir(tmpDir);
    setLogLevel('low');
  });

  // Test 7: secrets are removed from LLM input
  it('secrets are removed from LLM input', () => {
    const contextSvc = createContextService();
    const snapshot = makeSnapshotWithSecrets();

    const { processed } = contextSvc.processContext(snapshot, 5_000_000, 'req_test');
    const outputStr = JSON.stringify(processed);

    // No connection strings
    expect(outputStr).not.toContain('postgres://');
    expect(outputStr).not.toContain('s3cretPass');
    expect(outputStr).not.toContain('redis://');

    // No API keys
    expect(outputStr).not.toContain('sk_live_abc123def456ghi789jkl012mno345pqr');

    // No JWT tokens
    expect(outputStr).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');

    // No bearer tokens
    expect(outputStr).not.toContain('sk_prod_verysecrettoken1234567890abcdef');

    // Safe fields preserved
    expect(outputStr).toContain('UPLOAD_TOO_LARGE');
    expect(outputStr).toContain('upload_xyz789');
    expect(outputStr).toContain('ten_santest01');
  });

  // Test 8: PII is masked in LLM input
  it('PII is masked in LLM input', () => {
    const contextSvc = createContextService();
    const snapshot = makeSnapshotWithSecrets();

    const { processed } = contextSvc.processContext(snapshot, 5_000_000, 'req_test');
    const outputStr = JSON.stringify(processed);

    // Email should be masked
    expect(outputStr).not.toContain('admin@company.com');
    expect(outputStr).toMatch(/a\*\*\*@c\*\*\*\.com/);

    // Phone should be masked
    expect(outputStr).not.toContain('+1-555-123-4567');
  });

  // Test 9: audit records all sanitization actions
  it('audit records all sanitization actions', () => {
    const contextSvc = createContextService();
    const snapshot = makeSnapshotWithSecrets();

    const { audit } = contextSvc.processContext(snapshot, 5_000_000, 'req_test');

    // Secrets were found and redacted
    expect(audit.sanitization.secretsRedacted).toBeGreaterThan(0);

    // PII was masked
    expect(audit.sanitization.piiMasked).toBeGreaterThan(0);

    // Internal URLs were stripped
    expect(audit.sanitization.internalUrlsStripped).toBeGreaterThan(0);

    // Fields removed recorded
    expect(audit.sanitization.fieldsRemoved).toContain('secrets');
    expect(audit.sanitization.fieldsRemoved).toContain('pii');
    expect(audit.sanitization.fieldsRemoved).toContain('internal_urls');

    // Byte counts are positive
    expect(audit.inputBytes).toBeGreaterThan(0);
    expect(audit.outputBytes).toBeGreaterThan(0);
  });
});
