export interface Tenant {
  id: string;
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
}

export interface OpenRouterModel {
  id: string;
  name: string;
  provider: string;
  promptPricing: number;
  completionPricing: number;
}

export interface Case {
  id: string;
  tenantId: string;
  userId: string;
  status: 'active' | 'resolved' | 'escalated';
  snapshotId: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  messageCount: number;
  feedback: 'positive' | 'negative' | null;
}

export interface Message {
  id: string;
  caseId: string;
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

export interface AuditEntry {
  id: string;
  tenantId: string;
  userId: string;
  caseId: string | null;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface CreateTenantInput {
  name: string;
  plan: 'starter' | 'pro' | 'enterprise';
  config?: Partial<TenantConfig>;
  apiBaseUrl: string;
  serviceToken: string;
}

export interface UpdateTenantInput {
  name?: string;
  plan?: 'starter' | 'pro' | 'enterprise';
  config?: Partial<TenantConfig>;
}

// === LLM Cost Tracking ===
export interface LLMCostEntry {
  id: string;
  tenantId: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  estimatedCost: number;
  caseId: string;
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
  tenantId: string;
  month: string;
  totalCost: number;
  totalCalls: number;
  totalTokensIn: number;
  totalTokensOut: number;
  byModel: CostByModel[];
}

// === Sessions ===
export interface SessionSummary extends Case {
  hasSnapshot: boolean;
  llmCalls: number;
  totalCost: number;
}

export interface SessionDetail {
  case: Case;
  messages: Message[];
  snapshot: SnapshotData | null;
  costs: LLMCostEntry[];
}

export interface SnapshotData {
  meta: { snapshotId: string; createdAt: string };
  identity: { tenantId: string; userId: string; roles: string[]; plan: string; featuresEnabled: string[] };
  productState: { entities: unknown[]; activeErrors: unknown[]; limitsReached: unknown[] };
  recentActivity: { windowHours: number; events: unknown[]; clickTimeline: unknown[] };
  backend: { recentRequests: unknown[]; jobs: unknown[]; errors: unknown[] };
  knowledgePack: { docs: unknown[]; runbooks: unknown[]; changelog: unknown[] };
  privacy: { redactionVersion: string; fieldsRemoved: string[] };
}
