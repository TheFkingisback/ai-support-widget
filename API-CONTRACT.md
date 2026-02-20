# AI Support Widget — API Contract

## This Is The Law

Both backend and frontend MUST use these EXACT types, field names, and endpoint paths.
If the code doesn't match this file, the code is wrong.

---

## 1. Shared Types

```typescript
// === IDs ===
// All IDs are prefixed strings: ten_xxx, usr_xxx, cas_xxx, scs_xxx, msg_xxx
type TenantId = string;   // ten_...
type UserId = string;     // usr_...
type CaseId = string;     // cas_...
type SnapshotId = string; // scs_...
type MessageId = string;  // msg_...

// === Auth ===
interface WidgetAuthPayload {
  tenantId: TenantId;
  userId: UserId;
  userEmail: string;
  userRoles: string[];
  plan: string;
  iat: number;
  exp: number;
}

// === Conversation ===
interface Case {
  id: CaseId;
  tenantId: TenantId;
  userId: UserId;
  status: 'active' | 'resolved' | 'escalated';
  snapshotId: SnapshotId;
  createdAt: string;          // ISO 8601
  updatedAt: string;
  resolvedAt: string | null;
  messageCount: number;
  feedback: 'positive' | 'negative' | null;
}

interface Message {
  id: MessageId;
  caseId: CaseId;
  role: 'user' | 'assistant' | 'system';
  content: string;
  actions: SuggestedAction[];  // Buttons the AI suggests
  evidence: Evidence[];        // IDs, timestamps, codes cited
  confidence: number | null;   // 0-1, null if not applicable
  createdAt: string;
}

interface SuggestedAction {
  type: 'retry' | 'open_docs' | 'create_ticket' | 'request_access' | 'custom';
  label: string;
  payload: Record<string, unknown>;
}

interface Evidence {
  type: 'error_code' | 'job_id' | 'timestamp' | 'resource_id' | 'log_excerpt';
  label: string;
  value: string;
}

// === Support Context Snapshot (SCS) ===
interface SupportContextSnapshot {
  meta: {
    snapshotId: SnapshotId;
    createdAt: string;
    maxBytes: number;
    truncation: {
      eventsRemoved: number;
      logsTrimmed: boolean;
      docsRemoved: number;
    };
  };
  identity: {
    tenantId: TenantId;
    userId: UserId;
    roles: string[];
    plan: string;
    featuresEnabled: string[];
  };
  productState: {
    entities: ProductEntity[];
    activeErrors: ActiveError[];
    limitsReached: LimitReached[];
  };
  recentActivity: {
    windowHours: number;
    events: UserEvent[];
    clickTimeline: ClickTimelineEntry[];
  };
  backend: {
    recentRequests: ApiRequestLog[];
    jobs: JobState[];
    errors: BackendError[];
  };
  knowledgePack: {
    docs: KnowledgeDoc[];
    runbooks: KnowledgeDoc[];
    changelog: ChangelogEntry[];
  };
  privacy: {
    redactionVersion: string;
    fieldsRemoved: string[];
  };
}

interface ProductEntity {
  type: string;
  id: string;
  status: string;
  metadata: Record<string, unknown>;
}

interface ActiveError {
  errorCode: string;
  errorClass: 'validation' | 'permission' | 'infra' | 'business';
  retryable: boolean;
  userActionable: boolean;
  resourceId: string;
  occurredAt: string;
}

interface LimitReached {
  limit: string;
  current: number;
  max: number;
}

interface UserEvent {
  ts: string;
  event: string;
  page: string;
  elementId: string | null;
  intent: string | null;
  correlationRequestId: string | null;
}

interface ClickTimelineEntry {
  ts: string;
  page: string;
  action: string;
}

interface ApiRequestLog {
  ts: string;
  route: string;
  httpStatus: number;
  errorCode: string | null;
  resourceId: string | null;
  timingMs: number;
  requestId: string;
}

interface JobState {
  jobId: string;
  queue: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';
  errorCode: string | null;
  lastStage: string | null;
  createdAt: string;
  updatedAt: string;
  durationMs: number | null;
}

interface BackendError {
  ts: string;
  errorCode: string;
  errorClass: string;
  route: string;
  requestId: string;
  resourceId: string | null;
}

interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;    // Truncated to fit context
  category: string;
}

interface ChangelogEntry {
  version: string;
  date: string;
  summary: string;
}

// === Client Integration (4 required endpoints) ===
interface GetUserStateResponse {
  userId: UserId;
  tenantId: TenantId;
  roles: string[];
  plan: string;
  featuresEnabled: string[];
  entities: ProductEntity[];
  activeErrors: ActiveError[];
  limitsReached: LimitReached[];
}

interface GetUserHistoryResponse {
  windowHours: number;
  events: UserEvent[];
  clickTimeline: ClickTimelineEntry[];
}

interface GetUserLogsResponse {
  recentRequests: ApiRequestLog[];
  jobs: JobState[];
  errors: BackendError[];
}

interface GetBusinessRulesResponse {
  rules: Record<string, unknown>;
  errorCatalog: ErrorCatalogEntry[];
}

interface ErrorCatalogEntry {
  errorCode: string;
  errorClass: string;
  retryable: boolean;
  userActionable: boolean;
  resolution: string;
}

// === Admin ===
interface Tenant {
  id: TenantId;
  name: string;
  plan: 'starter' | 'pro' | 'enterprise';
  config: TenantConfig;
  createdAt: string;
}

interface TenantConfig {
  maxContextBytes: number;
  maxEventWindowHours: number;
  maxLogLines: number;
  maxDocs: number;
  modelPolicy: 'fast' | 'strong' | 'auto';
  retentionDays: number;
  enabledConnectors: string[];
}

interface AnalyticsSummary {
  totalCases: number;
  resolvedWithoutHuman: number;
  resolutionRate: number;
  avgMessagesPerResolution: number;
  avgTimeToFirstResponse: number;
  avgTimeToResolution: number;
  topIntents: { intent: string; count: number }[];
  topErrors: { errorCode: string; count: number }[];
  csat: { positive: number; negative: number; total: number };
}

// === API Errors ===
interface ApiError {
  statusCode: number;
  error: string;          // Machine-readable: UNAUTHORIZED, TENANT_NOT_FOUND
  message: string;        // Human-readable
  field?: string;         // Which field caused it (for validation errors)
  requestId?: string;     // For tracing
}
```

---

## 2. Auth Mechanism

Widget auth uses JWT signed by the HOST APPLICATION (not by us).

Flow:
1. Host app generates JWT with `WidgetAuthPayload` using a shared secret
2. Widget SDK receives JWT via config
3. Widget sends JWT in `Authorization: Bearer <token>` header to Support Gateway
4. Gateway verifies JWT signature using tenant's shared secret (stored in our DB)
5. Gateway extracts tenantId, userId, roles from JWT
6. All subsequent requests in the session use the same JWT

Token refresh: host app is responsible. Widget SDK accepts `onTokenRefresh` callback.

---

## 3. Endpoint Table

### Support Gateway (our backend)

| Method | Path | Auth | Request Body | Response 200 | Errors |
|--------|------|------|-------------|-------------|--------|
| POST | /api/cases | Bearer | `{ message: string }` | `{ case: Case, snapshot: { id } }` | 401, 429 |
| GET | /api/cases/:caseId | Bearer | — | `{ case: Case, messages: Message[] }` | 401, 404 |
| POST | /api/cases/:caseId/messages | Bearer | `{ content: string }` | `{ message: Message }` | 401, 404, 429 |
| POST | /api/cases/:caseId/feedback | Bearer | `{ feedback: 'positive' \| 'negative' }` | `{ ok: true }` | 401, 404 |
| POST | /api/cases/:caseId/escalate | Bearer | `{ reason?: string }` | `{ ticketId: string, ticketUrl: string }` | 401, 404 |
| POST | /api/cases/:caseId/actions | Bearer | `{ action: SuggestedAction }` | `{ result: string }` | 401, 404 |
| GET | /api/health | — | — | `{ ok: true, version: string }` | — |

### Admin API

| Method | Path | Auth | Response 200 |
|--------|------|------|-------------|
| GET | /api/admin/tenants | Admin | `{ tenants: Tenant[] }` |
| POST | /api/admin/tenants | Admin | `{ tenant: Tenant }` |
| PATCH | /api/admin/tenants/:id | Admin | `{ tenant: Tenant }` |
| GET | /api/admin/tenants/:id/analytics | Admin | `{ analytics: AnalyticsSummary }` |
| GET | /api/admin/tenants/:id/cases | Admin | `{ cases: Case[] }` |
| GET | /api/admin/tenants/:id/audit | Admin | `{ entries: AuditEntry[] }` |

### Client Integration Endpoints (implemented by the HOST app)

| Method | Path | Provided By |
|--------|------|-------------|
| GET | `{baseUrl}/support/user-state?userId=X` | Host app |
| GET | `{baseUrl}/support/user-history?userId=X&windowHours=72` | Host app |
| GET | `{baseUrl}/support/user-logs?userId=X&windowHours=72` | Host app |
| GET | `{baseUrl}/support/business-rules` | Host app |

---

## 4. Error Format

ALL errors return this shape:
```json
{
  "statusCode": 404,
  "error": "CASE_NOT_FOUND",
  "message": "Case cas_abc123 not found",
  "requestId": "req_xyz789"
}
```

---

## 5. Date/Time Format

- ALL dates: ISO 8601 UTC strings `"2026-02-20T10:00:00.000Z"`
- ALL durations: milliseconds as number
- ALL timing fields: `timingMs`, `durationMs`, `elapsedMs`

---

## 6. Pagination

```typescript
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
```

Default page size: 20. Max: 100.
