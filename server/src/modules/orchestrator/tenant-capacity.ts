import { randomUUID } from 'node:crypto';
import type { Redis } from 'ioredis';
import { ConflictError, RateLimitError } from '../../shared/errors.js';

const acquire = `
  local now=redis.call('TIME'); local ms=now[1]*1000+math.floor(now[2]/1000)
  redis.call('ZREMRANGEBYSCORE',KEYS[1],'-inf',ms)
  if redis.call('ZCARD',KEYS[1])>=tonumber(ARGV[1]) then return 0 end
  redis.call('ZADD',KEYS[1],ms+180000,ARGV[2]); redis.call('PEXPIRE',KEYS[1],180000)
  return 1`;
const renew = `
  if not redis.call('ZSCORE',KEYS[1],ARGV[1]) then return 0 end
  local now=redis.call('TIME')
  redis.call('ZADD',KEYS[1],now[1]*1000+math.floor(now[2]/1000)+180000,ARGV[1])
  return redis.call('PEXPIRE',KEYS[1],180000)`;

type LeaseClient = Pick<Redis, 'eval' | 'zrem'>;

export function withTenantCapacity<T>(redis: LeaseClient, tenantId: string, slots: number, work: () => Promise<T>) {
  return useSlots(redis, `support:active-turns:${tenantId}`, slots, work,
    new RateLimitError('This workspace is processing other conversations. Retry shortly.'));
}

export function withConversation<T>(redis: LeaseClient, scope: string, work: () => Promise<T>) {
  return useSlots(redis, `support:conversation:${scope}`, 1, work,
    new ConflictError('A message is already being processed in this conversation', 'ACTION_CONVERSATION_BUSY'));
}

async function useSlots<T>(redis: LeaseClient, key: string, slots: number, fn: () => Promise<T>, busy: Error) {
  const member = randomUUID();
  if (!await redis.eval(acquire, 1, key, slots, member)) throw busy;
  const timer = setInterval(() => { void redis.eval(renew, 1, key, member).catch(() => {}); }, 60_000);
  timer.unref();
  try { return await fn(); }
  finally { clearInterval(timer); await redis.zrem(key, member).catch(() => {}); }
}
