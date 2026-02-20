import type { z } from 'zod';
import { ValidationError } from './errors.js';

/**
 * Parses request body/query with a Zod schema, throws ValidationError on failure.
 */
export function validateBody<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues[0].message,
      parsed.error.issues[0].path[0] as string | undefined,
    );
  }
  return parsed.data;
}
