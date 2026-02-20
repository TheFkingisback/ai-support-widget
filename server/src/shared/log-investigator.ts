import { log } from './logger.js';

export function investigate(): void {
  const errors = log.readErrors();
  const recent = log.readRecent(20);

  process.stdout.write('\n=== ERROR SUMMARY ===\n');
  if (errors.length === 0) {
    process.stdout.write('No errors found.\n');
  } else {
    process.stdout.write(`Total errors: ${errors.length}\n`);
    for (const err of errors.slice(-10)) {
      const reqId = err.requestId ? ` [${err.requestId}]` : '';
      process.stdout.write(`  ${err.timestamp}${reqId} ${err.message}\n`);
    }
  }

  process.stdout.write('\n=== LAST 20 ENTRIES ===\n');
  for (const entry of recent) {
    const reqId = entry.requestId ? ` [${entry.requestId}]` : '';
    process.stdout.write(`  [${entry.level}]${reqId} ${entry.message}\n`);
  }
  process.stdout.write('\n');
}

export function traceRequest(requestId: string): void {
  const entries = log.readRequest(requestId);

  process.stdout.write(`\n=== REQUEST TRACE: ${requestId} ===\n`);
  if (entries.length === 0) {
    process.stdout.write('No entries found for this requestId.\n');
    return;
  }
  process.stdout.write(`Entries: ${entries.length}\n`);
  for (const entry of entries) {
    const data = entry.data ? ` ${JSON.stringify(entry.data)}` : '';
    process.stdout.write(`  ${entry.timestamp} [${entry.level}] ${entry.message}${data}\n`);
  }
  process.stdout.write('\n');
}
