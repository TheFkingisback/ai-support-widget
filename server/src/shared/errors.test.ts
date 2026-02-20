import { describe, it, expect, beforeEach } from 'vitest';
import { setLogLevel, setLogsDir } from './logger.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  AppError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  ForbiddenError,
  RateLimitError,
  ConflictError,
} from './errors.js';

describe('Error Classes', () => {
  beforeEach(() => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'errors-test-'));
    setLogsDir(tmpDir);
    setLogLevel('low');
  });

  it('AppError has correct statusCode and errorCode', () => {
    const err = new AppError(422, 'UPLOAD_TOO_LARGE', 'File too large');
    expect(err.statusCode).toBe(422);
    expect(err.errorCode).toBe('UPLOAD_TOO_LARGE');
    expect(err.message).toBe('File too large');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('NotFoundError returns 404', () => {
    const err = new NotFoundError('Case', 'cas_123');
    expect(err.statusCode).toBe(404);
    expect(err.errorCode).toBe('CASE_NOT_FOUND');
    expect(err.message).toBe('Case cas_123 not found');
  });

  it('UnauthorizedError returns 401', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.errorCode).toBe('UNAUTHORIZED');
  });

  it('ForbiddenError returns 403', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.errorCode).toBe('FORBIDDEN');
  });

  it('ValidationError returns 400 with field', () => {
    const err = new ValidationError('Email is required', 'email');
    expect(err.statusCode).toBe(400);
    expect(err.errorCode).toBe('VALIDATION_ERROR');
    expect(err.field).toBe('email');
  });

  it('RateLimitError returns 429', () => {
    const err = new RateLimitError();
    expect(err.statusCode).toBe(429);
    expect(err.errorCode).toBe('RATE_LIMIT');
  });

  it('ConflictError returns 409', () => {
    const err = new ConflictError('Already exists', 'DUPLICATE');
    expect(err.statusCode).toBe(409);
    expect(err.errorCode).toBe('DUPLICATE');
  });
});
