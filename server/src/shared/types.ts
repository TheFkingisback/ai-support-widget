// === IDs ===
// All IDs are prefixed strings: ten_xxx, usr_xxx, cas_xxx, scs_xxx, msg_xxx
export type TenantId = string; // ten_...
export type UserId = string; // usr_...
export type CaseId = string; // cas_...
export type SnapshotId = string; // scs_...
export type MessageId = string; // msg_...

// === Auth ===
export interface WidgetAuthPayload {
  tenantId: TenantId;
  userId: UserId;
  userEmail: string;
  userRoles: string[];
  plan: string;
  iat: number;
  exp: number;
}

// === Conversation ===
export interface Case {
  id: CaseId;
  tenantId: TenantId;
  userId: UserId;
  status: 'active' | 'resolved' | 'escalated';
  snapshotId: SnapshotId;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  messageCount: number;
  feedback: 'positive' | 'negative' | null;
}

export interface Message {
  id: MessageId;
  caseId: CaseId;
  role: 'user' | 'assistant' | 'system';
  content: string;
  actions: SuggestedAction[];
  evidence: Evidence[];
  confidence: number | null;
  createdAt: string;
}

export interface SuggestedAction {
  type: 'retry' | 'open_docs' | 'create_ticket' | 'request_access' | 'custom';
  label: string;
  payload: Record<string, unknown>;
}

export interface Evidence {
  type: 'error_code' | 'job_id' | 'timestamp' | 'resource_id' | 'log_excerpt';
  label: string;
  value: string;
}

// === Support Context Snapshot (SCS) ===
export interface SupportContextSnapshot {
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
    profile?: { fullName?: string; email?: string; country?: string };
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

export interface ProductEntity {
  type: string;
  id?: string;
  description?: string;
  status: string;
  metadata: Record<string, unknown>;
}

export interface ActiveError {
  errorCode: string;
  errorClass: 'validation' | 'permission' | 'infra' | 'business';
  retryable: boolean;
  userActionable: boolean;
  resourceId: string;
  occurredAt: string;
}

export interface LimitReached {
  limit: string;
  current: number;
  max: number;
}

export interface UserEvent {
  ts: string;
  event: string;
  page: string;
  elementId: string | null;
  intent: string | null;
  correlationRequestId: string | null;
}

export interface ClickTimelineEntry {
  ts: string;
  page: string;
  action: string;
}

export interface ApiRequestLog {
  ts: string;
  route: string;
  httpStatus: number;
  errorCode: string | null;
  resourceId: string | null;
  timingMs: number;
  requestId: string;
}

export interface JobState {
  jobId: string;
  queue: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';
  errorCode: string | null;
  lastStage: string | null;
  createdAt: string;
  updatedAt: string;
  durationMs: number | null;
}

export interface BackendError {
  ts: string;
  errorCode: string;
  errorClass: string;
  route: string;
  requestId: string;
  resourceId: string | null;
}

export interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  category: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  summary: string;
}

// === Client Integration (4 required endpoints) ===
export interface GetUserStateResponse {
  userId: UserId;
  tenantId: TenantId;
  roles: string[];
  plan: string;
  profile?: { fullName?: string; email?: string; country?: string };
  featuresEnabled: string[];
  entities: ProductEntity[];
  activeErrors: ActiveError[];
  limitsReached: LimitReached[];
}

export interface GetUserHistoryResponse {
  windowHours: number;
  events: UserEvent[];
  clickTimeline: ClickTimelineEntry[];
}

export interface GetUserLogsResponse {
  recentRequests: ApiRequestLog[];
  jobs: JobState[];
  errors: BackendError[];
}

export interface GetBusinessRulesResponse {
  rules: Record<string, unknown>;
  errorCatalog: ErrorCatalogEntry[];
}

export interface ErrorCatalogEntry {
  errorCode: string;
  errorClass: string;
  retryable: boolean;
  userActionable: boolean;
  resolution: string;
}

// === Admin ===
export interface Tenant {
  id: TenantId;
  name: string;
  plan: 'starter' | 'pro' | 'enterprise';
  config: TenantConfig;
  createdAt: string;
}

export interface TenantConfig {
  maxContextBytes: number;
  maxEventWindowHours: number;
  maxLogLines: number;
  maxDocs: number;
  modelPolicy: 'fast' | 'strong' | 'auto';
  preferredModel?: string;
  retentionDays: number;
  enabledConnectors: string[];
  customInstructions?: string;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  provider: string;
  promptPricing: number;
  completionPricing: number;
}

export interface AnalyticsSummary {
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

// === Audit ===
export interface AuditEntry {
  id: string;
  tenantId: TenantId;
  userId: UserId;
  caseId: CaseId | null;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
}

// === API Errors ===
export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  field?: string;
  requestId?: string;
}

// === LLM Cost Tracking ===
export interface LLMCostEntry {
  id: string;
  tenantId: TenantId;
  model: string;
  tokensIn: number;
  tokensOut: number;
  estimatedCost: number;
  caseId: CaseId;
  createdAt: string;
}

export interface CostByModel {
  model: string;
  callCount: number;
  tokensIn: number;
  tokensOut: number;
  cost: number;
}

export interface CostSummary {
  tenantId: TenantId;
  month: string;
  totalCost: number;
  totalCalls: number;
  totalTokensIn: number;
  totalTokensOut: number;
  byModel: CostByModel[];
}

// === Pagination ===
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
