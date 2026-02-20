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
  retentionDays: number;
  enabledConnectors: string[];
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
  type: string;
  label: string;
  payload: Record<string, unknown>;
}

export interface Evidence {
  type: string;
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
