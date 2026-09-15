import { z } from 'zod';
import { ValidationError, ForbiddenError } from '../../shared/errors.js';
import { validateBody } from '../../shared/validation.js';
import { redactContent } from '../context/safe-content.js';

const text = z.string().max(4096);
const nullable = text.nullable().default(null);
const date = z.string().datetime({ offset: true });
const doc = z.object({ id: text, title: text, content: z.string().max(32000), category: text });
export const pushContextSchema = z.object({
  userState: z.object({
    userId: z.string().min(1).max(200), tenantId: z.string().min(1).max(200),
    roles: z.array(text).max(30), plan: text, featuresEnabled: z.array(text).max(100),
    profile: z.object({ fullName: text.optional(), email: text.optional(), country: text.optional() }).optional(),
    entities: z.array(z.object({ type: text, id: text.optional(), description: text.optional(), status: text,
      metadata: z.record(z.unknown()).default({}) })).max(100),
    activeErrors: z.array(z.object({ errorCode: text, errorClass: z.enum(['validation','permission','infra','business']),
      retryable: z.boolean(), userActionable: z.boolean(), resourceId: text, occurredAt: date })).max(100),
    limitsReached: z.array(z.object({ limit: text, current: z.number(), max: z.number() })).max(100),
  }),
  userHistory: z.object({ windowHours: z.number().positive().max(720), events: z.array(z.object({
    ts: date, event: text, page: text, elementId: nullable, intent: nullable, correlationRequestId: nullable,
  })).max(1000) }),
  userLogs: z.object({
    recentRequests: z.array(z.object({ ts: date, route: text, httpStatus: z.number().int(), errorCode: nullable,
      resourceId: nullable, timingMs: z.number(), requestId: text })).max(1000),
    jobs: z.array(z.object({ jobId: text, queue: text, status: z.enum(['queued','running','succeeded','failed','canceled']),
      errorCode: nullable, lastStage: nullable, createdAt: date, updatedAt: date, durationMs: z.number().nullable() })).max(100),
    errors: z.array(z.object({ ts: date, errorCode: text, errorClass: text, route: text, requestId: text, resourceId: nullable })).max(1000),
  }),
  knowledgePack: z.object({ docs: z.array(doc).max(50) }).optional(),
  businessRules: z.record(z.unknown()).optional(),
});
export type PushContext = z.infer<typeof pushContextSchema>;
/** Validates the push-only contract and rejects mismatched identities before persistence. */
export function parsePushContext(value: unknown, tenantId: string, userId: string): PushContext {
  if (!value) throw new ValidationError('context with userState, userHistory and userLogs is required', 'context');
  if (Buffer.byteLength(JSON.stringify(value), 'utf8') > 262144) throw new ValidationError('Context exceeds 256 KiB', 'context');
  const parsed = validateBody(pushContextSchema, value);
  if (parsed.userState.tenantId !== tenantId || parsed.userState.userId !== userId) {
    throw new ForbiddenError('Context identity must match the authenticated session');
  }
  return redactContent(parsed) as PushContext;
}
