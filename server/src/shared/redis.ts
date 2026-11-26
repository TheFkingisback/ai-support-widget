import Redis from 'ioredis';
import { Queue, type ConnectionOptions, type QueueOptions } from 'bullmq';
import { errorCode, log } from './logger.js';

let redisClient: Redis | null = null;
let redisConfig: { host: string; port: number; maxRetriesPerRequest: null } | null = null;

export function getRedis(redisUrl?: string): Redis {
  if (redisClient) return redisClient;

  const url = redisUrl ?? process.env.REDIS_URL;
  if (!url) {
    throw new Error('REDIS_URL is not set');
  }

  const parsed = new URL(url);
  redisConfig = {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    maxRetriesPerRequest: null,
  };

  redisClient = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    commandTimeout: 3000,
  });

  redisClient.on('connect', () => {
    log.info('Redis connected');
  });

  redisClient.on('error', (err) => {
    log.error('Redis error', undefined, { errorCode: errorCode(err) });
  });

  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    redisConfig = null;
    log.info('Redis connection closed');
  }
}

export function getBullMQConnection(): ConnectionOptions {
  if (redisConfig) return redisConfig;
  getRedis();
  return redisConfig!;
}

export function createQueue(name: string, opts?: Partial<QueueOptions>): Queue {
  return new Queue(name, {
    connection: getBullMQConnection(),
    ...opts,
  });
}
