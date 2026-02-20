import { log } from './logger.js';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly errorClass: string;
  public readonly field?: string;

  constructor(
    statusCode: number,
    errorCode: string,
    message: string,
    errorClass = 'application',
    field?: string,
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.errorClass = errorClass;
    this.field = field;
    log.error(`${errorCode}: ${message}`, undefined, {
      statusCode,
      errorClass,
      ...(field && { field }),
    });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(404, `${resource.toUpperCase()}_NOT_FOUND`, `${resource} ${id} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, errorCode = 'CONFLICT') {
    super(409, errorCode, message);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message, 'auth');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, 'FORBIDDEN', message, 'auth');
    this.name = 'ForbiddenError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(400, 'VALIDATION_ERROR', message, 'validation', field);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(429, 'RATE_LIMIT', message);
    this.name = 'RateLimitError';
  }
}
