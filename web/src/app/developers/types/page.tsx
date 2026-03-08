import { PageHeader } from '../components/page-header';
import { CodeBlock } from '../components/code-block';

const identityTypes = `// ID Types — all string aliases for readability
type TenantId = string;    // "ten_xxx"
type UserId = string;      // "usr_xxx"
type CaseId = string;      // "cas_xxx"
type SnapshotId = string;  // "scs_xxx"
type MessageId = string;   // "msg_xxx"`;

const authPayload = `interface WidgetAuthPayload {
  tenantId: TenantId;
  userId: UserId;
  userEmail: string;
  userRoles: string[];
  plan: string;
  iat: number;
  exp: number;
}`;

const caseTypes = `interface Case {
  id: CaseId;
  tenantId: TenantId;
  userId: UserId;
  status: 'active' | 'resolved' | 'unresolved' | 'escalated';
  snapshotId: SnapshotId;
  createdAt: string;         // ISO 8601
  updatedAt: string;
  resolvedAt: string | null;
  messageCount: number;
  feedback: 'positive' | 'negative' | null;
  rating: number | null;     // 1-10
}

interface Message {
  id: MessageId;
  caseId: CaseId;
  role: 'user' | 'assistant' | 'system';
  content: string;
  actions: SuggestedAction[];
  evidence: Evidence[];
  confidence: number | null;  // 0-1
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
}`;

const snapshotTypes = `interface SupportContextSnapshot {
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
}`;

const entityTypes = `interface ProductEntity {
  type: string;
  id?: string;
  description?: string;
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
}`;

export default function TypesPage() {
  return (
    <div data-testid="types-page">
      <PageHeader
        badge="TypeScript"
        badgeColor="blue"
        title="Type Definitions"
        description="All TypeScript interfaces used across the API. Copy these into your project for full type safety."
      />

      <TypeSection title="ID Types" code={identityTypes} />
      <TypeSection title="Auth Payload" code={authPayload} />
      <TypeSection title="Case & Message" code={caseTypes} />
      <TypeSection title="Support Context Snapshot" code={snapshotTypes} />
      <TypeSection title="Product State" code={entityTypes} />
    </div>
  );
}

function TypeSection({ title, code }: { title: string; code: string }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xl font-semibold text-white">{title}</h2>
      <CodeBlock code={code} language="TypeScript" showLineNumbers />
    </section>
  );
}
