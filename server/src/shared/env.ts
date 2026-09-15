import { z } from 'zod';
import { ADMIN_PASSWORD_HASH_PATTERN } from '../modules/admin/admin-password.js';

const LogLevel = z.enum(['off', 'low', 'medium', 'high', 'psycho']);
export type LogLevel = z.infer<typeof LogLevel>;

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  ADMIN_JWT_SECRET: z.string().min(32),
  WIDGET_JWT_SECRET: z.string().min(32),
  LEGACY_WIDGET_TENANTS: z.string().default(''),
  LEGACY_WIDGET_ACCEPT_UNTIL: z.preprocess(value => value === '' ? undefined : value, z.string().datetime().optional()),
  OPENROUTER_API_KEY: z.string().min(1),
  LOG_LEVEL: LogLevel.default('medium'),
  PORT: z.coerce.number().int().positive().default(3000),
  MAX_CONTEXT_BYTES: z.coerce.number().int().positive().default(5_000_000),
  ADMIN_API_KEY: z.string().min(16),
  ADMIN_EMAIL: z.string().trim().email().transform((email) => email.toLowerCase()),
  ADMIN_PASSWORD_HASH: z.string().regex(ADMIN_PASSWORD_HASH_PATTERN),
  CORS_ORIGINS: z.string().optional(),
  JWT_MAX_AGE: z.string().optional(),
  TOKEN_ENCRYPTION_KEY: z.string().min(32).optional(),
  MCP_SERVER_URL: z.string().url().optional(),
  MCP_SERVICE_TOKEN: z.string().optional(),
  OAUTH_TOKEN_URL: z.string().url().optional(),
  LOG_MAX_FILE_SIZE: z.coerce.number().int().positive().default(10_485_760),
  LOG_MAX_FILES: z.coerce.number().int().positive().default(5),
}).superRefine((env, ctx) => {
  if (!env.TOKEN_ENCRYPTION_KEY || [env.JWT_SECRET, env.ADMIN_JWT_SECRET, env.WIDGET_JWT_SECRET].includes(env.TOKEN_ENCRYPTION_KEY)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'A distinct TOKEN_ENCRYPTION_KEY is required' });
  }
  if (new Set([env.JWT_SECRET, env.ADMIN_JWT_SECRET, env.WIDGET_JWT_SECRET]).size !== 3) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'JWT signing secrets must be distinct' });
  }
  if (env.LEGACY_WIDGET_TENANTS || env.LEGACY_WIDGET_ACCEPT_UNTIL) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Legacy widget authentication is retired; remove legacy variables' });
  }
  if (env.MCP_SERVER_URL || env.MCP_SERVICE_TOKEN || env.OAUTH_TOKEN_URL) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Global MCP and OAuth exchange are retired; configure MCP per tenant' });
  }
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
    if (process.env.NODE_ENV !== 'test') return getEnv();
    const jwtSecret = process.env.JWT_SECRET ?? '';
    return {
      DATABASE_URL: process.env.DATABASE_URL ?? '',
      REDIS_URL: process.env.REDIS_URL ?? '',
      JWT_SECRET: jwtSecret,
      ADMIN_JWT_SECRET: process.env.ADMIN_JWT_SECRET ?? '',
      WIDGET_JWT_SECRET: process.env.WIDGET_JWT_SECRET ?? '',
      LEGACY_WIDGET_TENANTS: process.env.LEGACY_WIDGET_TENANTS ?? '',
      LEGACY_WIDGET_ACCEPT_UNTIL: process.env.LEGACY_WIDGET_ACCEPT_UNTIL,
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ?? '',
      LOG_LEVEL: LogLevel.catch('medium').parse(process.env.LOG_LEVEL),
      PORT: Number(process.env.PORT) || 3000,
      MAX_CONTEXT_BYTES: Number(process.env.MAX_CONTEXT_BYTES) || 5_000_000,
      ADMIN_API_KEY: process.env.ADMIN_API_KEY ?? '',
      ADMIN_EMAIL: process.env.ADMIN_EMAIL?.trim().toLowerCase() ?? '',
      ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH ?? '',
      CORS_ORIGINS: process.env.CORS_ORIGINS,
      JWT_MAX_AGE: process.env.JWT_MAX_AGE,
      TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY,
      MCP_SERVER_URL: process.env.MCP_SERVER_URL,
      MCP_SERVICE_TOKEN: process.env.MCP_SERVICE_TOKEN,
      OAUTH_TOKEN_URL: process.env.OAUTH_TOKEN_URL,
      LOG_MAX_FILE_SIZE: Number(process.env.LOG_MAX_FILE_SIZE) || 10_485_760,
      LOG_MAX_FILES: Number(process.env.LOG_MAX_FILES) || 5,
    };
  }
}

export function resetEnvCache(): void {
  cached = null;
}
