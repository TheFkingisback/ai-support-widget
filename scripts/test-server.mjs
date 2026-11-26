import { randomBytes } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const cwd = fileURLToPath(new URL('../server/', import.meta.url));
const require = createRequire(new URL('../server/package.json', import.meta.url));
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', windowsHide: true }).trim();
const ids = [];
function start(port, image, args = []) {
  const id = docker('run', '--detach', '--rm', '--publish', `127.0.0.1::${port}`, ...args, image);
  ids.push(id);
  return { id, port: docker('port', id, String(port)).split(':').at(-1) };
}

try {
  const password = randomBytes(24).toString('hex');
  const pg = start(5432, 'pgvector/pgvector:pg16', ['--tmpfs', '/var/lib/postgresql/data',
    '-e', 'POSTGRES_DB=aiwidget_dev', '-e', `POSTGRES_PASSWORD=${password}`]);
  const redis = start(6379, 'redis:7-alpine', ['--tmpfs', '/data']);
  for (let i = 0; ; i++) {
    try {
      docker('exec', pg.id, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres', '-d', 'aiwidget_dev');
      if (docker('exec', redis.id, 'redis-cli', 'ping') === 'PONG') break;
    } catch (error) { if (i >= 60) throw error; }
    if (i >= 60) throw new Error('Local database readiness timed out');
    await sleep(500);
  }
  const url = `postgres://postgres:${password}@127.0.0.1:${pg.port}/aiwidget_dev`;
  const redisUrl = `redis://127.0.0.1:${redis.port}`;
  const env = { ...process.env, DATABASE_URL: url, REDIS_URL: redisUrl, ACTION_TEST_DATABASE_URL: url,
    WORKSPACE_TEST_DATABASE_URL: url, TURN_TEST_REDIS_URL: redisUrl };
  const manifest = require.resolve('vitest/package.json');
  const vitest = resolve(dirname(manifest), require(manifest).bin.vitest);
  const result = spawnSync(process.execPath, [vitest, 'run', '--maxWorkers=2', ...process.argv.slice(2)],
    { cwd, env, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  for (const id of ids.reverse()) docker('stop', '--time', '3', id);
}
