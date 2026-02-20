# Frontend Integration Audit

Audit date: 2026-02-20
Scope: Every HTTP call in `web/src/` and `widget/src/` vs actual backend routes in `server/src/`.

---

## 1. Backend Route Inventory

| # | Method | Path | Auth | Request Body |
|---|--------|------|------|--------------|
| 1 | GET | `/api/health` | None | — |
| 2 | POST | `/api/cases` | Bearer JWT | `{ message: string }` |
| 3 | GET | `/api/cases/:caseId` | Bearer JWT | — |
| 4 | POST | `/api/cases/:caseId/messages` | Bearer JWT | `{ content: string }` |
| 5 | POST | `/api/cases/:caseId/feedback` | Bearer JWT | `{ feedback: 'positive'\|'negative' }` |
| 6 | POST | `/api/cases/:caseId/escalate` | Bearer JWT | `{ reason?: string }` |
| 7 | POST | `/api/cases/:caseId/actions` | Bearer JWT | `{ action: SuggestedAction }` |
| 8 | GET | `/api/admin/tenants` | Admin auth | — |
| 9 | POST | `/api/admin/tenants` | Admin auth | `{ name, plan, apiBaseUrl, serviceToken, config? }` |
| 10 | PATCH | `/api/admin/tenants/:id` | Admin auth | `{ name?, plan?, config? }` |
| 11 | GET | `/api/admin/tenants/:id/analytics` | Admin auth | — |
| 12 | GET | `/api/admin/tenants/:id/cases` | Admin auth | — |
| 13 | GET | `/api/admin/tenants/:id/audit` | Admin auth | Query: `page`, `pageSize` |

---

## 2. Web Frontend API Calls (`web/src/lib/api.ts`)

| Function | Method | Path | Matches Backend | Status |
|----------|--------|------|-----------------|--------|
| `listTenants()` | GET | `/api/admin/tenants` | Route #8 | PASS |
| `createTenant(input)` | POST | `/api/admin/tenants` | Route #9 | PASS |
| `updateTenant(id, input)` | PATCH | `/api/admin/tenants/${id}` | Route #10 | PASS |
| `getAnalytics(tenantId)` | GET | `/api/admin/tenants/${tenantId}/analytics` | Route #11 | PASS |
| `getCases(tenantId)` | GET | `/api/admin/tenants/${tenantId}/cases` | Route #12 | PASS |
| `getAuditLog(tenantId, page, pageSize)` | GET | `/api/admin/tenants/${tenantId}/audit?page=&pageSize=` | Route #13 | PASS |

### Auth Header
- Web frontend sends: `Authorization: Bearer ${apiKey}` (admin API key).
- Admin routes use custom `adminAuth` preHandler. PASS.

### Response Envelope Unwrapping
- `listTenants` unwraps `{ tenants }` — matches `reply.send({ tenants })`. PASS.
- `createTenant` unwraps `{ tenant }` — matches `reply.send({ tenant })`. PASS.
- `updateTenant` unwraps `{ tenant }` — matches `reply.send({ tenant })`. PASS.
- `getAnalytics` unwraps `{ analytics }` — matches `reply.send({ analytics })`. PASS.
- `getCases` unwraps `{ cases }` — matches `reply.send({ cases })`. PASS.
- `getAuditLog` returns raw `{ entries, total, page, pageSize, hasMore }` — matches backend. PASS.

---

## 3. Widget SDK API Calls (`widget/src/api.ts`)

| Function | Method | Path | Matches Backend | Status |
|----------|--------|------|-----------------|--------|
| `createCase(message)` | POST | `/api/cases` | Route #2 | PASS |
| `sendMessage(caseId, content)` | POST | `/api/cases/${caseId}/messages` | Route #4 | PASS |
| `addFeedback(caseId, feedback)` | POST | `/api/cases/${caseId}/feedback` | Route #5 | PASS |
| `escalate(caseId, reason?)` | POST | `/api/cases/${caseId}/escalate` | Route #6 | PASS |
| `executeAction(caseId, action)` | POST | `/api/cases/${caseId}/actions` | Route #7 | PASS |

### Auth Header
- Widget sends: `Authorization: Bearer ${jwt}` (user JWT).
- Gateway routes use `app.authenticate` (JWT verification). PASS.
- Token refresh: on 401, calls `onTokenRefresh()`, retries with new JWT. PASS.

### Request Body Field Names
- `createCase` sends `{ message }` — backend expects `message` (Zod: `z.string().min(1).max(5000)`). PASS.
- `sendMessage` sends `{ content }` — backend expects `content` (Zod: `z.string().min(1).max(5000)`). PASS.
- `addFeedback` sends `{ feedback }` — backend expects `feedback` (Zod: `z.enum([...])`). PASS.
- `escalate` sends `{ reason }` — backend expects `reason` (Zod: `z.string().max(2000).optional()`). PASS.
- `executeAction` sends `{ action }` — backend expects `action` (Zod object). PASS.

### Response Envelope Unwrapping
- `createCase` returns `{ case, snapshot: { id } }` directly — matches backend. PASS.
- `sendMessage` unwraps `data.message` from `{ message }` — matches backend. PASS.
- `addFeedback` discards `{ ok: true }` response — correct. PASS.
- `escalate` returns `{ ticketId, ticketUrl }` — matches backend. PASS.
- `executeAction` unwraps `data.result` from `{ result }` — matches backend. PASS.

---

## 4. Type Definitions Alignment

| Type | `shared/types.ts` | `web/src/lib/types.ts` | `widget/src/types.ts` | Status |
|------|-------------------|------------------------|----------------------|--------|
| Case | Full (w/ branded IDs) | Matches (plain strings) | Matches | PASS |
| Message | Full | Matches | Matches | PASS |
| SuggestedAction.type | Union of 5 literals | Union of 5 literals | Union of 5 literals | PASS (fixed) |
| Evidence.type | Union of 5 literals | Union of 5 literals | Union of 5 literals | PASS (fixed) |
| Tenant | Full | Matches | N/A | PASS |
| TenantConfig | Full | Matches | N/A | PASS |
| AnalyticsSummary | Full | Matches | N/A | PASS |
| AuditEntry | Full | Matches | N/A | PASS |
| ApiError | Full | N/A | Matches | PASS |

---

## 5. Issues Found & Fixed

### FIX 1: Demo page widget config used wrong field names
- **File:** `web/src/app/demo/page.tsx`
- **Problem:** Passed `token` instead of `jwt`, and omitted required `tenantKey`
- **Fix:** Changed to `jwt: 'demo-jwt-token'` and added `tenantKey: 'ten_demo'`
- **Also fixed:** Inline code example in the same file updated to use `tenantKey` + `jwt`

### FIX 2: Dead code `getCaseDetail()` removed
- **File:** `web/src/lib/api.ts`
- **Problem:** `getCaseDetail(caseId)` called `GET /api/cases/:caseId` which requires widget JWT auth, but the web admin uses admin API key auth — this function could never work correctly from the admin dashboard
- **Fix:** Removed the function and unused `Message` import

### FIX 3: `SuggestedAction.type` was too loose
- **File:** `web/src/lib/types.ts`
- **Problem:** `type: string` instead of the 5-value union used by backend and widget
- **Fix:** Changed to `type: 'retry' | 'open_docs' | 'create_ticket' | 'request_access' | 'custom'`

### FIX 4: `Evidence.type` was too loose
- **File:** `web/src/lib/types.ts`
- **Problem:** `type: string` instead of the 5-value union used by backend and widget
- **Fix:** Changed to `type: 'error_code' | 'job_id' | 'timestamp' | 'resource_id' | 'log_excerpt'`

---

## 6. Observations (No Fix Needed)

### `mockMessage()` unused in tests
- **File:** `web/src/lib/test-helpers.ts`
- **Status:** `mockMessage()` is defined but never imported by any test file. Left in place as a test utility for future use.

### No Next.js API proxy routes
- `web/src/app/api/` has no route handlers. The web frontend calls the backend directly via `NEXT_PUBLIC_API_URL`. This is correct for the current architecture.

### Developer documentation is accurate
- All endpoint paths, methods, field names, and widget config properties in `web/src/app/developers/` match the actual implementation.

---

## 7. Summary

| Area | Total Checks | Pass | Fixed | Removed |
|------|-------------|------|-------|---------|
| Web API paths & methods | 6 | 6 | 0 | 0 |
| Web response unwrapping | 6 | 6 | 0 | 0 |
| Widget API paths & methods | 5 | 5 | 0 | 0 |
| Widget request field names | 5 | 5 | 0 | 0 |
| Widget response unwrapping | 5 | 5 | 0 | 0 |
| Type definitions | 8 | 6 | 2 | 0 |
| Demo page config | 1 | 0 | 1 | 0 |
| Dead code | 1 | 0 | 0 | 1 |
| **Total** | **37** | **33** | **3** | **1** |

All frontend API calls now match their backend counterparts exactly.
