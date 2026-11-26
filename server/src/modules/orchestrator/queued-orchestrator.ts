import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { currentTurn, inTurn } from '../gateway/turn-identity.js';
import { retryable } from '../gateway/turn-idempotency.js';
import { withTenantCapacity } from './tenant-capacity.js';
import { Queue, QueueEvents, Worker, type ConnectionOptions } from 'bullmq';
import type { Message } from '../../shared/types.js';
import { AppError } from '../../shared/errors.js';
import { log } from '../../shared/logger.js';
import { decryptToken, encryptToken } from '../admin/encryption.js';
import type { OrchestratorService } from './orchestrator.types.js';

type Input = { turn?: string; caseId: string; tenantId: string; userId: string; content: string; requestId?: string; options?: Parameters<OrchestratorService['handleMessage']>[6] };
type Outcome = { message: Message } | { error: { status: number; code: string; message: string } };
type JobData = { inputRef: string } | { payload: string };
const payloadTTL = 3600;
type QueueMode = 'inline' | 'producer' | 'worker';

function redisConnection(redisUrl: string): ConnectionOptions {
  const url = new URL(redisUrl);
  return {
    host: url.hostname, port: Number(url.port) || 6379,
    db: Number(url.pathname.slice(1)) || 0,
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}

export async function createQueuedOrchestrator(service: OrchestratorService, redisUrl: string, mode: QueueMode, concurrency: number, name = 'support-ai-turns-v1') {
  const connection = redisConnection(redisUrl);
  const queue = new Queue<JobData, string>(name, {
    connection: { ...connection, commandTimeout: 5000, maxRetriesPerRequest: 1, enableOfflineQueue: false }, defaultJobOptions: { attempts: 1, removeOnComplete: { age: 3600 }, removeOnFail: true },
  });
  const events = mode === 'worker' ? undefined : new QueueEvents(name, { connection });
  const redis = new Redis(redisUrl, { commandTimeout: 3000, maxRetriesPerRequest: 1 });
  redis.on('error', () => log.error('Conversation cache unavailable'));
  const worker = mode === 'producer' ? undefined : new Worker<JobData, string>(name, async job => {
    // Claims and queue events can outlive their retention window on an idle queue.
    // Keep conversation contents in expiring encrypted keys. Drain pre-upgrade jobs too.
    const payload = 'payload' in job.data ? job.data.payload : await redis.get(job.data.inputRef);
    if (!payload) throw new Error('Queued request expired');
    const input = JSON.parse(decryptToken(payload)) as Input;
    let outcome: Outcome;
    try {
      const ageMs = Date.now() - job.timestamp;
      if (ageMs > 30_000) log.warn('Conversation queue delayed', input.requestId, { ageMs, tenantId: input.tenantId });
      const message = await withTenantCapacity(redis, input.tenantId, Math.max(1, Math.ceil(concurrency / 2)),
        () => inTurn(input.turn, () => service.handleMessage(input.caseId, input.tenantId, input.userId, input.content, input.requestId, undefined, input.options)));
      outcome = { message };
    } catch (failure) {
      const error = failure instanceof AppError ? { status: failure.statusCode, code: failure.errorCode, message: failure.message }
        : { status: 500, code: 'TURN_PROCESSING_FAILED', message: 'The conversation turn could not be completed' };
      log.warn('Queued conversation turn failed', input.requestId, { errorCode: error.code });
      outcome = { error };
    }
    const encoded = encryptToken(JSON.stringify(outcome));
    if ('payload' in job.data) return encoded;
    const resultRef = `support:turn-result:${name}:${job.id}`;
    await redis.set(resultRef, encoded, 'EX', payloadTTL);
    await redis.del(job.data.inputRef);
    return resultRef;
  }, { connection, concurrency, maxStalledCount: 1 });
  // BullMQ attaches a closing listener for each pending wait and removes it when that job settles.
  queue.setMaxListeners(0);
  const connectionFailed = () => log.error('Conversation queue connection failed');
  queue.on('error', connectionFailed);
  events?.on('error', connectionFailed);
  worker?.on('error', connectionFailed);
  await Promise.all([queue.waitUntilReady(), events?.waitUntilReady(), worker?.waitUntilReady()]);

  // BullMQ's age policy normally runs only when another job completes. Also retire
  // pre-upgrade job payloads and result events when an installation goes idle.
  let cleaning = false;
  async function pruneCompleted() {
    if (cleaning) return;
    cleaning = true;
    try {
      for (const state of ['completed', 'failed'] as const) {
        while ((await queue.clean(payloadTTL * 1000, 500, state)).length === 500) { /* next batch */ }
      }
      await redis.xtrim(queue.toKey('events'), 'MINID', String(Date.now() - payloadTTL * 1000) + '-0');
    } catch { log.warn('Could not expire old conversation queue entries'); }
    finally { cleaning = false; }
  }
  const cleanup = worker ? setInterval(() => void pruneCompleted(), payloadTTL * 1000) : undefined;
  cleanup?.unref();
  if (worker) await pruneCompleted();

  return {
    service: {
      ...service,
      async handleMessage(caseId, tenantId, userId, content, requestId, _widgetJwt, options) {
        if (!events) throw new AppError(503, 'TURN_QUEUE_UNAVAILABLE', 'The conversation queue is unavailable');
        const input: Input = { turn: currentTurn(), caseId, tenantId, userId, content, requestId, options };
        let outcome: Outcome;
        try {
          const id = input.turn ?? randomUUID();
          const inputRef = `support:turn-input:${name}:${id}`;
          await redis.set(inputRef, encryptToken(JSON.stringify(input)), 'EX', payloadTTL, 'NX');
          const job = await queue.add('turn', { inputRef }, { jobId: id });
          const result = await job.waitUntilFinished(events, 90_000);
          const encoded = result.startsWith('support:turn-result:') ? await redis.get(result) : result;
          if (!encoded) { await job.remove(); throw new Error('Queued result expired'); }
          outcome = JSON.parse(decryptToken(encoded)) as Outcome;
          if ('error' in outcome && retryable(outcome.error.status, outcome.error.code)) await job.remove();
        } catch {
          log.warn('Queue result unavailable within the request deadline', requestId, { tenantId });
          throw new AppError(503, 'TURN_PROCESSING_UNAVAILABLE', 'The conversation turn could not be completed');
        }
        if ('error' in outcome) throw new AppError(outcome.error.status, outcome.error.code, outcome.error.message);
        return outcome.message;
      },
    } satisfies OrchestratorService,
    async close() {
      clearInterval(cleanup);
      await worker?.close(); await events?.close(); await queue.close(); redis.disconnect();
    },
  };
}
