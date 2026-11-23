import { Queue, QueueEvents, Worker, type ConnectionOptions } from 'bullmq';
import type { Message } from '../../shared/types.js';
import { AppError } from '../../shared/errors.js';
import { log } from '../../shared/logger.js';
import { decryptToken, encryptToken } from '../admin/encryption.js';
import type { OrchestratorService } from './orchestrator.types.js';

type Input = { caseId: string; tenantId: string; userId: string; content: string; requestId?: string; options?: Parameters<OrchestratorService['handleMessage']>[6] };
type Outcome = { message: Message } | { error: { status: number; code: string; message: string } };
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
  const queue = mode === 'worker' ? undefined : new Queue<{ payload: string }, string>(name, {
    connection, defaultJobOptions: { attempts: 1, removeOnComplete: { age: 3600 }, removeOnFail: { age: 3600 } },
  });
  const events = queue ? new QueueEvents(name, { connection }) : undefined;
  const worker = mode === 'producer' ? undefined : new Worker<{ payload: string }, string>(name, async job => {
    const input = JSON.parse(decryptToken(job.data.payload)) as Input;
    let outcome: Outcome;
    try {
      outcome = { message: await service.handleMessage(input.caseId, input.tenantId, input.userId, input.content, input.requestId, undefined, input.options) };
    } catch (failure) {
      const error = failure instanceof AppError ? { status: failure.statusCode, code: failure.errorCode, message: failure.message }
        : { status: 500, code: 'TURN_PROCESSING_FAILED', message: 'The conversation turn could not be completed' };
      log.warn('Queued conversation turn failed', input.requestId, { errorCode: error.code });
      outcome = { error };
    }
    return encryptToken(JSON.stringify(outcome));
  }, { connection, concurrency, maxStalledCount: 0 });
  // BullMQ attaches a closing listener for each pending wait and removes it when that job settles.
  queue?.setMaxListeners(0);
  const connectionFailed = () => log.error('Conversation queue connection failed');
  queue?.on('error', connectionFailed);
  events?.on('error', connectionFailed);
  worker?.on('error', connectionFailed);
  await Promise.all([queue?.waitUntilReady(), events?.waitUntilReady(), worker?.waitUntilReady()]);

  return {
    service: {
      ...service,
      async handleMessage(caseId, tenantId, userId, content, requestId, _widgetJwt, options) {
        if (!queue || !events) throw new AppError(503, 'TURN_QUEUE_UNAVAILABLE', 'The conversation queue is unavailable');
        const input: Input = { caseId, tenantId, userId, content, requestId, options };
        let outcome: Outcome;
        try {
          const job = await queue.add('turn', { payload: encryptToken(JSON.stringify(input)) });
          outcome = JSON.parse(decryptToken(await job.waitUntilFinished(events))) as Outcome;
        } catch {
          throw new AppError(503, 'TURN_PROCESSING_UNAVAILABLE', 'The conversation turn could not be completed');
        }
        if ('error' in outcome) throw new AppError(outcome.error.status, outcome.error.code, outcome.error.message);
        return outcome.message;
      },
    } satisfies OrchestratorService,
    async close() { await worker?.close(); await events?.close(); await queue?.close(); },
  };
}
