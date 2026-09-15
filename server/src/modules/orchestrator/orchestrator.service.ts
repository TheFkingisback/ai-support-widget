import type { Message, SupportContextSnapshot } from '@shared/types.js';
import type { OrchestratorDeps, OrchestratorService } from './orchestrator.types.js';
export type { OrchestratorDeps, OrchestratorService } from './orchestrator.types.js';
import { withActionTurns } from '../actions/action-turns.js';
import { callLLM, resolveModel, type LLMMessage } from './openrouter.js';
import { executeWithTools } from './tool-executor.js';
import { AppError } from '../../shared/errors.js';
import { safeText } from '../context/safe-content.js';
import { buildSystemPrompt } from './system-prompt.js';
import { parseAIResponse } from './response-parser.js';
import { getFullCaseHistory } from '../gateway/case-history.js';
import { getDb } from '../../shared/db.js';
import { log } from '../../shared/logger.js';

const DEFAULT_MAX_MESSAGES = 20;
const DEFAULT_MAX_BYTES = 5_000_000;

export function createOrchestratorService(deps: OrchestratorDeps): OrchestratorService {
  const {
    gatewayService, snapshotService, contextService,
    knowledgeService, tenantService, costRecorder, resolveMcp,
    apiKey, modelPolicy = 'fast',
    maxMessages = DEFAULT_MAX_MESSAGES, maxContextBytes = DEFAULT_MAX_BYTES,
  } = deps;

  const service: OrchestratorService = {
    async handleMessage(caseId, tenantId, userId, userContent, requestId, widgetJwt, opts?) {
      log.info('handleMessage: start', requestId, { caseId, tenantId, userId });

      const { case: caseData, messages } = await gatewayService.getCase(caseId, tenantId, userId, requestId);
      const humanMessage = opts?.skipUserInsert ? messages.find(m => m.role === 'user')
        : await gatewayService.addMessage(caseId, tenantId, userId, 'user', userContent, undefined, requestId);
      const mcpOpts = await resolveMcp?.(tenantId);
      if (mcpOpts && mcpOpts.tenantId !== tenantId) throw new AppError(403, 'MCP_TENANT_MISMATCH', 'MCP tenant mismatch');
      if (deps.actions && humanMessage) {
        if (caseData.status !== 'active') throw new AppError(409, 'ACTION_CASE_CLOSED', 'Conversation is no longer active');
        const actionReply = await deps.actions.respond({ principal: { caseId, tenantId, userId }, mcp: mcpOpts,
          message: humanMessage, previousMessages: messages, replyToMessageId: opts?.replyToMessageId, requestId });
        if (actionReply) return actionReply;
      }

      let snapshot: SupportContextSnapshot | null = null;
      try {
        snapshot = await snapshotService.getSnapshot(caseData.snapshotId, tenantId, requestId);
      } catch (err) {
        log.warn('handleMessage: snapshot not found', requestId, {
          snapshotId: caseData.snapshotId,
          error: err instanceof Error ? err.message : String(err),
        });
      }

      if (!snapshot) throw new AppError(503, 'CONTEXT_UNAVAILABLE', 'Support context is unavailable');
      if (snapshot.identity.tenantId !== tenantId || snapshot.identity.userId !== userId) {
        throw new AppError(403, 'CONTEXT_IDENTITY_MISMATCH', 'Context identity mismatch');
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
          throw new AppError(503, 'TENANT_UNAVAILABLE', 'Tenant configuration is unavailable');
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
        ? buildSystemPrompt(processedSnapshot, allDocs, requestId, customInstructions, previousCases, !!mcpOpts)
        : 'You are a helpful support assistant. Answer the user\'s question.';

      const allMessages = [...messages, {
        id: 'pending', caseId, role: 'user' as const, content: userContent,
        actions: [], evidence: [], confidence: null, createdAt: new Date().toISOString(),
      }];

      const recentMessages = allMessages.slice(-maxMessages);
      const llmMessages: LLMMessage[] = [
        { role: 'system', content: safeText(systemPrompt) },
        ...recentMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: safeText(m.content),
        })),
      ];

      // Use tool-augmented loop if MCP is configured, otherwise plain LLM call
      const llmResponse = mcpOpts
        ? await executeWithTools({
            actionHooks: deps.actions?.hooks({ caseId, tenantId, userId }, mcpOpts, requestId),
            mcpOpts: mcpOpts, userId: caseData.userId, model, apiKey, llmMessages, requestId,
          })
        : await callLLM({ model, messages: llmMessages }, apiKey, requestId);

      if (costRecorder) {
        costRecorder.record({
          tenantId, model, tokensIn: llmResponse.tokensIn,
          tokensOut: llmResponse.tokensOut, estimatedCost: llmResponse.estimatedCost, caseId,
        }, requestId).catch(() => {});
      }

      if ('actionMessage' in llmResponse && llmResponse.actionMessage) return llmResponse.actionMessage as Message;
      const parsed = parseAIResponse(llmResponse.content, requestId, processedSnapshot);
      const assistantMessage = await gatewayService.addMessage(
        caseId, tenantId, userId, 'assistant', parsed.content,
        { actions: [], evidence: parsed.evidence, confidence: parsed.confidence },
        requestId,
      );

      log.info('handleMessage: complete', requestId, {
        caseId, model: llmResponse.model, tokensIn: llmResponse.tokensIn,
        tokensOut: llmResponse.tokensOut, latencyMs: llmResponse.latencyMs,
      });
      return assistantMessage;
    },

    async handleAction(caseId, tenantId, userId, action, requestId) {
      log.info('handleAction: start', requestId, { caseId, actionType: action.type });
      await gatewayService.getCase(caseId, tenantId, userId, requestId);
      throw new AppError(501, 'ACTION_NOT_IMPLEMENTED', 'This action has no configured executor. Use the application or its human support channel.');
    },
  };
  return deps.actions ? withActionTurns(service, deps.actions) : service;
}
