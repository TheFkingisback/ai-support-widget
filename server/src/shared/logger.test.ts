import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { log, setLogLevel, setLogsDir } from './logger.js';

describe('Logger', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'logger-test-'));
    setLogsDir(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes ERROR to file at LOW level', () => {
    setLogLevel('low');
    log.error('test error', 'req_001');

    const entries = log.readErrors();
    expect(entries.length).toBeGreaterThanOrEqual(1);
    const last = entries[entries.length - 1];
    expect(last.level).toBe('ERROR');
    expect(last.message).toBe('test error');
    expect(last.requestId).toBe('req_001');
  });

  it('skips DEBUG at LOW level', () => {
    setLogLevel('low');
    log.debug('should not appear', 'req_002');

    const recent = log.readRecent(100);
    const debugEntries = recent.filter(
      (e) => e.message === 'should not appear',
    );
    expect(debugEntries).toHaveLength(0);
  });

  it('writes all levels at PSYCHO', () => {
    setLogLevel('psycho');
    log.error('psycho error', 'req_003');
    log.warn('psycho warn', 'req_003');
    log.info('psycho info', 'req_003');
    log.debug('psycho debug', 'req_003');
    log.trace('psycho trace', 'req_003');

    const entries = log.readRequest('req_003');
    expect(entries).toHaveLength(5);
    const levels = entries.map((e) => e.level);
    expect(levels).toContain('ERROR');
    expect(levels).toContain('WARN');
    expect(levels).toContain('INFO');
    expect(levels).toContain('DEBUG');
    expect(levels).toContain('TRACE');
  });

  it('readErrors() returns only ERROR entries', () => {
    setLogLevel('psycho');
    log.error('err1', 'req_004');
    log.info('info1', 'req_004');
    log.error('err2', 'req_004');

    const errors = log.readErrors();
    const relevantErrors = errors.filter((e) => e.requestId === 'req_004');
    expect(relevantErrors).toHaveLength(2);
    expect(relevantErrors.every((e) => e.level === 'ERROR')).toBe(true);
  });

  it('readRequest(id) filters by requestId', () => {
    setLogLevel('medium');
    log.info('msg-a', 'req_aaa');
    log.info('msg-b', 'req_bbb');
    log.info('msg-c', 'req_aaa');

    const entries = log.readRequest('req_aaa');
    expect(entries).toHaveLength(2);
    expect(entries.every((e) => e.requestId === 'req_aaa')).toBe(true);
  });

  it('log.time() measures elapsed time', async () => {
    setLogLevel('medium');
    const { result, elapsedMs } = await log.time(
      'test-op',
      async () => {
        await new Promise((r) => setTimeout(r, 50));
        return 42;
      },
      'req_time',
    );

    expect(result).toBe(42);
    expect(elapsedMs).toBeGreaterThanOrEqual(40);
    expect(elapsedMs).toBeLessThan(500);
  });
});
