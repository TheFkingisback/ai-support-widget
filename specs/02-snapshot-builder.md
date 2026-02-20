# Sprint 2: Snapshot Builder

## Objective
Build the service that calls the host app's 4 integration endpoints and generates the Support Context Snapshot (SCS).

## Tasks

### 1. Schema (server/src/modules/snapshot/snapshot.schema.ts)
Table:
- `snapshots`: id (scs_...), tenantId, userId, caseId, data (jsonb), bytesTotal, truncation (jsonb), createdAt

### 2. Client API Caller (server/src/modules/snapshot/client-api.ts)
- `callClientApi<T>(tenant: Tenant, endpoint: string, params: Record<string, string>)` → T
  - Constructs full URL from tenant's configured baseUrl
  - Adds auth header (tenant's service token)
  - Timeout: 5 seconds per call
  - Log INFO: URL called, status, timing
  - Log ERROR: if call fails (with error details)
  - Returns parsed JSON response

- `getUserState(tenant, userId)` → GetUserStateResponse
- `getUserHistory(tenant, userId, windowHours)` → GetUserHistoryResponse
- `getUserLogs(tenant, userId, windowHours)` → GetUserLogsResponse
- `getBusinessRules(tenant)` → GetBusinessRulesResponse

### 3. Snapshot Builder Service (server/src/modules/snapshot/snapshot.service.ts)
- `buildSnapshot(tenantId, userId, caseId)` → SupportContextSnapshot
  - Calls all 4 client APIs in parallel (Promise.allSettled)
  - Handles partial failures (if one API fails, use what's available)
  - Assembles into SCS structure per API-CONTRACT.md types
  - Log INFO: snapshot built with source count, total bytes
  - Log WARN: if any client API failed
  - Stores snapshot in DB
  - Returns snapshot

- `getSnapshot(snapshotId, tenantId)` → SupportContextSnapshot
  - Tenant isolation check
  - Returns from DB

### 4. Click Timeline Builder (server/src/modules/snapshot/timeline.ts)
- `buildClickTimeline(events: UserEvent[])` → ClickTimelineEntry[]
  - Transforms raw events into human-readable timeline per PRD A.5.4
  - Format: `{"ts":"10:15:30","page":"dashboard","action":"click btn_upload (Upload File)"}`
  - Log DEBUG: timeline entries generated count

### 5. Wire to Gateway
- When createCase is called, trigger buildSnapshot
- Attach snapshotId to the case
- Snapshot available for AI Orchestrator (next sprints)

## Tests
1. callClientApi constructs correct URL from tenant baseUrl
2. callClientApi handles timeout (5s) with error
3. callClientApi logs timing on success and error
4. buildSnapshot calls all 4 APIs in parallel
5. buildSnapshot succeeds with partial failures (3 of 4 APIs)
6. buildSnapshot stores snapshot in DB
7. buildSnapshot includes correct truncation metadata
8. getSnapshot rejects wrong tenantId (tenant isolation)
9. buildClickTimeline formats events into readable timeline
10. Snapshot generation is triggered on case creation

## Definition of Done
- `npx vitest run` — all 10 tests pass
- Snapshot generated when case is created
- Partial API failures handled gracefully
- Timeline builder produces readable output
- Tenant isolation on snapshot retrieval
