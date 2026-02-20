import fs from 'node:fs';
import path from 'node:path';

export type LogLevel = 'off' | 'low' | 'medium' | 'high' | 'psycho';

const LEVEL_VALUES: Record<LogLevel, number> = { off: 0, low: 1, medium: 2, high: 3, psycho: 4 };
type Severity = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG' | 'TRACE';
const SEVERITY_MIN_LEVEL: Record<Severity, number> = { ERROR: 1, WARN: 1, INFO: 2, DEBUG: 3, TRACE: 4 };
const COLORS: Record<Severity, string> = {
  ERROR: '\x1b[31m', WARN: '\x1b[33m', INFO: '\x1b[36m', DEBUG: '\x1b[90m', TRACE: '\x1b[35m',
};
const RESET = '\x1b[0m';

interface LogEntry { timestamp: string; level: Severity; message: string; requestId?: string; data?: Record<string, unknown>; }

let currentLevel: LogLevel = 'medium';
let logsDir = path.resolve('logs');
let maxFileSize = 10_485_760; // 10 MB
let maxFiles = 5;

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

export function setLogsDir(dir: string): void {
  logsDir = dir;
}

export function setLogRotation(size: number, files: number): void {
  maxFileSize = size;
  maxFiles = files;
}

function shouldLog(severity: Severity): boolean {
  return LEVEL_VALUES[currentLevel] >= SEVERITY_MIN_LEVEL[severity];
}

function getLogFilePath(): string {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(logsDir, `app-${date}.log`);
}

function ensureLogsDir(): void {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

function rotateIfNeeded(filePath: string): void {
  try {
    if (!fs.existsSync(filePath)) return;
    const stat = fs.statSync(filePath);
    if (stat.size < maxFileSize) return;

    // Delete oldest rotated file
    const oldest = `${filePath}.${maxFiles - 1}`;
    if (fs.existsSync(oldest)) fs.unlinkSync(oldest);
    // Shift numbered files up: .N-2→.N-1, ..., .1→.2
    for (let i = maxFiles - 2; i >= 1; i--) {
      const src = `${filePath}.${i}`;
      const dst = `${filePath}.${i + 1}`;
      if (fs.existsSync(src)) fs.renameSync(src, dst);
    }
    // Move current → .1
    fs.renameSync(filePath, `${filePath}.1`);
  } catch {
    // Silently fail rotation
  }
}

function writeToFile(entry: LogEntry): void {
  try {
    ensureLogsDir();
    const filePath = getLogFilePath();
    rotateIfNeeded(filePath);
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(filePath, line, 'utf-8');
  } catch {
    // Silently fail file writes in test environments
  }
}

function writeToConsole(entry: LogEntry): void {
  const color = COLORS[entry.level];
  const reqId = entry.requestId ? ` [${entry.requestId}]` : '';
  const dataStr = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
  const msg = `${color}[${entry.level}]${RESET}${reqId} ${entry.message}${dataStr}`;
  if (entry.level === 'ERROR') {
    process.stderr.write(msg + '\n');
  } else {
    process.stdout.write(msg + '\n');
  }
}

function doLog(
  severity: Severity,
  message: string,
  requestId?: string,
  data?: Record<string, unknown>,
): void {
  if (!shouldLog(severity)) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: severity,
    message,
    ...(requestId && { requestId }),
    ...(data && { data }),
  };

  writeToConsole(entry);
  writeToFile(entry);
}

export const log = {
  error(message: string, requestId?: string, data?: Record<string, unknown>): void {
    doLog('ERROR', message, requestId, data);
  },

  warn(message: string, requestId?: string, data?: Record<string, unknown>): void {
    doLog('WARN', message, requestId, data);
  },

  info(message: string, requestId?: string, data?: Record<string, unknown>): void {
    doLog('INFO', message, requestId, data);
  },

  debug(message: string, requestId?: string, data?: Record<string, unknown>): void {
    doLog('DEBUG', message, requestId, data);
  },

  trace(message: string, requestId?: string, data?: Record<string, unknown>): void {
    doLog('TRACE', message, requestId, data);
  },

  async time<T>(
    label: string,
    fn: () => Promise<T>,
    requestId?: string,
  ): Promise<{ result: T; elapsedMs: number }> {
    const start = Date.now();
    try {
      const result = await fn();
      const elapsedMs = Date.now() - start;
      doLog('INFO', `${label} completed`, requestId, { elapsedMs });
      return { result, elapsedMs };
    } catch (err) {
      const elapsedMs = Date.now() - start;
      doLog('ERROR', `${label} failed`, requestId, {
        elapsedMs,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },

  readErrors(): LogEntry[] {
    return readLogFile().filter((e) => e.level === 'ERROR');
  },

  readRecent(count = 20): LogEntry[] {
    const entries = readLogFile();
    return entries.slice(-count);
  },

  readRequest(requestId: string): LogEntry[] {
    return readLogFile().filter((e) => e.requestId === requestId);
  },
};

function readLogFile(): LogEntry[] {
  const filePath = getLogFilePath();
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(Boolean);
  const entries: LogEntry[] = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line) as LogEntry);
    } catch {
      // Skip malformed lines
    }
  }
  return entries;
}
