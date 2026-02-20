import { describe, it, expect, beforeAll } from 'vitest';
import { setLogLevel, setLogsDir } from '../../shared/logger.js';
import { trimToSize } from '../../modules/context/trimmer.js';
import { createContextService } from '../../modules/context/context.service.js';
import type { SupportContextSnapshot } from '../../shared/types.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const BIG_TEXT = 'X'.repeat(20_000); // 20KB each

/** Generate a snapshot >5MB using fewer items with large content. */
function makeLargeSnapshot(): SupportContextSnapshot {
  // ~100 docs * 20KB = 2MB in docs
  const docs = Array.from({ length: 100 }, (_, i) => ({
    id: `doc_${i}`,
    title: `Knowledge Doc ${i}`,
    content: `${BIG_TEXT} Document ${i}`,
    category: 'doc',
  }));

  // ~100 runbooks * 20KB = 2MB
  const runbooks = Array.from({ length: 100 }, (_, i) => ({
    id: `rb_${i}`,
    title: `Runbook ${i}`,
    content: `${BIG_TEXT} Runbook ${i}`,
    category: 'runbook',
  }));

  // ~50 changelog * 20KB = 1MB
  const changelog = Array.from({ length: 50 }, (_, i) => ({
    version: `1.0.${i}`,
    date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
    summary: `Release ${i}: ${BIG_TEXT}`,
  }));

  // ~50 click timeline * 20KB = 1MB
  const clickTimeline = Array.from({ length: 50 }, (_, i) => ({
    ts: `2026-02-20T${String(i % 24).padStart(2, '0')}:00:00.000Z`,
    page: `/page/${i}`,
    action: `action_${i} ${BIG_TEXT}`,
  }));

  // ~50 events ~0.1MB (small)
  const events = Array.from({ length: 50 }, (_, i) => ({
    ts: `2026-02-20T${String(i % 24).padStart(2, '0')}:00:00.000Z`,
    event: `event_${i}`,
    page: `/page/${i}`,
    elementId: `el_${i}`,
    intent: `intent_${i}`,
    correlationRequestId: `req_${i}`,
  }));

  const recentRequests = Array.from({ length: 20 }, (_, i) => ({
    ts: `2026-02-20T${String(i % 24).padStart(2, '0')}:00:00.000Z`,
    route: `GET /api/resource/${i}`,
    httpStatus: 200,
    errorCode: null,
    resourceId: `res_${i}`,
    timingMs: 100 + i,
    requestId: `req_log_${i}`,
  }));

  return {
    meta: {
      snapshotId: 'scs_trimtest_001',
      createdAt: '2026-02-20T10:00:00.000Z',
      maxBytes: 5_000_000,
      truncation: { eventsRemoved: 0, logsTrimmed: false, docsRemoved: 0 },
    },
    identity: {
      tenantId: 'ten_trimtest01',
      userId: 'usr_trimtest01',
      roles: ['user'],
      plan: 'pro',
      featuresEnabled: ['uploads'],
    },
    productState: {
      entities: [
        { type: 'project', id: 'proj_001', status: 'active', metadata: { name: 'Test' } },
      ],
      activeErrors: [
        {
          errorCode: 'UPLOAD_TOO_LARGE',
          errorClass: 'validation',
          retryable: true,
          userActionable: true,
          resourceId: 'upload_001',
          occurredAt: '2026-02-20T09:00:00.000Z',
        },
      ],
      limitsReached: [{ limit: 'upload_size_mb', current: 50, max: 25 }],
    },
    recentActivity: { windowHours: 72, events, clickTimeline },
    backend: { recentRequests, jobs: [], errors: [] },
    knowledgePack: { docs, runbooks, changelog },
    privacy: { redactionVersion: '1.0', fieldsRemoved: [] },
  };
}

describe('Context Trimming Integration', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trimming-test-'));
    setLogsDir(tmpDir);
    setLogLevel('low');
  });

  const MAX_BYTES = 1_000_000; // 1MB target

  // Test 10: large snapshot trimmed to under 1MB
  it('large snapshot trimmed to under 1MB', () => {
    const snapshot = makeLargeSnapshot();
    const inputBytes = Buffer.byteLength(JSON.stringify(snapshot), 'utf-8');
    expect(inputBytes).toBeGreaterThan(5_000_000);

    const { trimmed, truncation } = trimToSize(snapshot, MAX_BYTES, 'req_trim');
    const outputBytes = Buffer.byteLength(JSON.stringify(trimmed), 'utf-8');

    expect(outputBytes).toBeLessThanOrEqual(MAX_BYTES);
    expect(truncation.finalBytes).toBeLessThanOrEqual(MAX_BYTES);
  }, 60_000);

  // Test 11: identity block preserved after trimming
  it('identity block preserved after trimming', () => {
    const snapshot = makeLargeSnapshot();

    const { trimmed } = trimToSize(snapshot, MAX_BYTES, 'req_trim');

    // Identity must survive trimming (Priority 1)
    expect(trimmed.identity.tenantId).toBe('ten_trimtest01');
    expect(trimmed.identity.userId).toBe('usr_trimtest01');
    expect(trimmed.identity.plan).toBe('pro');
    expect(trimmed.identity.roles).toContain('user');

    // Active errors must survive trimming (Priority 1)
    expect(trimmed.productState.activeErrors.length).toBeGreaterThan(0);
    expect(trimmed.productState.activeErrors[0].errorCode).toBe('UPLOAD_TOO_LARGE');
  }, 60_000);

  // Test 12: truncation counters match actual removals
  it('truncation counters match actual removals', () => {
    const snapshot = makeLargeSnapshot();

    const originalEventCount = snapshot.recentActivity.events.length +
      snapshot.recentActivity.clickTimeline.length;
    const originalDocCount = snapshot.knowledgePack.docs.length +
      snapshot.knowledgePack.runbooks.length +
      snapshot.knowledgePack.changelog.length;

    const { trimmed, truncation } = trimToSize(snapshot, MAX_BYTES, 'req_trim');

    const remainingEvents = trimmed.recentActivity.events.length +
      trimmed.recentActivity.clickTimeline.length;
    const remainingDocs = trimmed.knowledgePack.docs.length +
      trimmed.knowledgePack.runbooks.length +
      trimmed.knowledgePack.changelog.length;

    const actualEventsRemoved = originalEventCount - remainingEvents;
    const actualDocsRemoved = originalDocCount - remainingDocs;

    // Truncation counters should match
    expect(trimmed.meta.truncation.eventsRemoved).toBe(actualEventsRemoved);
    expect(trimmed.meta.truncation.docsRemoved).toBe(actualDocsRemoved);

    expect(truncation.eventsRemoved).toBe(actualEventsRemoved);
    expect(truncation.docsRemoved).toBe(actualDocsRemoved);

    // Substantial trimming should have happened
    expect(actualEventsRemoved + actualDocsRemoved).toBeGreaterThan(0);
  }, 60_000);
});
