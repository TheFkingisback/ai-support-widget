# Integration Audit Report

**Date:** 2026-02-20 (Updated)
**Scope:** All routes in `server/src/` vs `API-CONTRACT.md`

---

## 1. Route Compliance Matrix

### Support Gateway Routes

| Contract Route | Method | Implemented | Auth | Request Schema | Response Schema | Error Codes | Status |
|---|---|---|---|---|---|---|---|
| `/api/cases` | POST | `gateway.routes.ts:39` | Bearer JWT | `{ message: string }` (1-5000) | `{ case: Case, snapshot: { id } }` | 401, 429, 400 | PASS |
| `/api/cases/:caseId` | GET | `gateway.routes.ts:84` | Bearer JWT | -- | `{ case: Case, messages: Message[] }` | 401, 404 | PASS |
| `/api/cases/:caseId/messages` | POST | `gateway.routes.ts:100` | Bearer JWT | `{ content: string }` (1-5000) | `{ message: Message }` | 401, 404, 429, 400 | PASS |
| `/api/cases/:caseId/feedback` | POST | `gateway.routes.ts:137` | Bearer JWT | `{ feedback: 'positive'\|'negative' }` | `{ ok: true }` | 401, 404, 400 | PASS |
| `/api/cases/:caseId/escalate` | POST | `gateway-extra.routes.ts:34` | Bearer JWT | `{ reason?: string }` (max 2000) | `{ ticketId, ticketUrl }` | 401, 404, 400 | PASS |
| `/api/cases/:caseId/actions` | POST | `gateway-extra.routes.ts:69` | Bearer JWT | `{ action: SuggestedAction }` | `{ result: string }` | 401, 404, 400 | PASS |
| `/api/health` | GET | `app.ts:88` | None | -- | `{ ok: true, version }` | -- | PASS |

### Admin Routes

| Contract Route | Method | Implemented | Auth | Response Schema | Status |
|---|---|---|---|---|---|
| `/api/admin/tenants` | GET | `admin.routes.ts:44` | Admin API key | `{ tenants: Tenant[] }` | PASS |
| `/api/admin/tenants` | POST | `admin.routes.ts:56` | Admin API key | `{ tenant: Tenant }` | PASS |
| `/api/admin/tenants/:id` | PATCH | `admin.routes.ts:80` | Admin API key | `{ tenant: Tenant }` | PASS |
| `/api/admin/tenants/:id/analytics` | GET | `admin.routes.ts:104` | Admin API key | `{ analytics: AnalyticsSummary }` | PASS |
| `/api/admin/tenants/:id/cases` | GET | `admin.routes.ts:119` | Admin API key | `{ cases: Case[] }` | PASS |
| `/api/admin/tenants/:id/audit` | GET | `admin.routes.ts:135` | Admin API key | `{ entries: AuditEntry[], total, page, pageSize, hasMore }` | FIXED |

**Result: All 13 routes match API-CONTRACT.md paths, methods, and auth.**

---

## 2. Issues Found and Fixed (This Audit)

### FIX 1: Audit route response shape (admin.routes.ts:150-155)

- **Severity:** Medium
- **Problem:** Returned `{ entries: result.data, ...result }` which spread the internal
  `PaginatedResponse` fields (`data`, `total`, `page`, `pageSize`, `hasMore`) alongside
  `entries`. The `data` field was a duplicate of `entries`, leaking internal structure.
- **Fix:** Explicitly map response fields: `{ entries, total, page, pageSize, hasMore }`.

### FIX 2: Defense-in-depth tenant isolation in getCase (gateway.service.ts:205)

- **Severity:** Medium (information leakage)
- **Problem:** Queried by `cases.id` only, then checked `tenantId` in application code. This
  leaked existence information (different error for "not found" vs "wrong tenant").
- **Fix:** Changed WHERE to `and(eq(cases.id, caseId), eq(cases.tenantId, tenantId))`.
  Cross-tenant access now returns 404 (not found) -- no information leakage.

### FIX 3: Defense-in-depth tenant isolation in addFeedback (gateway.service.ts:241)

- **Severity:** Medium (information leakage)
- **Problem:** Same pattern as getCase -- queried by ID only, checked tenantId after.
- **Fix:** Combined into single WHERE: `and(eq(cases.id, caseId), eq(cases.tenantId, tenantId))`.

### FIX 4: Defense-in-depth tenant isolation in escalateCase (gateway.service.ts:277)

- **Severity:** Medium (information leakage)
- **Problem:** Same pattern as getCase.
- **Fix:** Combined into single WHERE: `and(eq(cases.id, caseId), eq(cases.tenantId, tenantId))`.

### FIX 5: Defense-in-depth tenant isolation in getSnapshot (snapshot.service.ts:156)

- **Severity:** Medium (information leakage)
- **Problem:** Queried by snapshot ID only, then checked tenantId in application code.
  Timing attacks could enumerate valid snapshot IDs across tenants.
- **Fix:** Changed WHERE to `and(eq(snapshots.id, snapshotId), eq(snapshots.tenantId, tenantId))`.

---

## 3. Tenant Isolation Audit

### Gateway Service DB Queries

| Method | tenantId in WHERE | Status |
|---|---|---|
| `createCase()` | INSERT (tenantId in values) | PASS |
| `getCase()` | `and(id, tenantId)` in WHERE | FIXED |
| `addMessage()` | By caseId only (callers verify via getCase) | NOTE |
| `addFeedback()` | `and(id, tenantId)` in WHERE | FIXED |
| `escalateCase()` | `and(id, tenantId)` in WHERE | FIXED |
| `logAudit()` | INSERT (tenantId in values) | PASS |

### Snapshot Service DB Queries

| Method | tenantId in WHERE | Status |
|---|---|---|
| `buildSnapshot()` | INSERT (tenantId in values) | PASS |
| `getSnapshot()` | `and(id, tenantId)` in WHERE | FIXED |

### Admin Service Queries

| Method | Tenant Scoping | Status |
|---|---|---|
| `listTenants()` | Admin-only route (API key) | PASS |
| `createTenant()` | Admin-only route (API key) | PASS |
| `updateTenant()` | Admin-only route (API key) | PASS |
| `getAnalytics(tenantId)` | dataSource.getCasesByTenant filters by tenantId | PASS |
| `getAuditLog(tenantId)` | store.findByTenant filters by tenantId | PASS |

### Orchestrator / Escalation / Knowledge

| Method | Tenant Check | Status |
|---|---|---|
| `orchestrator.handleMessage()` | Calls `getCase(caseId, tenantId)` first | PASS |
| `orchestrator.handleAction()` | Calls `getCase(caseId, tenantId)` first | PASS |
| `escalation.escalate()` | Calls `getCase(caseId, tenantId)` first | PASS |
| `knowledge.getRelevantDocs()` | Passes tenantId to retriever.search | PASS |

### Known Limitation: addMessage()

`addMessage()` does not take a `tenantId` parameter. All current callers verify tenant
ownership via `getCase(caseId, tenantId)` before calling `addMessage()`. Risk is low:
- Route handler: calls `getCase()` at line 128 before `addMessage()` at line 129
- Orchestrator: calls `getCase()` at line 57 before `addMessage()` at lines 61 and 140
- Escalation: calls `getCase()` at line 60 before any case mutations

Recommendation: Consider adding tenantId to the interface in a future sprint.

---

## 4. Error Code Compliance

### Error Response Format (API-CONTRACT.md Section 4)

```json
{ "statusCode": 404, "error": "CASE_NOT_FOUND", "message": "Case cas_abc123 not found", "requestId": "req_xyz789" }
```

| Error Class | Status | Code | Matches Contract |
|---|---|---|---|
| `UnauthorizedError` | 401 | `UNAUTHORIZED` | PASS |
| `ForbiddenError` | 403 | `FORBIDDEN` | PASS |
| `NotFoundError` | 404 | `{RESOURCE}_NOT_FOUND` | PASS |
| `ValidationError` | 400 | `VALIDATION_ERROR` | PASS (includes `field`) |
| `RateLimitError` | 429 | `RATE_LIMIT` | PASS |
| `LLMError` | 502 | `LLM_API_ERROR` | PASS |
| Unhandled | 500 | `INTERNAL_ERROR` | PASS |

Error handler (app.ts:57-84) includes `requestId` in all responses. PASS.

---

## 5. Auth Compliance

| Aspect | Contract | Implementation | Status |
|---|---|---|---|
| JWT in Authorization header | Bearer token | `@fastify/jwt` with `request.jwtVerify()` | PASS |
| Payload shape | `WidgetAuthPayload` | TypeScript enforced via `FastifyJWT.payload` | PASS |
| Admin auth | API key | Custom `adminAuth` with timing-safe comparison | PASS |
| Health endpoint | No auth | No preHandler | PASS |
| Service token storage | Encrypted | AES-256-GCM via `encryptToken()` | PASS |

---

## 6. Type Compliance

All shared types in `shared/types.ts` match API-CONTRACT.md Section 1 exactly:
- `Case`, `Message`, `SuggestedAction`, `Evidence` -- PASS
- `SupportContextSnapshot` and all sub-interfaces -- PASS
- `Tenant`, `TenantConfig`, `AnalyticsSummary` -- PASS
- `ApiError`, `PaginatedResponse` -- PASS
- Client integration response types -- PASS

---

## 7. Security Checklist

- [x] JWT verification on all widget routes
- [x] Admin API key with timing-safe comparison
- [x] Tenant isolation via compound DB WHERE clauses (defense-in-depth)
- [x] Rate limiting on case creation (10/min) and messaging (30/min)
- [x] Input validation via Zod schemas on all request bodies
- [x] Sanitization pipeline before LLM calls (secrets, PII, binary, internal URLs)
- [x] Error responses use typed AppError subclasses with consistent format
- [x] No raw secrets in error messages or logs
- [x] Service tokens encrypted at rest (AES-256-GCM)
- [x] CORS configured via environment variable

---

## 8. Summary

| Category | Checks | Pass | Fixed | Notes |
|---|---|---|---|---|
| Routes (paths, methods) | 13 | 13 | 0 | All match contract |
| Response shapes | 13 | 12 | 1 | Audit route `data` leak fixed |
| Tenant Isolation (DB) | 8 | 4 | 4 | Hardened to compound WHERE |
| Tenant Isolation (callers) | 5 | 5 | 0 | Verified caller patterns |
| Error codes | 7 | 7 | 0 | All match contract format |
| Types | 20+ | 20+ | 0 | Exact match |
| Auth | 5 | 5 | 0 | JWT + API key verified |

**Total fixes applied: 5**

---

## 9. Remaining Recommendations

1. **addMessage tenantId**: Add tenantId parameter for defense-in-depth (low priority)
2. **sanitizer.ts**: File is 383 lines -- exceeds 200-line limit, consider splitting
3. **Cross-tenant tests**: Add explicit cross-tenant tests for feedback and escalation routes
