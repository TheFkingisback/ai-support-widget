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
  ADMIN_API_KEY: z.string().default('admin-dev-key'),
  CORS_ORIGINS: z.string().optional(),
  JWT_MAX_AGE: z.string().optional(),
  TOKEN_ENCRYPTION_KEY: z.string().optional(),
  MCP_SERVER_URL: z.string().url().optional(),
  MCP_SERVICE_TOKEN: z.string().optional(),
  LOG_MAX_FILE_SIZE: z.coerce.number().int().positive().default(10_485_760),
  LOG_MAX_FILES: z.coerce.number().int().positive().default(5),
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
    const jwtSecret = process.env.JWT_SECRET ?? '';
    if (!jwtSecret && process.env.NODE_ENV !== 'test') {
      throw new Error('JWT_SECRET must be set — refusing to start with empty secret');
    }
    return {
      DATABASE_URL: process.env.DATABASE_URL ?? '',
      REDIS_URL: process.env.REDIS_URL ?? '',
      JWT_SECRET: jwtSecret,
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ?? '',
      LOG_LEVEL: LogLevel.catch('medium').parse(process.env.LOG_LEVEL),
      PORT: Number(process.env.PORT) || 3000,
      MAX_CONTEXT_BYTES: Number(process.env.MAX_CONTEXT_BYTES) || 5_000_000,
      ADMIN_API_KEY: process.env.ADMIN_API_KEY ?? 'admin-dev-key',
      CORS_ORIGINS: process.env.CORS_ORIGINS,
      JWT_MAX_AGE: process.env.JWT_MAX_AGE,
      TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY,
      MCP_SERVER_URL: process.env.MCP_SERVER_URL,
      MCP_SERVICE_TOKEN: process.env.MCP_SERVICE_TOKEN,
      LOG_MAX_FILE_SIZE: Number(process.env.LOG_MAX_FILE_SIZE) || 10_485_760,
      LOG_MAX_FILES: Number(process.env.LOG_MAX_FILES) || 5,
    };
  }
}

export function resetEnvCache(): void {
  cached = null;
}
