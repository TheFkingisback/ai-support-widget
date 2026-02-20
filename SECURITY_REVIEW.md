# Security Review — AI Support Widget

**Reviewer:** Kevin Mitnick (simulated)
**Date:** 2026-02-20 (v3 — post-hardening audit)
**Scope:** All 56 files in `server/src/`, `shared/types.ts`
**Methodology:** Manual source code audit — every file read line-by-line
**Focus areas:** Secrets in LLM context, tenant isolation, JWT validation, rate limiting, PII leaks in logs, sanitization completeness
**Tests:** 205 passed, 0 failed (29 test files)

---

## Executive Summary

The codebase has solid security foundations: 5-step sanitization, JWT-gated routes, tenant-isolated DB queries, typed errors, and encrypted service tokens. After three rounds of auditing and hardening (Sprint 8 integration, initial review, Security Hardening Sprint A + remaining items), all critical, high, and medium issues have been resolved.

| Severity | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| CRITICAL | 3 | 3 | 0 |
| HIGH | 3 | 3 | 0 |
| MEDIUM | 4 | 4 | 0 |

---

## CRITICAL Findings

### C1. CORS Wildcard Allowed All Origins [FIXED]

- **File:** `app.ts:35-37`
- **Before:** `origin: true` when `CORS_ORIGINS` not set — any domain could make authenticated requests
- **Risk:** Cross-origin credential theft, CSRF against widget API
- **Fix:** Default to `['http://localhost:3000', 'http://localhost:3001']` + warning log

### C2. Full Client API URLs Logged to Disk [FIXED]

- **File:** `client-api.ts:38,57,71,87`
- **Before:** `{ url: fullUrl }` logged in 4 places — includes base URL structure, endpoint paths, and query parameters (userId)
- **Risk:** Log files (JSON lines in `logs/app-*.log`) could be accessed via backup leaks, log aggregators, or compromised monitoring. Exposes internal API topology and user identifiers
- **Fix:** Log only `{ endpoint }` (path only, no host/params)

### C3. LLM Error Response Could Echo API Keys [FIXED]

- **File:** `openrouter.ts:102-103`
- **Before:** `throw new LLMError(\`OpenRouter ${res.status}: ${text}\`)` — full upstream error body included verbatim. AppError constructor logs this to disk
- **Risk:** If OpenRouter reflects the Authorization header or request body in error responses, the OPENROUTER_API_KEY would be written to log files
- **Fix:** Truncate to 200 chars + regex-redact any `Bearer` tokens in error text

---

## HIGH Findings

### H1. `addMessage()` Missing Tenant Isolation [FIXED]

- **File:** `gateway.service.ts`
- **Before:** `addMessage()`, `addFeedback()`, `escalateCase()` update queries used only `eq(cases.id, caseId)` without tenantId in WHERE clause
- **Risk:** Any new caller that skips `getCase()` enables cross-tenant mutation
- **Fix:** Added `and(eq(cases.id, caseId), eq(cases.tenantId, tenantId))` to all 3 update WHERE clauses. Defense-in-depth at the DB query level

### H2. `getEnvSafe()` Allows Empty JWT Secret [FIXED]

- **File:** `env.ts:27-42`
- **Before:** Zod validation failure fell back to `process.env.JWT_SECRET ?? ''` — empty string is a valid fallback
- **Risk:** Server starts with empty JWT secret = any forged token is accepted. Full tenant impersonation
- **Fix:** Throw hard if JWT_SECRET is empty outside `NODE_ENV=test`

### H3. Internal requestIds Sent to LLM [FIXED]

- **File:** `system-prompt.ts:83`
- **Before:** Backend error context included `req=${e.requestId}` in the system prompt sent to the LLM
- **Risk:** LLM could echo internal infrastructure identifiers to end users, aiding reconnaissance. requestIds encode UUID fragments
- **Fix:** Stripped requestId from backend error lines in LLM prompt

---

## MEDIUM Findings

### M1. Timing-Safe Comparison Leaked Key Length [FIXED]

- **File:** `admin-auth.ts:6-15`
- **Before:** When buffer lengths differ, `crypto.timingSafeEqual(bufA, bufA)` was called as a dummy op. But buffer allocation for different lengths reveals the actual key length via timing
- **Fix:** Hash both inputs with SHA-256 before comparison — guarantees 32-byte constant-length comparison regardless of input length

### M2. Dead `SAFE_FIELDS` Set Provides False Assurance [FIXED]

- **File:** `sanitizer.ts:23-37`
- **Before:** 37-entry `SAFE_FIELDS` Set declared but never referenced by any function
- **Risk:** Developers assume field-level protection exists when it doesn't. The sanitization works on value content (regex matching), not field names
- **Fix:** Removed dead code

### M3. Full Stack Traces in Log Files [FIXED]

- **File:** `app.ts:75-77`
- **Before:** `log.error('Unhandled error', reqId, { stack: error.stack })` — full stack traces written to JSON log files
- **Risk:** File paths, line numbers, and module structure exposed in logs
- **Fix:** Log only error message, not stack

### M4. In-Memory Rate Limiter Not Production-Ready [FIXED]

- **File:** `rate-limiter.ts`
- **Before:** Only in-memory rate limiter available — multi-instance deployments multiply effective rate limits by instance count
- **Risk:** Rate limit bypass in horizontal scaling scenarios
- **Fix:** Implemented `createRedisRateLimiter(redis)` using atomic `INCR` + `PEXPIRE` with `rl:` key prefix. In-memory limiter remains available for single-instance / test use. 5 tests in `rate-limiter-redis.test.ts` verify behavior with mock Redis

---

## Previous Findings (Sprint 8 review) — Status

| Finding | Status |
|---------|--------|
| C1 (Sprint 8): Token base64 encoding → AES-256-GCM | Verified fixed in `tenant.service.ts:49-56` |
| C2 (Sprint 8): String comparison on admin API key | Upgraded to SHA-256 hash comparison in this review |
| H1 (Sprint 8): Hardcoded JWT secret fallback | Upgraded to throw-on-empty in this review |
| H2 (Sprint 8): CORS `origin: true` | Fixed to localhost-only default in this review |
| M1 (Sprint 8): SSN/CC sanitization missing | Verified present in `sanitizer-helpers.ts` |

---

## Security Hardening Sprint A — Applied

All 8 recommendations from the initial review have been implemented:

### Helmet Security Headers [APPLIED]
- **File:** `app.ts` — `@fastify/helmet` registered before CORS
- Headers enforced: `X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Content-Security-Policy`, `X-Powered-By` removed
- CSP directives: `defaultSrc: 'self'`, `scriptSrc: 'self'`, `styleSrc: 'self'`
- 4 tests in `security.test.ts` verify all headers

### JWT maxAge Enforcement [APPLIED]
- **File:** `auth.ts` — `verify: { maxAge: opts.maxAge ?? '8h' }` via `@fastify/jwt`
- New env var `JWT_MAX_AGE` (optional, defaults to `'8h'`)
- 2 tests in `security.test.ts` verify old tokens rejected, fresh tokens accepted

### Request Body Size Limit [APPLIED]
- **File:** `app.ts` — `bodyLimit: 1_048_576` (1MB) in Fastify constructor
- Production-level enforcement at socket layer (inject() bypasses for testing)
- 1 test in `security.test.ts` verifies bodyLimit is configured

### Dedicated TOKEN_ENCRYPTION_KEY [APPLIED]
- **File:** `tenant.service.ts` — `deriveKey()` uses `getEnvSafe()` instead of raw `process.env`
- Prefers `TOKEN_ENCRYPTION_KEY` env var, falls back to `JWT_SECRET` with warning log
- Throws when neither key is set
- 4 tests in `tenant-security.test.ts` verify key selection, fallback, and mismatch behavior

### Redis-Backed Rate Limiter [APPLIED]
- **File:** `rate-limiter.ts` — `createRedisRateLimiter(redis)` alongside existing in-memory limiter
- Uses atomic `INCR` + `PEXPIRE` for multi-instance consistency
- 5 tests in `rate-limiter-redis.test.ts` with mock Redis client

### Log File Rotation [APPLIED]
- **File:** `logger.ts` — `rotateIfNeeded()` checks file size before each write
- Configurable via `LOG_MAX_FILE_SIZE` (default 10MB) and `LOG_MAX_FILES` (default 5)
- Numbered rotation: `app.log` → `app.log.1` → `app.log.2` → deleted at max
- 4 tests in `log-rotation.test.ts` verify rotation behavior

---

## What's Working Well

### Sanitization Pipeline (STRONG)
1. `redactSecrets()` — JWTs, API keys, connection strings, pre-signed URLs, Bearer tokens, PEM keys
2. `maskPII()` — emails (`e***@d***.com`), phones, SSN (`***-**-1234`), credit cards (`****-****-****-1234`)
3. `removeBinary()` — strips base64 payloads >100 chars
4. `stripInternalUrls()` — RFC 1918 IPs, localhost, `.internal/.local/.corp` hostnames
5. `validateSchema()` — structural SCS validation before LLM consumption
6. Full audit trail of all sanitization actions logged

Pipeline runs on every snapshot before any LLM call (`orchestrator.service.ts:77`).
Sanitizer split into `sanitizer.ts` (123 lines, public API) + `sanitizer-helpers.ts` (191 lines, patterns & traversal).

### Tenant Isolation (STRONG)
- `getCase()` — `and(eq(id, caseId), eq(tenantId, tenantId))` (gateway.helpers.ts)
- `addMessage()` — tenantId in WHERE clause (gateway.service.ts)
- `addFeedback()` — tenantId in WHERE clause (gateway.service.ts)
- `escalateCase()` — tenantId in WHERE clause (gateway.service.ts)
- `getSnapshot()` — same pattern (snapshot.service.ts)
- `getAllChunksForTenant()` — tenant-scoped retrieval (retriever.ts)
- Integration tests: `isolation.test.ts`, `isolation-edge.test.ts`, `escalation-isolation.test.ts`, `admin-isolation.test.ts`, `concurrent-tenants.test.ts` — 20 tests total

### JWT Authentication (STRONG)
- All 6 gateway routes use `preHandler: [app.authenticate]`
- All 6 admin routes use `preHandler: [adminAuth]`
- No unprotected data endpoints (only `/api/health` is public)
- JWT payload typed as `WidgetAuthPayload` — no `any` types
- `@fastify/jwt` handles signature verification + expiry checking
- `maxAge: '8h'` enforced — stale tokens rejected
- 5 edge case tests for malformed/tampered/incomplete JWTs (`jwt-edge.test.ts`)

### Service Token Encryption (GOOD)
- AES-256-GCM authenticated encryption (tenant.service.ts)
- 12-byte random IV per encryption
- AuthTag prevents ciphertext tampering
- Key derived from dedicated `TOKEN_ENCRYPTION_KEY` (preferred) or `JWT_SECRET` fallback via SHA-256
- Warning logged when using JWT_SECRET fallback

### Rate Limiting (STRONG)
- Case creation: 10/min per `tenant:user`
- Message sending: 30/min per `tenant:user`
- Applied at route level via `preHandler` — cannot be bypassed
- In-memory limiter for single-instance; Redis-backed limiter for production multi-instance
- Message endpoint boundary test verifies 30th request passes, 31st returns 429

### Input Validation (GOOD)
- All request bodies validated with Zod schemas via shared `validateBody()` helper
- Message content: max 5000 chars
- Tenant names: max 200 chars
- Pagination: max 100 per page
- Escalation reasons: max 2000 chars
- Body size limit: 1MB at transport layer

### Security Headers (GOOD)
- `@fastify/helmet` with CSP, X-Frame-Options, X-Content-Type-Options, X-Powered-By removal
- CORS restricted to configured origins (localhost-only default)

### Log Security (GOOD)
- No full URLs in logs (endpoint path only)
- No stack traces in log files
- LLM error responses truncated + Bearer tokens redacted
- No requestIds leaked to LLM context
- Log rotation prevents unbounded disk growth

---

## Remaining Recommendations

| Priority | Recommendation | Effort |
|----------|---------------|--------|
| Low | IP-based rate limiting alongside user-based | Medium |

All other recommendations from previous reviews have been implemented.

---

## Files Modified Across All Reviews

| File | Change |
|------|--------|
| `server/src/app.ts` | CORS restricted; stack trace removed; Helmet registered; bodyLimit set; JWT maxAge |
| `server/src/shared/env.ts` | Empty JWT_SECRET throws; added JWT_MAX_AGE, TOKEN_ENCRYPTION_KEY, LOG_MAX_FILE_SIZE, LOG_MAX_FILES |
| `server/src/shared/auth.ts` | AuthOptions interface; verify.maxAge; removed dead authMiddleware; fixed request casts |
| `server/src/shared/logger.ts` | Log file rotation with configurable max size and max files |
| `server/src/modules/gateway/gateway.service.ts` | tenantId in all update WHERE clauses |
| `server/src/modules/gateway/rate-limiter.ts` | Redis-backed rate limiter; requestId propagation |
| `server/src/modules/admin/tenant.service.ts` | deriveKey() uses getEnvSafe(), prefers TOKEN_ENCRYPTION_KEY |
| `server/src/modules/snapshot/client-api.ts` | Removed full URL from 4 log sites |
| `server/src/modules/orchestrator/openrouter.ts` | Truncate + redact LLM errors; unknown model warning |
| `server/src/modules/orchestrator/system-prompt.ts` | Strip requestId from LLM context |
| `server/src/modules/admin/admin-auth.ts` | SHA-256 hash comparison (constant-time) |
| `server/src/modules/context/sanitizer.ts` | Removed SAFE_FIELDS dead code; split to sanitizer-helpers.ts |
| `server/package.json` | Added `@fastify/helmet` dependency |

---

## Security Test Coverage

| Test File | Tests | What It Verifies |
|-----------|-------|-----------------|
| `security.test.ts` | 7 | Helmet headers, JWT maxAge, bodyLimit |
| `tenant-security.test.ts` | 4 | TOKEN_ENCRYPTION_KEY selection, fallback, mismatch |
| `rate-limiter-redis.test.ts` | 5 | Redis rate limiter with mock Redis |
| `log-rotation.test.ts` | 4 | Log file rotation behavior |
| `isolation.test.ts` | 6 | Cross-tenant case, snapshot, knowledge blocking |
| `isolation-edge.test.ts` | 6 | Cross-tenant message, feedback, escalation blocking |
| `escalation-isolation.test.ts` | 3 | Escalation service tenant isolation |
| `admin-isolation.test.ts` | 3 | Admin API tenant data scoping |
| `concurrent-tenants.test.ts` | 2 | Race conditions across tenants |
| `jwt-edge.test.ts` | 5 | Malformed/tampered/incomplete JWTs |
| `sanitizer-edge.test.ts` | 24 | PII masking, secret redaction edge cases |
| `error-handling.test.ts` | 22 | HTTP error response format consistency |
| **Total** | **91** | **Security-focused tests** |

---

## Remediation Checklist

- [x] C1: CORS wildcard → localhost-only default
- [x] C2: Client API URLs removed from logs
- [x] C3: LLM error response truncated + redacted
- [x] H1: tenantId added to all update WHERE clauses (addMessage, addFeedback, escalateCase)
- [x] H2: Empty JWT_SECRET now throws
- [x] H3: requestIds stripped from LLM system prompt
- [x] M1: Timing-safe comparison via SHA-256 hashing
- [x] M2: Dead SAFE_FIELDS code removed
- [x] M3: Stack traces removed from log output
- [x] M4: Redis-backed rate limiter implemented
- [x] Helmet security headers (CSP, X-Frame-Options, nosniff, X-Powered-By removal)
- [x] JWT maxAge enforcement (default 8h)
- [x] Request body size limit (1MB)
- [x] Dedicated TOKEN_ENCRYPTION_KEY env var
- [x] Log file rotation (configurable max size + max files)
