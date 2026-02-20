import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { log, setLogLevel, setLogsDir, setLogRotation } from './logger.js';

describe('Log File Rotation', () => {
  let tmpDir: string;
  const date = new Date().toISOString().slice(0, 10);

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'log-rotate-'));
    setLogsDir(tmpDir);
    setLogLevel('low');
    setLogRotation(10_485_760, 5);
  });

  afterEach(() => {
    setLogRotation(10_485_760, 5);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('rotates when file exceeds max size', () => {
    const logFile = path.join(tmpDir, `app-${date}.log`);

    // Pre-create an oversized log file so next write triggers rotation
    fs.writeFileSync(logFile, 'x'.repeat(200) + '\n');

    // Now set tiny max and write — should trigger rotation
    setLogRotation(100, 3);
    log.error('trigger rotation', 'req_rot');

    expect(fs.existsSync(logFile)).toBe(true);
    expect(fs.existsSync(`${logFile}.1`)).toBe(true);
    // The .1 file should contain the old oversized content
    const rotatedContent = fs.readFileSync(`${logFile}.1`, 'utf-8');
    expect(rotatedContent).toContain('x'.repeat(100));
  });

  it('does not rotate when under max size', () => {
    setLogRotation(10_485_760, 3);
    log.error('small message', 'req_small');

    const logFile = path.join(tmpDir, `app-${date}.log`);
    expect(fs.existsSync(logFile)).toBe(true);
    expect(fs.existsSync(`${logFile}.1`)).toBe(false);
  });

  it('respects maxFiles limit by deleting oldest', () => {
    setLogRotation(50, 3);

    for (let i = 0; i < 30; i++) {
      log.error(`msg ${i}`, `req_${i}`);
    }

    const logFile = path.join(tmpDir, `app-${date}.log`);
    expect(fs.existsSync(logFile)).toBe(true);
    expect(fs.existsSync(`${logFile}.4`)).toBe(false);
    expect(fs.existsSync(`${logFile}.5`)).toBe(false);
  });

  it('keeps rotated files numbered correctly', () => {
    const logFile = path.join(tmpDir, `app-${date}.log`);
    setLogRotation(80, 5);

    // Write enough to trigger multiple rotations
    for (let i = 0; i < 20; i++) {
      log.error(`rotation msg ${i}`, `req_r${i}`);
    }

    // Current file and at least .1 should exist
    expect(fs.existsSync(logFile)).toBe(true);
    expect(fs.existsSync(`${logFile}.1`)).toBe(true);
  });
});
