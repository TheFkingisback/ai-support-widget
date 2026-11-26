import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createQueuedOrchestrator } from '../../modules/orchestrator/queued-orchestrator.js';
import { withConversation, withTenantCapacity } from '../../modules/orchestrator/tenant-capacity.js';
import { createRedisRateLimiter } from '../../modules/gateway/rate-limiter.js';
import { currentTurn, inTurn } from '../../modules/gateway/turn-identity.js';
import { AppError } from '../../shared/errors.js';
import type { OrchestratorService } from '../../modules/orchestrator/orchestrator.types.js';

const url = process.env.TURN_TEST_REDIS_URL;
describe.skipIf(!url)('Distributed conversation controls on Redis', () => {
  const name = 'turn-test-' + randomUUID();
  let first: Redis;
  let second: Redis;
  beforeAll(() => {
    if (!['localhost', '127.0.0.1'].includes(new URL(url!).hostname)) throw new Error('Dedicated local Redis required');
    first = new Redis(url!); second = new Redis(url!);
    vi.stubEnv('TOKEN_ENCRYPTION_KEY', randomUUID());
  });
  afterAll(() => { first?.disconnect(); second?.disconnect(); vi.unstubAllEnvs(); });

  it('shares rate limits between servers and sets an expiry', async () => {
    const key = 'test-'+randomUUID();
    await createRedisRateLimiter(first).check(key, 1, 60_000);
    await expect(createRedisRateLimiter(second).check(key, 1, 60_000)).rejects.toMatchObject({ statusCode: 429 });
    expect(await second.pttl('rl:'+key)).toBeGreaterThan(0);
  });

  it('reserves capacity for other tenants and serializes each conversation across workers', async () => {
    const key = randomUUID();
    await withTenantCapacity(first, key, 1, async () => {
      await expect(withTenantCapacity(second, key, 1, async () => {})).rejects.toMatchObject({statusCode:429});
      await expect(withTenantCapacity(second, 'other-'+key, 1, async () => true)).resolves.toBe(true);
      await withConversation(first, key, async () => {
        await expect(withConversation(second, key, async () => {})).rejects.toMatchObject({errorCode:'ACTION_CONVERSATION_BUSY'});
      });
    });
    await expect(withConversation(second, key, async () => true)).resolves.toBe(true);
  });

  it('joins duplicate jobs and processes a transient failure again with the original identity', async () => {
    let transient = true;
    let entered!: () => void; let resume!: () => void;
    const started = new Promise<void>(resolve => { entered = resolve; });
    const release = new Promise<void>(resolve => { resume = resolve; });
    const handleMessage = vi.fn<OrchestratorService['handleMessage']>(async (caseId, _tenant, _user, content) => {
      entered(); await release;
      if (content === 'retry' && transient) { transient = false; throw new AppError(503,'TEMPORARY','Try again'); }
      return { id: currentTurn()!, caseId, role:'assistant', content:'synthetic answer', actions:[], evidence:[], confidence:null, createdAt:new Date().toISOString() };
    });
    const service = { handleMessage, handleAction: async () => '' };
    const runtime = await createQueuedOrchestrator(service, url!, 'inline', 4, name);
    const send = (id: string, body: string) => inTurn(id, () => runtime.service.handleMessage('case','tenant','user',body));
    try {
      const id = randomUUID();
      const original = send(id, 'join');
      await started;
      const duplicate = send(id, 'join');
      resume();
      const replies = await Promise.all([original, duplicate]);
      expect(replies[0]).toEqual(replies[1]); expect(replies[0].id).toBe(id);
      expect(handleMessage).toHaveBeenCalledTimes(1);
      const retry = randomUUID();
      await expect(send(retry,'retry')).rejects.toMatchObject({errorCode:'TEMPORARY'});
      expect((await send(retry,'retry')).id).toBe(retry);
      expect(handleMessage).toHaveBeenCalledTimes(3);
      const ttl = await first.ttl(`support:turn-result:${name}:${retry}`);
      expect(ttl).toBeGreaterThan(0); expect(ttl).toBeLessThanOrEqual(3600);
    } finally { resume(); await runtime.close(); }
  });
});
