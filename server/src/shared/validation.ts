import type { z } from 'zod';
import { ValidationError } from './errors.js';

/**
 * Parses request body/query with a Zod schema, throws ValidationError on failure.
 */
export function validateBody<S extends z.ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues[0].message,
      parsed.error.issues[0].path[0] as string | undefined,
    );
  }
  return parsed.data;
}
