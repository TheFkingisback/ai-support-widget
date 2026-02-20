import type Redis from 'ioredis';
import { RateLimitError } from '../../shared/errors.js';
import { log } from '../../shared/logger.js';

export interface RateLimiter {
  check(key: string, limit: number, windowMs: number, requestId?: string): Promise<void>;
  reset(): void;
}

/**
 * In-memory rate limiter. Suitable for tests and single-process deployments.
 * For production with multiple processes, use createRedisRateLimiter.
 */
export function createInMemoryRateLimiter(): RateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return {
    async check(key, limit, windowMs, requestId) {
      const now = Date.now();
      const bucket = buckets.get(key);

      if (!bucket || now >= bucket.resetAt) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return;
      }

      bucket.count += 1;

      if (bucket.count > limit) {
        log.warn('Rate limit exceeded', requestId, { key, limit, windowMs });
        throw new RateLimitError(
          `Rate limit exceeded: ${limit} requests per ${windowMs / 1000}s`,
        );
      }
    },

    reset() {
      buckets.clear();
    },
  };
}

const RATE_LIMIT_PREFIX = 'rl:';

/**
 * Redis-backed rate limiter using INCR + PEXPIRE for atomic counting.
 * Safe for multi-instance deployments — all instances share the same counters.
 */
export function createRedisRateLimiter(redis: Redis): RateLimiter {
  return {
    async check(key, limit, windowMs, requestId) {
      const redisKey = `${RATE_LIMIT_PREFIX}${key}`;

      const count = await redis.incr(redisKey);

      if (count === 1) {
        await redis.pexpire(redisKey, windowMs);
      }

      if (count > limit) {
        log.warn('Rate limit exceeded', requestId, { key, limit, windowMs });
        throw new RateLimitError(
          `Rate limit exceeded: ${limit} requests per ${windowMs / 1000}s`,
        );
      }
    },

    async reset() {
      const keys = await redis.keys(`${RATE_LIMIT_PREFIX}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    },
  };
}
