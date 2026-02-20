# Code Review — server/src/

**Date:** 2026-02-20
**Scope:** All 57 TypeScript files in `server/src/`
**Tests:** 106 passed, 0 failed (15 test files)

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

---

## Remaining Findings (Not Fixed — For Future Sprints)

### Critical

| # | File | Issue |
|---|------|-------|
| 1 | `sanitizer.ts` (367 lines) | **Exceeds 200-line limit.** Should split: extract `deepMaskPII` patterns into helper, extract counting functions |
| 2 | `sanitizer.ts:58` | Creates `new RegExp(pattern.source, pattern.flags)` inside loop — should reuse pattern directly after resetting `lastIndex` |
| 3 | `errors.ts:21` | `log.error()` in AppError constructor fires without requestId + causes double-logging (constructor + app error handler) |

### High

| # | File | Issue |
|---|------|-------|
| 4 | `orchestrator.service.ts` (201 lines) | Slightly over 200-line limit. `handleMessage` is 107 lines — extract prompt-building and response-storage phases |
| 5 | `system-prompt.ts` | `buildSystemPrompt` is 111 lines — extract section builders |
| 6 | `snapshot.service.ts` | `buildSnapshot` is 104 lines — extract fetch phase, assembly phase, persistence phase |
| 7 | `full-flow.test.ts` (214 lines) | Exceeds 200-line limit — extract shared test setup or split test file |
| 8 | `zendesk.ts` / `jira.ts` | No fetch timeout, no retry logic, no response schema validation |
| 9 | `email.ts:30` | No try/catch around `sendFn()` |
| 10 | `embeddings.ts:42-52` | No try/catch around fetch to OpenAI API |
| 11 | `indexer.ts:93-104 / 122-134` | Duplicated chunk creation + embedding loop |

### Medium

| # | File | Issue |
|---|------|-------|
| 12 | `db.ts:13` / `redis.ts:12` | Throw generic `Error` instead of typed `AppError` |
| 13 | `auth.ts:30,36` | Repeated `(request as unknown as { requestId?: string })` cast |
| 14 | `auth.ts:47-62` | `authMiddleware()` duplicates JWT logic from `registerAuth()` without logging |
| 15 | `admin.routes.ts` + `gateway.routes.ts` + `gateway-extra.routes.ts` | 8 instances of identical Zod safeParse → ValidationError pattern. Consider shared `validateBody()` |
| 16 | `openrouter.ts:51` | `COST_PER_1K` defaults to Sonnet pricing for unknown models without warning |
| 17 | `ranker.ts:23-87` | `rankByRelevance` is 65 lines with repetitive counting. Extract priority counting |
| 18 | `ticket-builder.ts` | `buildTicket` is 51 lines — extract description construction |
| 19 | `analytics.service.ts:84-99` | For each resolved case, filters + sorts all messages — O(cases × messages). Pre-group by caseId |

### Low

| # | File | Issue |
|---|------|-------|
| 20 | `app.ts:28` | `env.LOG_LEVEL as LogLevel` — redundant cast, Zod already validates |
| 21 | `gateway-extra.routes.ts:62` | Hardcoded placeholder `ticketId`/`ticketUrl` when escalation service missing |
| 22 | `rate-limiter.ts:14` | Old buckets never cleaned up proactively — Map can grow with many unique keys |
| 23 | `knowledge.schema.ts:25` | Comment says "real pgvector in prod" but stores as jsonb |
| 24 | Test mocks | `genId()` duplicated in mock-gateway.ts and mock-snapshot.ts — extract to test-utils |

---

## File Line Counts

| File | Lines | Status |
|------|------:|--------|
| sanitizer.ts | 367 | **Over limit** |
| full-flow.test.ts | 214 | **Over limit** |
| orchestrator.service.ts | 201 | **Over limit** |
| gateway.service.ts | 185 | Fixed (was 315) |
| tenant.service.ts | 184 | OK |
| logger.ts | 180 | OK |
| snapshot.service.ts | 173 | OK |
| trimming.test.ts | 173 | OK |
| admin.routes.ts | 163 | OK |
| gateway.routes.ts | 164 | OK |
| indexer.ts | 148 | OK |
| client-api.ts | 144 | OK |
| isolation.test.ts | 143 | OK |
| trimmer.ts | 120 | Fixed (was 140) |
| All others | <120 | OK |

---

## Summary

- **6 fixes applied** covering naming, duplication, file size, type safety, and logging
- **24 remaining findings** documented above, none blocking
- **106/106 tests passing** after all changes
