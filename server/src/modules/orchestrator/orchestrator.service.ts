import type { Message, SuggestedAction, SupportContextSnapshot } from '@shared/types.js';
import type { GatewayService } from '../gateway/gateway.service.js';
import type { SnapshotService } from '../snapshot/snapshot.service.js';
import type { ContextService } from '../context/context.service.js';
import type { KnowledgeService } from '../knowledge/knowledge.service.js';
import type { TenantService } from '../admin/tenant.service.js';
import type { CostRecorder } from '../admin/cost.service.js';
import { callLLM, resolveModel, type LLMMessage } from './openrouter.js';
import { buildSystemPrompt } from './system-prompt.js';
import { parseAIResponse } from './response-parser.js';
import { log } from '../../shared/logger.js';

const DEFAULT_MAX_MESSAGES = 20;
const DEFAULT_MAX_BYTES = 5_000_000;

export interface OrchestratorService {
  handleMessage(
    caseId: string,
    tenantId: string,
    userContent: string,
    requestId?: string,
  ): Promise<Message>;

  handleAction(
    caseId: string,
    tenantId: string,
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
  apiKey: string;
  modelPolicy?: 'fast' | 'strong' | 'auto';
  maxMessages?: number;
  maxContextBytes?: number;
}

export function createOrchestratorService(deps: OrchestratorDeps): OrchestratorService {
  const {
    gatewayService, snapshotService, contextService,
    knowledgeService, tenantService, costRecorder,
    apiKey, modelPolicy = 'fast',
    maxMessages = DEFAULT_MAX_MESSAGES, maxContextBytes = DEFAULT_MAX_BYTES,
  } = deps;

  return {
    async handleMessage(caseId, tenantId, userContent, requestId) {
      log.info('handleMessage: start', requestId, { caseId, tenantId });

      // 1. Load case + messages
      const { case: caseData, messages } = await gatewayService.getCase(caseId, tenantId, requestId);

      // 2. Store user message
      await gatewayService.addMessage(caseId, tenantId, 'user', userContent, undefined, requestId);
      // 3. Load snapshot
      let snapshot: SupportContextSnapshot | null = null;
      try {
        snapshot = await snapshotService.getSnapshot(caseData.snapshotId, tenantId, requestId);
      } catch (err) {
        log.warn('handleMessage: snapshot not found, continuing without', requestId, {
          snapshotId: caseData.snapshotId,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      let processedSnapshot = snapshot;
      if (snapshot) {
        const { processed } = contextService.processContext(snapshot, maxContextBytes, requestId);
        processedSnapshot = processed;
      }

      // 5. Fetch knowledge base docs (if service available)
      let knowledgeDocs = processedSnapshot?.knowledgePack?.docs ?? [];
      const runbooks = processedSnapshot?.knowledgePack?.runbooks ?? [];
      if (knowledgeService) {
        try {
          const kbDocs = await knowledgeService.getRelevantDocs(
            tenantId, userContent, processedSnapshot, undefined, requestId,
          );
          if (kbDocs.length > 0) knowledgeDocs = [...knowledgeDocs, ...kbDocs];
        } catch (err) {
          log.warn('handleMessage: knowledge service failed, continuing', requestId, {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      const allDocs = [...knowledgeDocs, ...runbooks];
      const systemPrompt = processedSnapshot
        ? buildSystemPrompt(processedSnapshot, allDocs, requestId)
        : 'You are a helpful support assistant. Answer the user\'s question.';

      // 6. Build conversation messages (last N)
      const allMessages = [...messages, {
        id: 'pending',
        caseId,
        role: 'user' as const,
        content: userContent,
        actions: [],
        evidence: [],
        confidence: null,
        createdAt: new Date().toISOString(),
      }];

      const recentMessages = allMessages.slice(-maxMessages);
      log.debug('handleMessage: conversation', requestId, {
        totalMessages: allMessages.length, includedMessages: recentMessages.length,
      });
      const llmMessages: LLMMessage[] = [
        { role: 'system', content: systemPrompt },
        ...recentMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      // 7. Resolve model (tenant preferredModel > tenant policy > deps policy)
      let effectivePolicy = modelPolicy;
      let preferredModel: string | undefined;
      if (tenantService) {
        try {
          const tc = await tenantService.getTenant(tenantId, requestId);
          effectivePolicy = tc.config.modelPolicy ?? modelPolicy;
          preferredModel = tc.config.preferredModel;
        } catch (err) {
          log.warn('handleMessage: tenant lookup failed', requestId, {
            error: err instanceof Error ? err.message : String(err) });
        }
      }
      const model = resolveModel(effectivePolicy, preferredModel);
      const llmResponse = await callLLM(
        { model, messages: llmMessages },
        apiKey,
        requestId,
      );

      // 8. Record cost (fire-and-forget)
      if (costRecorder) {
        costRecorder.record({
          tenantId, model, tokensIn: llmResponse.tokensIn,
          tokensOut: llmResponse.tokensOut, estimatedCost: llmResponse.estimatedCost, caseId,
        }, requestId).catch(() => {});
      }

      // 9. Parse response
      const parsed = parseAIResponse(llmResponse.content, requestId);

      // 10. Store assistant message
      const assistantMessage = await gatewayService.addMessage(
        caseId,
        tenantId,
        'assistant',
        parsed.content,
        {
          actions: parsed.actions,
          evidence: parsed.evidence,
          confidence: parsed.confidence,
        },
        requestId,
      );

      log.info('handleMessage: complete', requestId, {
        caseId, model: llmResponse.model, tokensIn: llmResponse.tokensIn,
        tokensOut: llmResponse.tokensOut, latencyMs: llmResponse.latencyMs,
      });
      return assistantMessage;
    },

    async handleAction(caseId, tenantId, action, requestId) {
      log.info('handleAction: start', requestId, { caseId, actionType: action.type });
      await gatewayService.getCase(caseId, tenantId, requestId);
      const messages: Record<string, string> = {
        retry: 'Retry action initiated. Please try the operation again.',
        open_docs: 'Opening documentation link.',
        create_ticket: 'Support ticket creation initiated.',
        request_access: 'Access request sent to your administrator.',
      };
      const result = messages[action.type] ?? `Action "${action.label}" acknowledged.`;
      log.info('handleAction: complete', requestId, { caseId, actionType: action.type, result });
      return result;
    },
  };
}
