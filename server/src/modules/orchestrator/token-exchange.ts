/**
 * OAuth 2.1 Token Exchange client (RFC 8693).
 * Exchanges a widget JWT for a scoped, short-lived access token
 * from the host app before calling MCP tools or APIs.
 */
import { log } from '../../shared/logger.js';

const GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:token-exchange';
const TOKEN_TYPE_JWT = 'urn:ietf:params:oauth:token-type:jwt';

export interface TokenExchangeOpts {
  oauthTokenUrl: string;
  scope?: string;
  resource?: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

/** In-memory cache keyed by userId + scope. Tokens live ~10min. */
const cache = new Map<string, CachedToken>();
const EXPIRY_BUFFER_MS = 30_000; // refresh 30s before actual expiry

/**
 * Exchanges a widget JWT for a scoped access token via RFC 8693.
 * Caches the result until expiry minus a safety buffer.
 * @param widgetJwt - The raw widget JWT from the user's request
 * @param opts - Token exchange endpoint config
 * @param userId - User ID for cache key
 * @param requestId - Correlation ID for logging
 * @returns Scoped access token string, or null if exchange fails
 */
export async function exchangeToken(
  widgetJwt: string,
  opts: TokenExchangeOpts,
  userId: string,
  requestId?: string,
): Promise<string | null> {
  const cacheKey = `${userId}:${opts.scope ?? 'default'}`;
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    log.debug('Token exchange: cache hit', requestId, { userId });
    return cached.accessToken;
  }

  log.info('Token exchange: requesting scoped token', requestId, {
    url: opts.oauthTokenUrl, userId,
  });

  const start = Date.now();
  try {
    const body = new URLSearchParams({
      grant_type: GRANT_TYPE,
      subject_token: widgetJwt,
      subject_token_type: TOKEN_TYPE_JWT,
      ...(opts.scope ? { scope: opts.scope } : {}),
      ...(opts.resource ? { resource: opts.resource } : {}),
    });

    const response = await fetch(opts.oauthTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(5000),
    });

    const latencyMs = Date.now() - start;

    if (!response.ok) {
      const errorBody = await response.text();
      log.error('Token exchange failed', requestId, {
        status: response.status, latencyMs, error: errorBody,
      });
      return null;
    }

    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
      scope: string;
    };

    // Cache with buffer
    const expiresAt = Date.now() + (data.expires_in * 1000) - EXPIRY_BUFFER_MS;
    cache.set(cacheKey, { accessToken: data.access_token, expiresAt });

    log.info('Token exchange: success', requestId, {
      latencyMs, scope: data.scope, expiresIn: data.expires_in,
    });

    return data.access_token;
  } catch (err) {
    const latencyMs = Date.now() - start;
    log.error('Token exchange: error', requestId, {
      latencyMs, error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/** Clears the token cache (for testing). */
export function clearTokenCache(): void {
  cache.clear();
}
