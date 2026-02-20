# Code Review — server/src/

**Date:** 2026-02-20
**Scope:** All 57 TypeScript files in `server/src/`
**Tests:** 205 passed, 0 failed (29 test files)

---

## Fixes Applied

### 1. gateway.service.ts — Split for 200-line limit (315 → 185 lines)
- **Extracted** `gateway.helpers.ts` (68 lines) with shared utilities:
  - `genId()` — ID generation
  - `toCase()` — row-to-Case mapping
  - `findCaseWithTenant()` — replaces 3 duplicated case-lookup-with-tenant queries
  - `insertAudit()` — replaces 4 duplicated audit insert blocks

### 2. trimmer.ts — Extracted duplicated while-pop loops
- **Before:** 8 identical `while (byteSize > max && arr.length > 0) { arr.pop() }` blocks
- **After:** Single `popUntilFits()` helper, called 8 times
- Reduced from 140 → 120 lines, improved readability

### 3. system-prompt.ts — Fixed single-letter variable names
- `e` → `err`, `click`, `backendErr` (context-appropriate)
- `r` → `req`
- `j` → `job`
- `d` → `doc`
- `l` → `lim`

### 4. analytics.service.ts — Cleanup
- Removed duplicate import (`SupportContextSnapshot` imported twice)
- Extracted `topCountsFromMap()` helper to eliminate duplicated sort/slice/map in `extractIntents` and `extractTopErrors`
- Renamed `c` → `resolvedCase` in for-loop (line 84)

### 5. env.ts — Fixed unsafe type assertion
- `(process.env.LOG_LEVEL as LogLevel)` → `LogLevel.catch('medium').parse(process.env.LOG_LEVEL)`
- Now validates through Zod instead of raw cast

### 6. rate-limiter.ts — Added requestId propagation
- `check()` now accepts optional `requestId` parameter
- Warning log no longer uses `undefined` for requestId
- Updated both call sites in gateway.routes.ts

### 7. sanitizer.ts — Split for 200-line limit (367 → 123 + 191 lines)
- **Extracted** `sanitizer-helpers.ts` (191 lines) with regex patterns and deep traversal functions
- `sanitizer.ts` now 123 lines — keeps public API: `redactSecrets`, `maskPII`, `removeBinary`, `stripInternalUrls`, `validateSchema`, `sanitize`
- Fixed regex `/g` issue: uses `pattern.lastIndex = 0` before replace instead of `new RegExp()`

### 8. errors.ts — Removed double-logging
- Removed `log.error()` from `AppError` constructor — the app error handler in `app.ts` already logs errors with requestId

### 9. orchestrator.service.ts — Compacted under 200-line limit (202 → 194 lines)
- Inlined `handleAction` log data objects to save lines

### 10. full-flow.test.ts — Compacted under 200-line limit (214 → 197 lines)
- Condensed `beforeAll` setup: merged object literals, removed comments

### 11. zendesk.ts / jira.ts / embeddings.ts — Added fetch timeouts
- Added 15s `AbortController` timeout to zendesk.ts and jira.ts fetch calls
- Added 10s `AbortController` timeout + try/catch to embeddings.ts fetch

### 12. email.ts — Added try/catch around sendFn()
- `config.sendFn()` now wrapped in try/catch with proper error logging

### 13. indexer.ts — Deduplicated chunk-embed-store loop
- Extracted `embedAndStoreChunks()` helper used by both `indexDocument` and `reindexAll`

### 14. Shared validateBody() helper
- Created `server/src/shared/validation.ts` with `validateBody<S>(schema, data)` helper
- Replaced 8 instances of duplicated Zod safeParse → ValidationError pattern in:
  - `gateway.routes.ts` (3 instances)
  - `gateway-extra.routes.ts` (2 instances)
  - `admin.routes.ts` (3 instances)
- Fixed generic signature to use `z.ZodTypeAny` for correct output inference with `.default()`

### 15. auth.ts — Removed dead code and casts
- Replaced `(request as unknown as { requestId?: string }).requestId` → `request.requestId` (2 instances)
- Removed unused `authMiddleware()` function (duplicate of `authenticate` decorator)

### 16. openrouter.ts — Unknown model warning
- `estimateCost()` now logs a warning when model is not in `COST_PER_1K` map instead of silently defaulting

### 17. app.ts — Removed redundant cast
- `env.LOG_LEVEL as LogLevel` → `env.LOG_LEVEL` (Zod already validates to `LogLevel` type)
- Removed unused `type LogLevel` import from env.ts

### 18. Test mocks — Extracted shared genId()
- Created `server/src/tests/mocks/test-utils.ts` with shared `genId()` function
- Updated `mock-gateway.ts` and `mock-snapshot.ts` to import from `test-utils.ts`

---

## Remaining Findings (Not Fixed — For Future Sprints)

### Medium

| # | File | Issue |
|---|------|-------|
| 5 | `system-prompt.ts` | `buildSystemPrompt` is 111 lines — extract section builders |
| 6 | `snapshot.service.ts` | `buildSnapshot` is 104 lines — extract fetch phase, assembly phase, persistence phase |
| 12 | `db.ts:13` / `redis.ts:12` | Throw generic `Error` instead of typed `AppError` |
| 17 | `ranker.ts:23-87` | `rankByRelevance` is 65 lines with repetitive counting. Extract priority counting |
| 18 | `ticket-builder.ts` | `buildTicket` is 51 lines — extract description construction |
| 19 | `analytics.service.ts:84-99` | For each resolved case, filters + sorts all messages — O(cases × messages). Pre-group by caseId |

### Low

| # | File | Issue |
|---|------|-------|
| 21 | `gateway-extra.routes.ts:62` | Hardcoded placeholder `ticketId`/`ticketUrl` when escalation service missing |
| 22 | `rate-limiter.ts:14` | Old buckets never cleaned up proactively — Map can grow with many unique keys |
| 23 | `knowledge.schema.ts:25` | Comment says "real pgvector in prod" but stores as jsonb |

---

## File Line Counts

| File | Lines | Status |
|------|------:|--------|
| gateway.service.ts | 185 | Fixed (was 315) |
| tenant.service.ts | 184 | OK |
| logger.ts | 182 | OK |
| snapshot.service.ts | 173 | OK |
| trimming.test.ts | 173 | OK |
| admin.routes.ts | 132 | Fixed (was 163, uses validateBody) |
| gateway.routes.ts | 135 | Fixed (was 164, uses validateBody) |
| sanitizer.ts | 123 | Fixed (was 367, split to helpers) |
| sanitizer-helpers.ts | 191 | New (extracted from sanitizer) |
| orchestrator.service.ts | 194 | Fixed (was 202) |
| full-flow.test.ts | 197 | Fixed (was 214) |
| indexer.ts | 120 | Fixed (was 148, extracted helper) |
| trimmer.ts | 120 | Fixed (was 140) |
| All others | <120 | OK |

---

## Summary

- **18 fixes applied** covering file splits, dead code removal, type safety, fetch timeouts, deduplication, and shared helpers
- **9 remaining findings** (6 medium, 3 low) — none blocking
- **205/205 tests passing** across 29 test files after all changes
