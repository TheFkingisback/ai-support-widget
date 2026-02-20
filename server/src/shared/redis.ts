import Redis from 'ioredis';
import { Queue, type QueueOptions } from 'bullmq';
import { log } from './logger.js';

let redisClient: Redis | null = null;

export function getRedis(redisUrl?: string): Redis {
  if (redisClient) return redisClient;

  const url = redisUrl ?? process.env.REDIS_URL;
  if (!url) {
    throw new Error('REDIS_URL is not set');
  }

  redisClient = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  redisClient.on('connect', () => {
    log.info('Redis connected');
  });

  redisClient.on('error', (err) => {
    log.error('Redis error', undefined, { error: err.message });
  });

  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    log.info('Redis connection closed');
  }
}

export function createQueue(name: string, opts?: Partial<QueueOptions>): Queue {
  const redis = getRedis();
  return new Queue(name, {
    connection: redis,
    ...opts,
  });
}
