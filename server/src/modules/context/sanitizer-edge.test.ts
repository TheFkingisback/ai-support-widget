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

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sanitizer-edge-'));
  setLogsDir(tmpDir);
  setLogLevel('low');
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeSnapshot(overrides?: Partial<SupportContextSnapshot>): SupportContextSnapshot {
  return {
    meta: {
      snapshotId: 'scs_edge01',
      createdAt: '2026-02-20T10:00:00.000Z',
      maxBytes: 500000,
      truncation: { eventsRemoved: 0, logsTrimmed: false, docsRemoved: 0 },
    },
    identity: {
      tenantId: 'ten_edge',
      userId: 'usr_edge',
      roles: ['user'],
      plan: 'pro',
      featuresEnabled: [],
    },
    productState: {
      entities: [{ type: 'item', id: 'item_1', status: 'active', metadata: {} }],
      activeErrors: [],
      limitsReached: [],
    },
    recentActivity: {
      windowHours: 72,
      events: [],
      clickTimeline: [],
    },
    backend: {
      recentRequests: [],
      jobs: [],
      errors: [],
    },
    knowledgePack: { docs: [], runbooks: [], changelog: [] },
    privacy: { redactionVersion: '1.0.0', fieldsRemoved: [] },
    ...overrides,
  };
}

// ==================== SANITIZER EDGE CASES ====================

describe('sanitizer edge cases', () => {
  // --- redactSecrets edge cases ---

  it('redactSecrets removes PEM private keys', () => {
    const snapshot = makeSnapshot();
    snapshot.productState.entities[0].metadata = {
      cert: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA0Z3VS5JJcds3\n-----END',
    };
    const result = redactSecrets(snapshot);
    const meta = result.productState.entities[0].metadata as Record<string, string>;
    expect(meta['cert']).not.toContain('BEGIN RSA PRIVATE KEY');
  });

  it('redactSecrets removes pre-signed AWS URLs', () => {
    const snapshot = makeSnapshot();
    snapshot.productState.entities[0].metadata = {
      url: 'https://s3.amazonaws.com/bucket/key?X-Amz-Signature=abc123def456ghi789&other=1',
    };
    const result = redactSecrets(snapshot);
    const meta = result.productState.entities[0].metadata as Record<string, string>;
    expect(meta['url']).toBe('[REDACTED]');
  });

  it('redactSecrets handles multiple secrets in one string', () => {
    const snapshot = makeSnapshot();
    snapshot.productState.entities[0].metadata = {
      config: 'db=postgres://u:p@host/db key=sk_live_abcdefghij1234567890',
    };
    const result = redactSecrets(snapshot);
    const meta = result.productState.entities[0].metadata as Record<string, string>;
    expect(meta['config']).not.toContain('postgres://');
    expect(meta['config']).not.toContain('sk_live_');
  });

  it('redactSecrets handles deeply nested objects', () => {
    const snapshot = makeSnapshot();
    snapshot.productState.entities[0].metadata = {
      level1: {
        level2: {
          level3: {
            secret: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.rz0',
          },
        },
      },
    };
    const result = redactSecrets(snapshot);
    const str = JSON.stringify(result);
    expect(str).not.toContain('eyJhbGci');
  });

  it('redactSecrets handles arrays with secrets', () => {
    const snapshot = makeSnapshot();
    snapshot.productState.entities[0].metadata = {
      tokens: [
        'safe_value',
        'Bearer long_secret_token_value_here_1234567890abcdef',
        'another_safe_value',
      ],
    };
    const result = redactSecrets(snapshot);
    const meta = result.productState.entities[0].metadata as Record<string, string[]>;
    expect(meta['tokens'][0]).toBe('safe_value');
    expect(meta['tokens'][1]).toContain('[REDACTED]');
    expect(meta['tokens'][2]).toBe('another_safe_value');
  });

  it('redactSecrets preserves non-string values (numbers, booleans, null)', () => {
    const snapshot = makeSnapshot();
    snapshot.productState.entities[0].metadata = {
      count: 42,
      enabled: true,
      missing: null,
    };
    const result = redactSecrets(snapshot);
    const meta = result.productState.entities[0].metadata as Record<string, unknown>;
    expect(meta['count']).toBe(42);
    expect(meta['enabled']).toBe(true);
    expect(meta['missing']).toBeNull();
  });

  // --- maskPII edge cases ---

  it('maskPII masks SSN patterns', () => {
    const snapshot = makeSnapshot();
    snapshot.knowledgePack.docs.push({
      id: 'doc_ssn', title: 'SSN Test',
      content: 'SSN: 123-45-6789 on file',
      category: 'test',
    });
    const result = maskPII(snapshot);
    expect(result.knowledgePack.docs[0].content).not.toContain('123-45-6789');
    expect(result.knowledgePack.docs[0].content).toContain('***-**-6789');
  });

  it('maskPII masks credit card numbers (with dashes)', () => {
    const snapshot = makeSnapshot();
    snapshot.knowledgePack.docs.push({
      id: 'doc_cc', title: 'CC Test',
      content: 'Card: 4111-1111-1111-1111 on file',
      category: 'test',
    });
    const result = maskPII(snapshot);
    expect(result.knowledgePack.docs[0].content).not.toContain('4111-1111-1111-1111');
  });

  it('maskPII masks contiguous credit card number as PII', () => {
    const snapshot = makeSnapshot();
    snapshot.knowledgePack.docs.push({
      id: 'doc_cc2', title: 'CC Test 2',
      content: 'Card: 4111111111111111 on file',
      category: 'test',
    });
    const result = maskPII(snapshot);
    // The raw 16-digit number is caught by phone or CC regex — either way it's masked
    expect(result.knowledgePack.docs[0].content).not.toContain('4111111111111111');
  });

  it('maskPII masks multiple emails in one field', () => {
    const snapshot = makeSnapshot();
    snapshot.knowledgePack.docs.push({
      id: 'doc_multi', title: 'Multi Email',
      content: 'From alice@example.com to bob@example.com cc charlie@test.org',
      category: 'test',
    });
    const result = maskPII(snapshot);
    const content = result.knowledgePack.docs[0].content;
    expect(content).not.toContain('alice@example.com');
    expect(content).not.toContain('bob@example.com');
    expect(content).not.toContain('charlie@test.org');
  });

  it('maskPII handles short phone numbers gracefully', () => {
    const snapshot = makeSnapshot();
    snapshot.knowledgePack.docs.push({
      id: 'doc_phone', title: 'Phone',
      content: 'Phone: +1-800-555-1234 and short 12345',
      category: 'test',
    });
    const result = maskPII(snapshot);
    expect(result.knowledgePack.docs[0].content).not.toContain('+1-800-555-1234');
  });

  it('maskPII handles empty email local part edge case', () => {
    const snapshot = makeSnapshot();
    // The regex won't match empty local, so it should pass through
    snapshot.knowledgePack.docs.push({
      id: 'doc_edge', title: 'Edge',
      content: 'Looks like @domain.com but not an email',
      category: 'test',
    });
    const result = maskPII(snapshot);
    // Should not crash, content preserved since no valid email matched
    expect(result.knowledgePack.docs[0].content).toContain('@domain.com');
  });

  // --- removeBinary edge cases ---

  it('removeBinary keeps short base64 strings', () => {
    const snapshot = makeSnapshot();
    snapshot.productState.entities[0].metadata = {
      shortB64: 'aGVsbG8=', // "hello" in base64, well under 100 chars
    };
    const result = removeBinary(snapshot);
    const meta = result.productState.entities[0].metadata as Record<string, string>;
    expect(meta['shortB64']).toBe('aGVsbG8=');
  });

  it('removeBinary removes large base64 in arrays', () => {
    const longBase64 = Buffer.from('a'.repeat(200)).toString('base64');
    const snapshot = makeSnapshot();
    snapshot.productState.entities[0].metadata = {
      files: [longBase64, 'short_text'],
    };
    const result = removeBinary(snapshot);
    const meta = result.productState.entities[0].metadata as Record<string, string[]>;
    expect(meta['files'][0]).toBe('[BINARY_REMOVED]');
    expect(meta['files'][1]).toBe('short_text');
  });

  // --- stripInternalUrls edge cases ---

  it('stripInternalUrls removes 10.x.x.x addresses', () => {
    const snapshot = makeSnapshot();
    snapshot.knowledgePack.docs.push({
      id: 'doc_10', title: '10.x',
      content: 'API at http://10.0.0.1:8080/api/v1',
      category: 'test',
    });
    const result = stripInternalUrls(snapshot);
    expect(result.knowledgePack.docs[0].content).not.toContain('10.0.0.1');
    expect(result.knowledgePack.docs[0].content).toContain('[INTERNAL_URL_REMOVED]');
  });

  it('stripInternalUrls removes 172.16-31.x.x addresses', () => {
    const snapshot = makeSnapshot();
    snapshot.knowledgePack.docs.push({
      id: 'doc_172', title: '172.x',
      content: 'Service at http://172.16.0.5:3000/health',
      category: 'test',
    });
    const result = stripInternalUrls(snapshot);
    expect(result.knowledgePack.docs[0].content).not.toContain('172.16.0.5');
  });

  it('stripInternalUrls removes localhost and 127.0.0.1', () => {
    const snapshot = makeSnapshot();
    snapshot.knowledgePack.docs.push({
      id: 'doc_local', title: 'Localhost',
      content: 'Dev: http://localhost:3000/api and http://127.0.0.1:8080/debug',
      category: 'test',
    });
    const result = stripInternalUrls(snapshot);
    expect(result.knowledgePack.docs[0].content).not.toContain('localhost');
    expect(result.knowledgePack.docs[0].content).not.toContain('127.0.0.1');
  });

  it('stripInternalUrls removes .corp and .local domains', () => {
    const snapshot = makeSnapshot();
    snapshot.knowledgePack.docs.push({
      id: 'doc_corp', title: 'Corp',
      content: 'Connect to db.corp:5432 and cache.local:6379',
      category: 'test',
    });
    const result = stripInternalUrls(snapshot);
    expect(result.knowledgePack.docs[0].content).not.toContain('db.corp');
    expect(result.knowledgePack.docs[0].content).not.toContain('cache.local');
  });

  it('stripInternalUrls preserves external URLs', () => {
    const snapshot = makeSnapshot();
    snapshot.knowledgePack.docs.push({
      id: 'doc_ext', title: 'External',
      content: 'Visit https://docs.example.com/guide for more info',
      category: 'test',
    });
    const result = stripInternalUrls(snapshot);
    expect(result.knowledgePack.docs[0].content).toContain('https://docs.example.com/guide');
  });

  // --- validateSchema edge cases ---

  it('validateSchema rejects missing identity.tenantId', () => {
    const snapshot = makeSnapshot();
    (snapshot.identity as Record<string, unknown>).tenantId = '';
    expect(() => validateSchema(snapshot)).toThrow('SCS validation failed');
  });

  it('validateSchema rejects non-array productState.entities', () => {
    const snapshot = makeSnapshot();
    (snapshot.productState as Record<string, unknown>).entities = 'not-an-array';
    expect(() => validateSchema(snapshot)).toThrow('productState.entities must be an array');
  });

  it('validateSchema passes valid snapshot', () => {
    const snapshot = makeSnapshot();
    const result = validateSchema(snapshot);
    expect(result.meta.snapshotId).toBe('scs_edge01');
  });

  // --- Full pipeline edge cases ---

  it('sanitize handles snapshot with no secrets/PII (clean passthrough)', () => {
    const snapshot = makeSnapshot();
    const { sanitized, audit } = sanitize(snapshot);
    expect(audit.secretsRedacted).toBe(0);
    expect(audit.piiMasked).toBe(0);
    expect(audit.binaryRemoved).toBe(0);
    expect(audit.internalUrlsStripped).toBe(0);
    expect(sanitized.meta.snapshotId).toBe('scs_edge01');
  });

  it('sanitize runs full pipeline with all secret types combined', () => {
    const snapshot = makeSnapshot();
    const longB64 = Buffer.from('x'.repeat(200)).toString('base64');
    snapshot.productState.entities[0].metadata = {
      jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.rz0xyzabc1234567890',
      db: 'postgres://admin:pass@host:5432/prod',
      apiKey: 'sk_live_1234567890abcdef1234567890',
    };
    snapshot.knowledgePack.docs.push({
      id: 'doc_mix', title: 'Mix',
      content: `Email: user@corp.com SSN: 999-88-7777 File: ${longB64} Internal: http://10.0.0.1:3000/api`,
      category: 'test',
    });

    const { sanitized, audit } = sanitize(snapshot);
    const str = JSON.stringify(sanitized);

    expect(str).not.toContain('eyJhbGci');
    expect(str).not.toContain('postgres://');
    expect(str).not.toContain('sk_live_');
    expect(str).not.toContain('user@corp.com');
    expect(str).not.toContain('999-88-7777');
    expect(str).not.toContain('10.0.0.1');
    expect(audit.secretsRedacted).toBeGreaterThan(0);
    expect(audit.piiMasked).toBeGreaterThan(0);
    expect(audit.fieldsRemoved.length).toBeGreaterThan(0);
  });
});
