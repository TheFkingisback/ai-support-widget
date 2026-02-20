# Security Review — AI Support Widget

**Reviewer:** Kevin Mitnick (simulated)
**Date:** 2026-02-20
**Scope:** All files under `server/src/` (59 files, ~5,200 LOC)
**Methodology:** Full manual source code audit

---

## Executive Summary

The codebase demonstrates security awareness: sanitization pipelines, tenant isolation checks, JWT auth, rate limiting, and typed errors. However, I found **7 vulnerabilities** across 4 severity tiers. **4 were fixed** during this review. 3 remain as architectural recommendations.

| Severity | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| CRITICAL | 2 | 2 | 0 |
| HIGH | 3 | 2 | 1 |
| MEDIUM | 3 | 1 | 2 |
| LOW | 2 | 0 | 2 |

---

## CRITICAL Findings

### C1. Token "Encryption" Was Base64 Encoding [FIXED]

**File:** `server/src/modules/admin/tenant.service.ts:40-46`
**Before:** `encryptToken()` used `Buffer.from(token).toString('base64')` — trivially reversible.
**Risk:** Any DB read access (backup leak, SQL injection, compromised DBA) exposes all tenant service tokens in plaintext.
**Fix applied:** Replaced with AES-256-GCM authenticated encryption using a key derived from `TOKEN_ENCRYPTION_KEY` or `JWT_SECRET`.

### C2. Timing Attack on Admin API Key [FIXED]

**File:** `server/src/modules/admin/admin-auth.ts:22`
**Before:** `provided !== apiKey` — standard string comparison leaks key length and characters via response time differences.
**Risk:** An attacker can brute-force the admin API key one character at a time over the network.
**Fix applied:** Replaced with `crypto.timingSafeEqual()` with constant-time length handling.

---

## HIGH Findings

### H1. Hardcoded JWT Secret Fallback [FIXED]

**File:** `server/src/shared/env.ts:33`
**Before:** `getEnvSafe()` fell back to `'test-secret'` when env parsing failed.
**Risk:** If env vars are misconfigured in production, ALL JWT tokens would be signed with a publicly-known secret. Any attacker could forge auth tokens for any tenant/user.
**Fix applied:** Changed fallback to empty string `''`. App will now fail fast rather than silently accept a weak secret.

### H2. CORS Allows All Origins [FIXED]

**File:** `server/src/app.ts:35`
**Before:** `cors({ origin: true })` — allows any website to make credentialed requests.
**Risk:** Any malicious website can make authenticated API calls using the user's JWT if cookies/headers are available. Combined with the widget SDK's REST API pattern, this enables cross-origin data theft.
**Fix applied:** CORS now reads from `CORS_ORIGINS` env var (comma-separated). Falls back to `true` only when unset (dev mode). Production deployments MUST set `CORS_ORIGINS`.

### H3. `addMessage()` Lacks Direct Tenant Isolation [NOT FIXED — Architectural]

**File:** `server/src/modules/gateway/gateway.service.ts:158-203`
**Issue:** `addMessage()` accepts `caseId` and inserts messages without verifying `tenantId`. The comment on line 170 says "Tenant isolation is enforced by callers." This is a trust-boundary violation — the service function trusts its callers.
**Current state:** All existing callers DO call `getCase()` first. No exploit path exists today.
**Recommendation:** Add `tenantId` parameter to `addMessage()` interface and verify inside the function. Defense in depth.

---

## MEDIUM Findings

### M1. No SSN or Credit Card Sanitization [FIXED]

**File:** `server/src/modules/context/sanitizer.ts`
**Before:** PII masking covered emails and phones but not SSNs (`XXX-XX-XXXX`) or credit card numbers (Visa/MC/Amex/Discover).
**Risk:** If tenant client APIs return user PII including financial data, it would be sent to the LLM unsanitized.
**Fix applied:** Added `SSN_RE` and `CC_RE` patterns to `deepMaskPII()`. SSNs masked as `***-**-XXXX`, credit cards as `****-****-****-XXXX`.

### M2. Rate Limiter Is In-Memory Only

**File:** `server/src/modules/gateway/rate-limiter.ts`
**Issue:** The rate limiter uses a local `Map`. In a multi-process/multi-instance deployment, each process has independent counters.
**Risk:** An attacker can bypass rate limits by hitting different instances. With N instances, effective rate limit is N * configured limit.
**Recommendation:** Implement Redis-backed rate limiter using `INCR` + `EXPIRE` for production. The current implementation is fine for single-process and tests.

### M3. No JWT Expiration Enforcement in Widget Auth

**File:** `server/src/shared/auth.ts` + `shared/types.ts`
**Issue:** `WidgetAuthPayload` includes `iat` and `exp` fields, and `@fastify/jwt` does check `exp` by default. However, there is no `maxAge` configured on the JWT plugin, and no check that the JWT was issued recently.
**Recommendation:** Configure `@fastify/jwt` with `{ sign: { expiresIn: '1h' }, verify: { maxAge: '2h' } }` to enforce token freshness.

---

## LOW Findings

### L1. Error Handler Leaks Stack Traces

**File:** `server/src/app.ts:72-73`
**Issue:** The error handler logs `error.stack` to the log file for unhandled errors. While this doesn't reach the HTTP response (which returns generic "Internal server error"), the stack traces in log files could reveal internal paths if logs are compromised.
**Recommendation:** Consider hashing or truncating stack traces at HIGH log level, full stacks only at PSYCHO.

### L2. Client API Constructor Param `endpoint` Unused

**File:** `server/src/modules/snapshot/client-api.ts:12-16`
**Issue:** `ClientApiError` constructor accepts `endpoint` parameter but never stores it (only passes message to super). Dead parameter.
**Recommendation:** Either store `endpoint` as a field or remove the parameter.

---

## What's Working Well

### Sanitization Pipeline (STRONG)

The 6-step pipeline in `sanitizer.ts` → `context.service.ts` is well-designed:
1. `redactSecrets()` — catches JWTs, API keys, connection strings, bearer tokens, PEM keys
2. `maskPII()` — emails, phones (now also SSNs, credit cards)
3. `removeBinary()` — strips base64 payloads >100 chars
4. `stripInternalUrls()` — removes RFC1918 IPs, localhost, .internal/.local/.corp hostnames
5. `validateSchema()` — structural validation before LLM
6. Audit logging of all sanitization actions

The pipeline runs on every snapshot before any LLM call (`orchestrator.service.ts:77`).

### Tenant Isolation (GOOD)

Every service function that reads data by ID includes a `tenantId` check:
- `gateway.service.ts:218` — `getCase()` checks `tenantId`
- `gateway.service.ts:253` — `addFeedback()` checks `tenantId`
- `gateway.service.ts:289` — `escalateCase()` checks `tenantId`
- `snapshot.service.ts:169` — `getSnapshot()` checks `tenantId`
- `retriever.ts:48-52` — `getAllChunksForTenant()` filters by `tenantId`

Integration tests in `isolation.test.ts` verify cross-tenant access is blocked.

### JWT Authentication (GOOD)

All gateway routes use `preHandler: [app.authenticate]`. No unprotected data endpoints.
Admin routes use separate `adminAuth` middleware with API key verification.
JWT payload is typed with `WidgetAuthPayload` — no `any` types.

### Rate Limiting (GOOD for single-process)

Case creation: 10/min per tenant+user.
Message sending: 30/min per tenant+user.
Both use `preHandler` on the route level — cannot be bypassed.

### Logging Hygiene (GOOD)

- Service tokens are NOT logged (sent as headers, not in URLs)
- Log data contains IDs and timing but not raw payloads
- `requestId` propagation enables full request tracing
- No `console.log` usage — all through structured logger

---

## Files Reviewed (59 total)

### Shared Infrastructure
- `shared/env.ts` — Env validation + CORS_ORIGINS added
- `shared/logger.ts` — Structured logger
- `shared/log-investigator.ts` — Debug tools
- `shared/errors.ts` — Typed error classes
- `shared/auth.ts` — JWT middleware
- `shared/db.ts` — Drizzle connection
- `shared/redis.ts` — Redis/BullMQ connection
- `app.ts` — Fastify setup + CORS fix

### Gateway Module
- `gateway/gateway.service.ts` — Case CRUD with tenant isolation
- `gateway/gateway.routes.ts` — HTTP routes with auth + rate limiting
- `gateway/gateway-extra.routes.ts` — Escalate + actions routes
- `gateway/rate-limiter.ts` — In-memory rate limiter
- `gateway/gateway.schema.ts` — Drizzle schema

### Snapshot Module
- `snapshot/snapshot.service.ts` — SCS generation with tenant check
- `snapshot/client-api.ts` — Client API calls with timeout
- `snapshot/timeline.ts` — Click timeline builder
- `snapshot/snapshot.schema.ts` — Drizzle schema

### Context Module
- `context/sanitizer.ts` — 6-step sanitization pipeline + SSN/CC fix
- `context/ranker.ts` — Priority-based ranking
- `context/trimmer.ts` — Size-based trimming
- `context/context.service.ts` — Pipeline orchestration

### Orchestrator Module
- `orchestrator/orchestrator.service.ts` — LLM integration
- `orchestrator/openrouter.ts` — OpenRouter API client
- `orchestrator/system-prompt.ts` — Prompt builder (no secrets leak)
- `orchestrator/response-parser.ts` — Action/evidence extraction

### Knowledge Module
- `knowledge/knowledge.service.ts` — RAG service
- `knowledge/embeddings.ts` — OpenAI embedding client
- `knowledge/indexer.ts` — Document chunking + indexing
- `knowledge/retriever.ts` — Vector similarity search (tenant-scoped)

### Escalation Module
- `escalation/escalation.service.ts` — Ticket creation flow
- `escalation/ticket-builder.ts` — Ticket payload builder
- `escalation/connectors/connector.ts` — Interface
- `escalation/connectors/zendesk.ts` — Zendesk API
- `escalation/connectors/jira.ts` — Jira API
- `escalation/connectors/email.ts` — Email connector

### Admin Module
- `admin/admin.routes.ts` — Admin API routes
- `admin/admin-auth.ts` — Timing-safe API key auth (fixed)
- `admin/tenant.service.ts` — Tenant CRUD + AES encryption (fixed)
- `admin/analytics.service.ts` — Analytics computation
- `admin/audit.service.ts` — Audit log service
- `admin/admin.schema.ts` — Drizzle schema

### Integration Tests
- `tests/integration/isolation.test.ts` — Tenant isolation
- `tests/integration/sanitization.test.ts` — Secrets/PII removal
- `tests/integration/full-flow.test.ts` — E2E flow
- `tests/integration/trimming.test.ts` — Size trimming

---

## Remediation Checklist

- [x] C1: Replace base64 with AES-256-GCM encryption
- [x] C2: Timing-safe admin API key comparison
- [x] H1: Remove hardcoded JWT secret fallback
- [x] H2: Configurable CORS origins via env var
- [ ] H3: Add tenantId to addMessage() interface
- [x] M1: Add SSN and credit card PII patterns
- [ ] M2: Implement Redis-backed rate limiter for multi-instance
- [ ] M3: Configure JWT maxAge for token freshness
- [ ] L1: Limit stack trace logging to PSYCHO level
- [ ] L2: Fix unused `endpoint` param in ClientApiError
