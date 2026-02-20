import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRedisRateLimiter, type RateLimiter } from './rate-limiter.js';
import { RateLimitError } from '../../shared/errors.js';
import { setLogLevel } from '../../shared/logger.js';

/**
 * Minimal Redis mock that implements INCR, PEXPIRE, KEYS, DEL.
 * Simulates atomic counter behavior for rate limiter testing.
 */
function createMockRedis() {
  const store = new Map<string, { value: number; expiresAt: number | null }>();

  return {
    async incr(key: string): Promise<number> {
      const now = Date.now();
      const entry = store.get(key);
      if (!entry || (entry.expiresAt !== null && now >= entry.expiresAt)) {
        store.set(key, { value: 1, expiresAt: null });
        return 1;
      }
      entry.value += 1;
      return entry.value;
    },

    async pexpire(key: string, ms: number): Promise<number> {
      const entry = store.get(key);
      if (!entry) return 0;
      entry.expiresAt = Date.now() + ms;
      return 1;
    },

    async keys(pattern: string): Promise<string[]> {
      const prefix = pattern.replace('*', '');
      return [...store.keys()].filter((k) => k.startsWith(prefix));
    },

    async del(...keys: string[]): Promise<number> {
      let count = 0;
      for (const key of keys) {
        if (store.delete(key)) count++;
      }
      return count;
    },

    _store: store,
  };
}

describe('Redis Rate Limiter', () => {
  let limiter: RateLimiter;
  let redis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    setLogLevel('off');
    redis = createMockRedis();
    // Cast mock as Redis since we implement the methods used by createRedisRateLimiter
    limiter = createRedisRateLimiter(redis as never);
  });

  afterEach(() => {
    redis._store.clear();
  });

  it('allows exactly limit requests in window', async () => {
    for (let i = 0; i < 5; i++) {
      await expect(limiter.check('key1', 5, 60_000)).resolves.toBeUndefined();
    }
    await expect(limiter.check('key1', 5, 60_000)).rejects.toThrow(RateLimitError);
  });

  it('different keys have independent limits', async () => {
    for (let i = 0; i < 3; i++) {
      await limiter.check('tenantA', 3, 60_000);
    }
    await expect(limiter.check('tenantA', 3, 60_000)).rejects.toThrow(RateLimitError);
    await expect(limiter.check('tenantB', 3, 60_000)).resolves.toBeUndefined();
  });

  it('reset clears all rate limit keys', async () => {
    await limiter.check('key1', 1, 60_000);
    await expect(limiter.check('key1', 1, 60_000)).rejects.toThrow(RateLimitError);

    limiter.reset();
    // Wait for async reset
    await new Promise((r) => setTimeout(r, 10));

    await expect(limiter.check('key1', 1, 60_000)).resolves.toBeUndefined();
  });

  it('bucket resets after window expires', async () => {
    await limiter.check('short', 1, 1);
    await new Promise((r) => setTimeout(r, 10));
    await expect(limiter.check('short', 1, 1)).resolves.toBeUndefined();
  });

  it('uses rl: prefix for Redis keys', async () => {
    await limiter.check('mykey', 5, 60_000);
    expect(redis._store.has('rl:mykey')).toBe(true);
  });
});
