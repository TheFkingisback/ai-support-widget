import { z } from 'zod';

const LogLevel = z.enum(['off', 'low', 'medium', 'high', 'psycho']);
export type LogLevel = z.infer<typeof LogLevel>;

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  OPENROUTER_API_KEY: z.string().min(1),
  LOG_LEVEL: LogLevel.default('medium'),
  PORT: z.coerce.number().int().positive().default(3000),
  MAX_CONTEXT_BYTES: z.coerce.number().int().positive().default(5_000_000),
  CORS_ORIGINS: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  cached = envSchema.parse(process.env);
  return cached;
}

export function getEnvSafe(): Env {
  try {
    return getEnv();
  } catch {
    return {
      DATABASE_URL: process.env.DATABASE_URL ?? '',
      REDIS_URL: process.env.REDIS_URL ?? '',
      JWT_SECRET: process.env.JWT_SECRET ?? '',
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ?? '',
      LOG_LEVEL: (process.env.LOG_LEVEL as LogLevel) ?? 'medium',
      PORT: Number(process.env.PORT) || 3000,
      MAX_CONTEXT_BYTES: Number(process.env.MAX_CONTEXT_BYTES) || 5_000_000,
      CORS_ORIGINS: process.env.CORS_ORIGINS,
    };
  }
}

export function resetEnvCache(): void {
  cached = null;
}
