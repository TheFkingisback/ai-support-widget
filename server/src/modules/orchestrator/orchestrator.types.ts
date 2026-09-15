import type { ActionService } from '../actions/action-service.js';
import type { Message, SuggestedAction, SupportContextSnapshot } from '@shared/types.js';
import type { GatewayService } from '../gateway/gateway.service.js';
import type { SnapshotService } from '../snapshot/snapshot.service.js';
import type { ContextService } from '../context/context.service.js';
import type { KnowledgeService } from '../knowledge/knowledge.service.js';
import type { TenantService } from '../admin/tenant.service.js';
import type { CostRecorder } from '../admin/cost.service.js';
import type { McpClientOpts } from './mcp-client.js';

export interface OrchestratorService {
  handleMessage(
    caseId: string,
    tenantId: string,
    userId: string,
    userContent: string,
    requestId?: string,
    widgetJwt?: string,
    opts?: { skipUserInsert?: boolean; replyToMessageId?: string },
  ): Promise<Message>;

  handleAction(
    caseId: string,
    tenantId: string,
    userId: string,
    action: SuggestedAction,
    requestId?: string,
  ): Promise<string>;
}

export interface OrchestratorDeps {
  gatewayService: GatewayService;
  snapshotService: SnapshotService;
  contextService: ContextService;
  knowledgeService?: KnowledgeService;
  tenantService?: TenantService;
  costRecorder?: CostRecorder;
  resolveMcp?: (tenantId: string) => Promise<McpClientOpts | undefined>;
  actions?: ActionService;
  apiKey: string;
  modelPolicy?: 'fast' | 'strong' | 'auto';
  maxMessages?: number;
  maxContextBytes?: number;
}
