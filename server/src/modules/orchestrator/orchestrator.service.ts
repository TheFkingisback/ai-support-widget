import type { Message, SuggestedAction, SupportContextSnapshot } from '@shared/types.js';
import type { GatewayService } from '../gateway/gateway.service.js';
import type { SnapshotService } from '../snapshot/snapshot.service.js';
import type { ContextService } from '../context/context.service.js';
import type { KnowledgeService } from '../knowledge/knowledge.service.js';
import type { TenantService } from '../admin/tenant.service.js';
import type { CostRecorder } from '../admin/cost.service.js';
import type { McpClientOpts } from './mcp-client.js';
import { callLLM, resolveModel, type LLMMessage } from './openrouter.js';
import { executeWithTools } from './tool-executor.js';
import { buildSystemPrompt } from './system-prompt.js';
import { parseAIResponse } from './response-parser.js';
import { getFullCaseHistory } from '../gateway/case-history.js';
import { getDb } from '../../shared/db.js';
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
  mcpOpts?: McpClientOpts;
  apiKey: string;
  modelPolicy?: 'fast' | 'strong' | 'auto';
  maxMessages?: number;
  maxContextBytes?: number;
}

export function createOrchestratorService(deps: OrchestratorDeps): OrchestratorService {
  const {
    gatewayService, snapshotService, contextService,
    knowledgeService, tenantService, costRecorder, mcpOpts,
    apiKey, modelPolicy = 'fast',
    maxMessages = DEFAULT_MAX_MESSAGES, maxContextBytes = DEFAULT_MAX_BYTES,
  } = deps;

  return {
    async handleMessage(caseId, tenantId, userContent, requestId) {
      log.info('handleMessage: start', requestId, { caseId, tenantId });

      const { case: caseData, messages } = await gatewayService.getCase(caseId, tenantId, requestId);
      await gatewayService.addMessage(caseId, tenantId, 'user', userContent, undefined, requestId);

      let snapshot: SupportContextSnapshot | null = null;
      try {
        snapshot = await snapshotService.getSnapshot(caseData.snapshotId, tenantId, requestId);
      } catch (err) {
        log.warn('handleMessage: snapshot not found', requestId, {
          snapshotId: caseData.snapshotId,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      let processedSnapshot = snapshot;
      if (snapshot) {
        const { processed } = contextService.processContext(snapshot, maxContextBytes, requestId);
        processedSnapshot = processed;
      }

      let effectivePolicy = modelPolicy;
      let preferredModel: string | undefined;
      let customInstructions: string | undefined;
      if (tenantService) {
        try {
          const tc = await tenantService.getTenant(tenantId, requestId);
          effectivePolicy = tc.config.modelPolicy ?? modelPolicy;
          preferredModel = tc.config.preferredModel;
          customInstructions = tc.config.customInstructions;
        } catch (err) {
          log.warn('handleMessage: tenant lookup failed', requestId, {
            error: err instanceof Error ? err.message : String(err) });
        }
      }
      const model = resolveModel(effectivePolicy, preferredModel);

      let knowledgeDocs = processedSnapshot?.knowledgePack?.docs ?? [];
      const runbooks = processedSnapshot?.knowledgePack?.runbooks ?? [];
      if (knowledgeService) {
        try {
          const kbDocs = await knowledgeService.getRelevantDocs(
            tenantId, userContent, processedSnapshot, undefined, requestId,
          );
          if (kbDocs.length > 0) knowledgeDocs = [...knowledgeDocs, ...kbDocs];
        } catch (err) {
          log.warn('handleMessage: knowledge service failed', requestId, {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      const allDocs = [...knowledgeDocs, ...runbooks];

      let previousCases: Awaited<ReturnType<typeof getFullCaseHistory>> = [];
      try {
        previousCases = await getFullCaseHistory(
          getDb(), tenantId, caseData.userId, caseId, requestId,
        );
      } catch (err) {
        log.warn('handleMessage: previous cases fetch failed', requestId, {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      const systemPrompt = processedSnapshot
        ? buildSystemPrompt(processedSnapshot, allDocs, requestId, customInstructions, previousCases)
        : 'You are a helpful support assistant. Answer the user\'s question.';

      const allMessages = [...messages, {
        id: 'pending', caseId, role: 'user' as const, content: userContent,
        actions: [], evidence: [], confidence: null, createdAt: new Date().toISOString(),
      }];

      const recentMessages = allMessages.slice(-maxMessages);
      const llmMessages: LLMMessage[] = [
        { role: 'system', content: systemPrompt },
        ...recentMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];

      // Use tool-augmented loop if MCP is configured, otherwise plain LLM call
      const llmResponse = mcpOpts
        ? await executeWithTools({
            mcpOpts, userId: caseData.userId, model, apiKey, llmMessages, requestId,
          })
        : await callLLM({ model, messages: llmMessages }, apiKey, requestId);

      if (costRecorder) {
        costRecorder.record({
          tenantId, model, tokensIn: llmResponse.tokensIn,
          tokensOut: llmResponse.tokensOut, estimatedCost: llmResponse.estimatedCost, caseId,
        }, requestId).catch(() => {});
      }

      const parsed = parseAIResponse(llmResponse.content, requestId);
      const assistantMessage = await gatewayService.addMessage(
        caseId, tenantId, 'assistant', parsed.content,
        { actions: parsed.actions, evidence: parsed.evidence, confidence: parsed.confidence },
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
