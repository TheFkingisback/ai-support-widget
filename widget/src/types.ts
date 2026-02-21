/** Widget configuration passed to AISupportWidget.init() */
export interface WidgetConfig {
  tenantKey: string;
  jwt: string;
  apiUrl: string;
  theme?: 'light' | 'dark';
  position?: 'bottom-right' | 'bottom-left';
  locale?: string;
  onTokenRefresh?: () => Promise<string>;
  /** Pre-fetched support context from the host app (push model). */
  context?: Record<string, unknown>;
  onOpen?: () => Promise<void> | void;
}

/** Case returned by the gateway */
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

/** Message returned by the gateway */
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

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  field?: string;
  requestId?: string;
}
