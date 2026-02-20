import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { SupportContextSnapshot } from '@shared/types.js';
import { setLogLevel, setLogsDir } from '../../shared/logger.js';
import {
  redactSecrets,
  maskPII,
  removeBinary,
  stripInternalUrls,
  validateSchema,
  sanitize,
} from './sanitizer.js';
import { rankByRelevance } from './ranker.js';
import { trimToSize } from './trimmer.js';
import { createContextService } from './context.service.js';

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'context-test-'));
  setLogsDir(tmpDir);
  setLogLevel('low');
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

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

// ==================== SANITIZER TESTS ====================

describe('sanitizer', () => {
  // Test 1: redactSecrets removes JWT tokens from data
  it('redactSecrets removes JWT tokens from data', () => {
    const snapshot = makeSnapshot();
    // Inject a JWT token into metadata
    snapshot.productState.entities[0].metadata = {
      authToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
    };

    const result = redactSecrets(snapshot);

    const meta = result.productState.entities[0].metadata as Record<string, string>;
    expect(meta['authToken']).toBe('[REDACTED]');
    expect(meta['authToken']).not.toContain('eyJ');
  });

  // Test 2: redactSecrets removes connection strings
  it('redactSecrets removes connection strings', () => {
    const snapshot = makeSnapshot();
    snapshot.productState.entities[0].metadata = {
      dbUrl: 'postgres://user:pass@db.internal:5432/mydb',
    };

    const result = redactSecrets(snapshot);

    const meta = result.productState.entities[0].metadata as Record<string, string>;
    expect(meta['dbUrl']).toBe('[REDACTED]');
    expect(meta['dbUrl']).not.toContain('postgres://');
  });

  // Test 3: redactSecrets preserves allowed fields (IDs, timestamps, error codes)
  it('redactSecrets preserves allowed fields', () => {
    const snapshot = makeSnapshot();

    const result = redactSecrets(snapshot);

    // Safe fields should be preserved
    expect(result.meta.snapshotId).toBe('scs_test123');
    expect(result.meta.createdAt).toBe('2026-02-20T10:00:00.000Z');
    expect(result.identity.tenantId).toBe('ten_abc');
    expect(result.identity.userId).toBe('usr_xyz');
    expect(result.productState.activeErrors[0].errorCode).toBe('UPLOAD_TOO_LARGE');
    expect(result.backend.recentRequests[0].requestId).toBe('req_abc');
  });

  // Test 4: maskPII masks email addresses consistently
  it('maskPII masks email addresses consistently', () => {
    const snapshot = makeSnapshot();
    snapshot.knowledgePack.docs[0].content = 'Contact john.doe@example.com for help';

    const result = maskPII(snapshot);

    expect(result.knowledgePack.docs[0].content).not.toContain('john.doe@example.com');
    expect(result.knowledgePack.docs[0].content).toContain('j***@e***.com');

    // Mask is stable — same input produces same output
    const result2 = maskPII(snapshot);
    expect(result2.knowledgePack.docs[0].content).toBe(result.knowledgePack.docs[0].content);
  });

  // Test 5: maskPII preserves non-PII fields
  it('maskPII preserves non-PII fields', () => {
    const snapshot = makeSnapshot();

    const result = maskPII(snapshot);

    expect(result.meta.snapshotId).toBe('scs_test123');
    expect(result.identity.tenantId).toBe('ten_abc');
    expect(result.productState.activeErrors[0].errorCode).toBe('UPLOAD_TOO_LARGE');
    expect(result.backend.recentRequests[0].route).toBe('/api/upload');
  });

  // Test 6: removeBinary strips base64 content
  it('removeBinary strips base64 content', () => {
    const snapshot = makeSnapshot();
    // Create a long base64 string (>100 chars)
    const longBase64 = Buffer.from('a'.repeat(200)).toString('base64');
    snapshot.productState.entities[0].metadata = {
      fileContent: longBase64,
    };

    const result = removeBinary(snapshot);

    const meta = result.productState.entities[0].metadata as Record<string, string>;
    expect(meta['fileContent']).toBe('[BINARY_REMOVED]');
  });

  // Test 7: stripInternalUrls removes internal endpoints
  it('stripInternalUrls removes internal endpoints', () => {
    const snapshot = makeSnapshot();
    snapshot.knowledgePack.docs[0].content =
      'API at http://192.168.1.100:3000/api and service.internal:8080';

    const result = stripInternalUrls(snapshot);

    expect(result.knowledgePack.docs[0].content).not.toContain('192.168.1.100');
    expect(result.knowledgePack.docs[0].content).not.toContain('service.internal');
    expect(result.knowledgePack.docs[0].content).toContain('[INTERNAL_URL_REMOVED]');
    expect(result.knowledgePack.docs[0].content).toContain('[INTERNAL_HOST_REMOVED]');
  });

  // Test 8: validateSchema rejects malformed snapshot
  it('validateSchema rejects malformed snapshot', () => {
    const bad = { meta: { snapshotId: 'scs_1' } } as unknown as SupportContextSnapshot;

    expect(() => validateSchema(bad)).toThrow('SCS validation failed');
  });
});

// ==================== RANKER TESTS ====================

describe('ranker', () => {
  // Test 9: rankByRelevance puts active errors in priority 1
  it('rankByRelevance puts active errors in priority 1', () => {
    const snapshot = makeSnapshot();

    const ranked = rankByRelevance(snapshot);

    // identity (1) + activeErrors (1) + entities (1) + limitsReached (1) = 4
    expect(ranked._ranking.priority1Count).toBe(4);
    // Active errors should still be present
    expect(ranked.productState.activeErrors).toHaveLength(1);
    expect(ranked.productState.activeErrors[0].errorCode).toBe('UPLOAD_TOO_LARGE');
  });
});

// ==================== TRIMMER TESTS ====================

describe('trimmer', () => {
  // Test 10: trimToSize reduces snapshot to under maxBytes
  it('trimToSize reduces snapshot to under maxBytes', () => {
    const snapshot = makeSnapshot();
    // Add lots of docs to make it large
    for (let i = 0; i < 50; i++) {
      snapshot.knowledgePack.docs.push({
        id: `doc_${i}`,
        title: `Document ${i}`,
        content: 'x'.repeat(500),
        category: 'guides',
      });
    }

    const size = Buffer.byteLength(JSON.stringify(snapshot), 'utf-8');
    const maxBytes = Math.floor(size * 0.5); // half the size

    const { trimmed, truncation } = trimToSize(snapshot, maxBytes);

    const finalSize = Buffer.byteLength(JSON.stringify(trimmed), 'utf-8');
    expect(finalSize).toBeLessThanOrEqual(maxBytes);
    expect(truncation.finalBytes).toBeLessThanOrEqual(maxBytes);
  });

  // Test 11: trimToSize removes attachments first (priority 4), then docs (priority 3)
  it('trimToSize removes knowledge pack items before events', () => {
    const snapshot = makeSnapshot();
    // Add enough docs to exceed budget
    for (let i = 0; i < 20; i++) {
      snapshot.knowledgePack.docs.push({
        id: `doc_${i}`,
        title: `Document ${i}`,
        content: 'x'.repeat(300),
        category: 'guides',
      });
    }

    const size = Buffer.byteLength(JSON.stringify(snapshot), 'utf-8');
    const maxBytes = Math.floor(size * 0.6);

    const { trimmed, truncation } = trimToSize(snapshot, maxBytes);

    // Docs should be trimmed first (priority 3) before events (priority 2)
    expect(truncation.docsRemoved).toBeGreaterThan(0);
    // Events should still be present since docs were cut first
    expect(trimmed.recentActivity.events.length).toBeGreaterThanOrEqual(
      snapshot.recentActivity.events.length > 0 ? 1 : 0,
    );
  });

  // Test 12: trimToSize records truncation counters accurately
  it('trimToSize records truncation counters accurately', () => {
    const snapshot = makeSnapshot();
    // Add enough items to need trimming
    for (let i = 0; i < 30; i++) {
      snapshot.knowledgePack.changelog.push({
        version: `1.${i}.0`,
        date: '2026-01-01',
        summary: 'x'.repeat(200),
      });
    }
    for (let i = 0; i < 30; i++) {
      snapshot.recentActivity.events.push({
        ts: `2026-02-${String(i + 1).padStart(2, '0')}T09:00:00.000Z`,
        event: 'click',
        page: '/page',
        elementId: null,
        intent: null,
        correlationRequestId: null,
      });
    }

    const size = Buffer.byteLength(JSON.stringify(snapshot), 'utf-8');
    const maxBytes = Math.floor(size * 0.3);

    const { trimmed, truncation } = trimToSize(snapshot, maxBytes);

    expect(truncation.originalBytes).toBe(size);
    expect(truncation.finalBytes).toBeLessThanOrEqual(maxBytes);

    // Verify the meta truncation was updated
    expect(trimmed.meta.truncation.docsRemoved).toBe(truncation.docsRemoved);
    expect(trimmed.meta.truncation.eventsRemoved).toBe(truncation.eventsRemoved);
  });
});

// ==================== FULL PIPELINE TESTS ====================

describe('context service', () => {
  // Test 13: Full pipeline: sanitize → rank → trim produces valid output
  it('full pipeline produces valid sanitized, ranked, trimmed output', () => {
    const snapshot = makeSnapshot();
    // Inject secrets, PII, and internal URLs
    snapshot.productState.entities[0].metadata = {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
    };
    snapshot.knowledgePack.docs[0].content = 'Contact admin@company.com at http://10.0.0.1:3000/api';
    // Add extra data to ensure trimming has something to cut
    for (let i = 0; i < 20; i++) {
      snapshot.knowledgePack.docs.push({
        id: `doc_${i}`,
        title: `Doc ${i}`,
        content: 'x'.repeat(300),
        category: 'guides',
      });
    }

    const service = createContextService();
    const size = Buffer.byteLength(JSON.stringify(snapshot), 'utf-8');
    const maxBytes = Math.floor(size * 0.5);

    const { processed, audit } = service.processContext(snapshot, maxBytes);

    // Secrets removed
    const meta = processed.productState.entities[0].metadata as Record<string, string>;
    expect(meta['token']).toBe('[REDACTED]');

    // PII masked
    expect(JSON.stringify(processed)).not.toContain('admin@company.com');

    // Internal URLs stripped
    expect(JSON.stringify(processed)).not.toContain('10.0.0.1');

    // Under size limit
    const finalSize = Buffer.byteLength(JSON.stringify(processed), 'utf-8');
    expect(finalSize).toBeLessThanOrEqual(maxBytes);

    // Audit trail present
    expect(audit.inputBytes).toBeGreaterThan(0);
    expect(audit.outputBytes).toBeGreaterThan(0);
    expect(audit.outputBytes).toBeLessThanOrEqual(audit.inputBytes);
  });

  // Test 14: Sanitization audit records all changes
  it('sanitization audit records all changes', () => {
    const snapshot = makeSnapshot();
    // Add secrets
    snapshot.productState.entities[0].metadata = {
      apiKey: 'sk_live_abcdefghij1234567890',
    };
    // Add PII
    snapshot.knowledgePack.docs[0].content = 'User email: test@example.com';

    const { sanitized, audit } = sanitize(snapshot);

    // Audit should record secret redaction
    expect(audit.secretsRedacted).toBeGreaterThan(0);
    // Audit should record PII masking
    expect(audit.piiMasked).toBeGreaterThan(0);
    // fieldsRemoved should list categories
    expect(audit.fieldsRemoved).toContain('secrets');
    expect(audit.fieldsRemoved).toContain('pii');
    // Privacy section updated
    expect(sanitized.privacy.redactionVersion).toBe('1.0.0');
    expect(sanitized.privacy.fieldsRemoved.length).toBeGreaterThan(0);
  });
});
