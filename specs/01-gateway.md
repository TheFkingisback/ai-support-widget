# Sprint 1: Support Gateway

## Objective
Build the case management system: create cases, send messages, store conversations.

## Tasks

### 1. Schema (server/src/modules/gateway/gateway.schema.ts)
Tables:
- `cases`: id, tenantId, userId, status, snapshotId, createdAt, updatedAt, resolvedAt, messageCount, feedback
- `messages`: id, caseId, role, content, actions (jsonb), evidence (jsonb), confidence, createdAt
- `audit_log`: id, tenantId, userId, caseId, action, details (jsonb), createdAt

### 2. Service (server/src/modules/gateway/gateway.service.ts)
- `createCase(tenantId, userId, firstMessage)` → Case + Message
  - Generates cas_ prefixed ID
  - Log INFO: case created with tenantId, userId
  - Triggers snapshot generation (next sprint)
- `addMessage(caseId, role, content, actions?, evidence?, confidence?)` → Message
  - Log INFO: message added with caseId, role
- `getCase(caseId, tenantId)` → Case + Messages
  - MUST verify tenantId matches (tenant isolation!)
  - Log INFO: case retrieved
- `addFeedback(caseId, tenantId, feedback)` → void
- `escalateCase(caseId, tenantId, reason)` → void (marks status as escalated)
- `logAudit(tenantId, userId, caseId, action, details)` → void

### 3. Routes (server/src/modules/gateway/gateway.routes.ts)
Per API-CONTRACT.md:
- POST /api/cases — auth required, rate limited (10/min per user)
- GET /api/cases/:caseId — auth required, tenant isolated
- POST /api/cases/:caseId/messages — auth required, rate limited (30/min)
- POST /api/cases/:caseId/feedback — auth required
- POST /api/cases/:caseId/escalate — auth required

### 4. Rate Limiter (server/src/modules/gateway/rate-limiter.ts)
- Redis-based rate limiting
- Per tenant + per user
- Returns 429 with RateLimitError when exceeded
- Log WARN when rate limit hit

### 5. Audit Logger
- Every case creation, message, escalation, feedback logged to audit_log table
- Log includes: who, when, what, caseId, tenantId

## Tests
1. createCase returns case with correct tenantId and userId
2. createCase generates cas_ prefixed ID
3. addMessage stores message with correct role and content
4. getCase returns messages in chronological order
5. getCase rejects access from wrong tenantId (tenant isolation)
6. addFeedback updates case feedback field
7. escalateCase changes status to 'escalated'
8. Rate limiter returns 429 after limit exceeded
9. Audit log records case creation
10. POST /api/cases returns 401 without auth token

## Definition of Done
- `npx vitest run` — all 10 tests pass
- Routes respond correctly to authenticated requests
- Tenant isolation verified by test
- Rate limiting works
- Audit trail recorded
