import { log } from '../../shared/logger.js';
import { AppError } from '../../shared/errors.js';
import type {
  Tenant,
  GetUserStateResponse,
  GetUserHistoryResponse,
  GetUserLogsResponse,
  GetBusinessRulesResponse,
} from '../../shared/types.js';

export class ClientApiError extends AppError {
  constructor(message: string, endpoint: string) {
    super(502, 'CLIENT_API_ERROR', message, 'integration');
    this.name = 'ClientApiError';
  }
}

interface ClientApiOpts {
  baseUrl: string;
  serviceToken: string;
  timeoutMs?: number;
}

export async function callClientApi<T>(
  opts: ClientApiOpts,
  endpoint: string,
  params: Record<string, string>,
  requestId?: string,
): Promise<T> {
  const { baseUrl, serviceToken, timeoutMs = 5000 } = opts;

  const url = new URL(endpoint, baseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const fullUrl = url.toString();
  log.info(`Client API call: ${endpoint}`, requestId, { endpoint });

  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${serviceToken}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    const timingMs = Date.now() - start;

    if (!response.ok) {
      log.error(`Client API error: ${endpoint}`, requestId, {
        status: response.status,
        timingMs,
      });
      throw new ClientApiError(
        `Client API ${endpoint} returned ${response.status}`,
        endpoint,
      );
    }

    const data = (await response.json()) as T;

    log.info(`Client API success: ${endpoint}`, requestId, {
      status: response.status,
      timingMs,
    });

    return data;
  } catch (err) {
    const timingMs = Date.now() - start;

    if (err instanceof ClientApiError) throw err;

    const message =
      err instanceof Error && err.name === 'AbortError'
        ? `Client API ${endpoint} timed out after ${timeoutMs}ms`
        : `Client API ${endpoint} failed: ${err instanceof Error ? err.message : String(err)}`;

    log.error(message, requestId, { endpoint, timingMs });
    throw new ClientApiError(message, endpoint);
  } finally {
    clearTimeout(timeout);
  }
}

export async function getUserState(
  opts: ClientApiOpts,
  userId: string,
  requestId?: string,
): Promise<GetUserStateResponse> {
  return callClientApi<GetUserStateResponse>(
    opts,
    '/support/user-state',
    { userId },
    requestId,
  );
}

export async function getUserHistory(
  opts: ClientApiOpts,
  userId: string,
  windowHours: number,
  requestId?: string,
): Promise<GetUserHistoryResponse> {
  return callClientApi<GetUserHistoryResponse>(
    opts,
    '/support/user-history',
    { userId, windowHours: String(windowHours) },
    requestId,
  );
}

export async function getUserLogs(
  opts: ClientApiOpts,
  userId: string,
  windowHours: number,
  requestId?: string,
): Promise<GetUserLogsResponse> {
  return callClientApi<GetUserLogsResponse>(
    opts,
    '/support/user-logs',
    { userId, windowHours: String(windowHours) },
    requestId,
  );
}

export async function getBusinessRules(
  opts: ClientApiOpts,
  requestId?: string,
): Promise<GetBusinessRulesResponse> {
  return callClientApi<GetBusinessRulesResponse>(
    opts,
    '/support/business-rules',
    {},
    requestId,
  );
}
