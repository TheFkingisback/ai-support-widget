import { RateLimitError } from '../../shared/errors.js';
import { log } from '../../shared/logger.js';

export interface RateLimiter {
  check(key: string, limit: number, windowMs: number): Promise<void>;
  reset(): void;
}

/**
 * In-memory rate limiter. Suitable for tests and single-process deployments.
 * For production with multiple processes, swap to Redis-backed implementation.
 */
export function createInMemoryRateLimiter(): RateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  return {
    async check(key, limit, windowMs) {
      const now = Date.now();
      const bucket = buckets.get(key);

      if (!bucket || now >= bucket.resetAt) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return;
      }

      bucket.count += 1;

      if (bucket.count > limit) {
        log.warn('Rate limit exceeded', undefined, { key, limit, windowMs });
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
