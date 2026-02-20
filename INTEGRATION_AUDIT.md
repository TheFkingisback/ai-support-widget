# Integration Audit Report

**Date:** 2026-02-20
**Scope:** All routes in `server/src/` vs `API-CONTRACT.md`

---

## 1. Route Compliance Matrix

### Support Gateway Routes

| Contract Route | Method | Implemented | Path Match | Auth | Request Schema | Response Schema | Error Codes | Status |
|---|---|---|---|---|---|---|---|---|
| `/api/cases` | POST | `gateway.routes.ts:50` | PASS | Bearer JWT | `{ message: string }` (1-5000) | `{ case: Case, snapshot: { id } }` | 401, 429, 400 | PASS |
| `/api/cases/:caseId` | GET | `gateway.routes.ts:105` | PASS | Bearer JWT | — | `{ case: Case, messages: Message[] }` | 401, 403, 404 | PASS |
| `/api/cases/:caseId/messages` | POST | `gateway.routes.ts:122` | PASS | Bearer JWT | `{ content: string }` (1-5000) | `{ message: Message }` | 401, 403, 404, 429, 400 | PASS |
| `/api/cases/:caseId/feedback` | POST | `gateway.routes.ts:168` | PASS | Bearer JWT | `{ feedback: 'positive'\|'negative' }` | `{ ok: true }` | 401, 403, 404, 400 | PASS |
| `/api/cases/:caseId/escalate` | POST | `gateway-extra.routes.ts:37` | PASS | Bearer JWT | `{ reason?: string }` (max 2000) | `{ ticketId, ticketUrl }` | 401, 403, 404, 400 | PASS |
| `/api/cases/:caseId/actions` | POST | `gateway-extra.routes.ts:70` | **FIXED** | Bearer JWT | `{ action: SuggestedAction }` | `{ result: string }` | 401, 403, 404, 400 | PASS |
| `/api/health` | GET | `app.ts:85` | PASS | None | — | `{ ok: true, version }` | — | PASS |

### Admin Routes

| Contract Route | Method | Implemented | Path Match | Auth | Response Schema | Status |
|---|---|---|---|---|---|---|
| `/api/admin/tenants` | GET | `admin.routes.ts:44` | PASS | Admin API key | `{ tenants: Tenant[] }` | PASS |
| `/api/admin/tenants` | POST | `admin.routes.ts:56` | PASS | Admin API key | `{ tenant: Tenant }` | PASS |
| `/api/admin/tenants/:id` | PATCH | `admin.routes.ts:80` | PASS | Admin API key | `{ tenant: Tenant }` | PASS |
| `/api/admin/tenants/:id/analytics` | GET | `admin.routes.ts:104` | PASS | Admin API key | `{ analytics: AnalyticsSummary }` | PASS |
| `/api/admin/tenants/:id/cases` | GET | `admin.routes.ts:119` | PASS | Admin API key | `{ cases: Case[] }` | PASS |
| `/api/admin/tenants/:id/audit` | GET | `admin.routes.ts:135` | PASS | Admin API key | `{ entries, ...PaginatedResponse }` | PASS |

---

## 2. Issues Found and Fixed

### CRITICAL: Missing Route — `POST /api/cases/:caseId/actions`

- **Severity:** Critical
- **Description:** API-CONTRACT.md specifies `POST /api/cases/:caseId/actions` with `Bearer` auth, request body `{ action: SuggestedAction }`, and response `{ result: string }`. The route was completely absent from `gateway.routes.ts`.
- **Root Cause:** The `OrchestratorService.handleAction()` method existed but was never wired to an HTTP route.
- **Fix:** Created `gateway-extra.routes.ts` with the `/actions` route. When orchestrator is available, delegates to `orchestratorService.handleAction()`. Fallback verifies tenant access and returns acknowledgment.
- **Files Changed:**
  - `server/src/modules/gateway/gateway-extra.routes.ts` — NEW (escalate + actions routes)
  - `server/src/modules/gateway/gateway.routes.ts` — Refactored to import extra routes
  - `server/src/modules/gateway/gateway-actions.test.ts` — NEW (4 tests)

### LOW: `addMessage()` Tenant Isolation Note

- **Severity:** Low (mitigated by design)
- **Description:** `gateway.service.ts:addMessage()` does not directly verify `tenantId`. However, all code paths call `getCase()` (which enforces tenant isolation) before calling `addMessage()`. This is enforced at the route level:
  - Direct route: calls `service.getCase()` first (line 155)
  - Via orchestrator: `orchestratorService.handleMessage()` calls `gatewayService.getCase()` first
- **Assessment:** No vulnerability. Defense in depth is maintained by callers. Added documentation comment.

---

## 3. Tenant Isolation Audit

### Gateway Service DB Queries

| Method | Tenant Check | How |
|---|---|---|
| `createCase()` | N/A (creates with caller's tenantId) | tenantId from JWT passed to insert |
| `getCase()` | PASS | Fetches by caseId, then verifies `row.tenantId !== tenantId` → ForbiddenError |
| `addMessage()` | Delegated | Callers always call `getCase()` first; caseId lookup only |
| `addFeedback()` | PASS | Fetches by caseId, then verifies `row.tenantId !== tenantId` → ForbiddenError |
| `escalateCase()` | PASS | Fetches by caseId, then verifies `row.tenantId !== tenantId` → ForbiddenError |
| `logAudit()` | N/A (insert only) | tenantId from caller |

### Admin Service Queries

| Method | Tenant Check | How |
|---|---|---|
| `listTenants()` | Admin-only route | Protected by admin API key |
| `createTenant()` | Admin-only route | Protected by admin API key |
| `updateTenant()` | Admin-only route | Protected by admin API key |
| `getAnalytics(tenantId)` | Scoped | Queries filtered by tenantId parameter |
| `getAuditLog(tenantId)` | Scoped | Queries filtered by tenantId parameter |

### Escalation Service

| Method | Tenant Check | How |
|---|---|---|
| `escalate()` | PASS | Calls `gatewayService.getCase(caseId, tenantId)` which enforces isolation |

### Orchestrator Service

| Method | Tenant Check | How |
|---|---|---|
| `handleMessage()` | PASS | Calls `gatewayService.getCase(caseId, tenantId)` which enforces isolation |
| `handleAction()` | PASS | Calls `gatewayService.getCase(caseId, tenantId)` which enforces isolation |

---

## 4. Error Code Compliance

### Contract Format
```json
{ "statusCode": N, "error": "DOMAIN_REASON", "message": "...", "requestId": "req_..." }
```

### Error Classes vs Contract

| Error Class | Status | Code | Matches Contract | Notes |
|---|---|---|---|---|
| `UnauthorizedError` | 401 | `UNAUTHORIZED` | PASS | |
| `ForbiddenError` | 403 | `FORBIDDEN` | PASS | |
| `NotFoundError` | 404 | `{RESOURCE}_NOT_FOUND` | PASS | e.g., `CASE_NOT_FOUND` |
| `ValidationError` | 400 | `VALIDATION_ERROR` | PASS | Includes `field` |
| `RateLimitError` | 429 | `RATE_LIMIT` | PASS | |
| `LLMError` | 502 | `LLM_API_ERROR` | PASS | |
| Unhandled | 500 | `INTERNAL_ERROR` | PASS | Catch-all in error handler |

### Error Handler (app.ts:54-82)

- `AppError` instances: Returns correct statusCode, errorCode, message, optional field, requestId — **PASS**
- Unhandled errors: Returns 500 with `INTERNAL_ERROR` — **PASS**
- `requestId` always included — **PASS**

---

## 5. Type Compliance

### Shared Types (shared/types.ts)

All types match API-CONTRACT.md Section 1 exactly:
- `Case`, `Message`, `SuggestedAction`, `Evidence` — PASS
- `SupportContextSnapshot` and all sub-interfaces — PASS
- `Tenant`, `TenantConfig`, `AnalyticsSummary` — PASS
- `ApiError`, `PaginatedResponse` — PASS
- Client integration response types — PASS

---

## 6. Auth Compliance

| Aspect | Contract | Implementation | Status |
|---|---|---|---|
| JWT in Authorization header | Bearer token | `@fastify/jwt` with `request.jwtVerify()` | PASS |
| Payload shape | `WidgetAuthPayload` | TypeScript enforced via `FastifyJWT.payload` | PASS |
| Admin auth | API key | Custom `adminAuth` middleware | PASS |
| Health endpoint | No auth | No middleware | PASS |

---

## 7. Summary

| Category | Total Checks | Pass | Fixed | Notes |
|---|---|---|---|---|
| Routes | 13 | 12 | 1 | Missing `/actions` route added |
| Tenant Isolation | 10 | 10 | 0 | All enforced directly or by callers |
| Error Codes | 7 | 7 | 0 | All match contract format |
| Types | 20+ | 20+ | 0 | Exact match with contract |
| Auth | 4 | 4 | 0 | JWT + admin key verified |
