import { randomUUID } from 'node:crypto';
import type { Message } from '../../shared/types.js';
import type { GatewayService } from '../gateway/gateway.service.js';
import type { McpClientOpts, ToolDef } from '../orchestrator/mcp-client.js';
import { AppError } from '../../shared/errors.js';
import { log } from '../../shared/logger.js';
import { actionArguments, proposalSchema, resultSchema, digest, terminal,
  type Principal, type ActionRecord } from './action-contract.js';
import type { ActionStore } from './action-store.js';
import type { ActionSigner } from './action-proof.js';
import { actionRemote, type ActionRemote } from './action-remote.js';
import { messagesFor, type SupportMessages } from '@ai-support/shared/messages';
import type { SupportLocale } from '@ai-support/shared/locales';

export interface ActionHooks {
  tools(): Promise<ToolDef[]>;
  prepare(args: unknown): Promise<Message>;
}
export interface HumanTurn {
  principal: Principal; mcp?: McpClientOpts; message: Message;
  replyToMessageId?: string; previousMessages: Message[]; requestId?: string; locale?: SupportLocale;
}
export function createActionService(store: ActionStore, gateway: GatewayService,
  signer?: ActionSigner, remote: ActionRemote = actionRemote, clock = Date.now) {
  const binding = (o: McpClientOpts) => digest(JSON.stringify([o.tenantId, o.serverUrl, o.serviceToken, o.actionPolicy]));
  const say = (p: Principal, text: string, requestId?: string) =>
    gateway.addMessage(p.caseId, p.tenantId, p.userId, 'assistant', text, undefined, requestId);
  const audit = (p: ActionRecord, requestId?: string) => gateway.logAudit(p.tenantId, p.userId, p.caseId,
    'action_' + p.state, { proposalId: p.id, actionId: p.proposal.actionId,
      summaryHash: p.proposal.summaryHash, confirmationMessageId: p.confirmationMessageId }, requestId);
  async function save(p: ActionRecord, requestId?: string) { await store.save(p); await audit(p, requestId); }
  async function reconcile(p: ActionRecord, o: McpClientOpts, requestId?: string, locale?: SupportLocale): Promise<Message> {
    try {
      const value = resultSchema.parse(await remote.call(o, p, 'get_action_status', { actionId: p.proposal.actionId }, requestId));
      if (value.actionId !== p.proposal.actionId) throw new Error('Action mismatch');
      p.state = terminal(value.status) ? value.status : 'unknown';
      await save(p, requestId);
      return say(p, outcome(p.state, locale, value.message), requestId);
    } catch {
      log.warn('Action outcome unavailable', requestId, { tenantId: p.tenantId, proposalId: p.id });
      return say(p, outcome('unknown', locale), requestId);
    }
  }
  return {
    withLock: store.withLock.bind(store),
    async respond(turn: HumanTurn): Promise<Message | undefined> {
      const { principal: p, mcp: o, message, requestId, locale } = turn;
      const pending = await store.latest(p);
      const command = message.content.trim().toLowerCase();
      const confirms = ['confirmar', 'confirm'].includes(command);
      const cancels = ['cancelar', 'cancel'].includes(command);
      if (!pending) return confirms || cancels ? say(p, actionCopy(locale, 'actionNoPending', 'Nao ha proposta pendente para confirmar ou cancelar.'), requestId) : undefined;
      if (!o?.actionPolicy?.enabled || !signer || pending.connectorHash !== binding(o)) {
        if (pending.state === 'pending_confirmation') { pending.state = 'cancelled'; await save(pending, requestId); }
        return confirms || cancels || !terminal(pending.state)
          ? say(p, actionCopy(locale, 'actionChanged', 'A integracao mudou ou esta desativada. Nenhuma nova execucao foi autorizada.'), requestId) : undefined;
      }
      if (pending.state === 'executing' || pending.state === 'unknown') return reconcile(pending, o, requestId, locale);
      if (terminal(pending.state)) return confirms || cancels ? say(p, outcome(pending.state, locale), requestId) : undefined;
      if (Date.parse(pending.proposal.expiresAt) <= clock()) {
        pending.state = 'expired'; await save(pending, requestId);
        return confirms || cancels ? say(p, outcome('expired', locale), requestId) : undefined;
      }
      if (cancels || !confirms) {
        pending.state = 'cancelled'; await save(pending, requestId);
        return cancels ? say(p, outcome('cancelled', locale), requestId) : undefined;
      }
      const shown = turn.previousMessages.find(m => m.id === pending.presentedMessageId && m.role === 'assistant');
      if (message.role !== 'user' || !shown || turn.replyToMessageId !== shown.id ||
          message.id === shown.id || Date.parse(message.createdAt) < Date.parse(shown.createdAt)) {
        return say(p, actionCopy(locale, 'actionMismatch', 'Essa confirmacao nao corresponde a proposta apresentada. Solicite uma nova proposta.'), requestId);
      }
      pending.confirmationMessageId = message.id; pending.state = 'executing';
      let proof: string;
      try { proof = signer.sign(pending, o.serverUrl, randomUUID()); }
      catch {
        pending.state = 'expired'; await save(pending, requestId);
        return say(p, outcome('expired', locale), requestId);
      }
      await save(pending, requestId); // Persist BEFORE network; restart may only query status.
      try {
        const result = resultSchema.parse(await remote.call(o, p, 'execute_action',
          { actionId: pending.proposal.actionId }, requestId, proof));
        if (result.actionId !== pending.proposal.actionId) throw new Error('Action mismatch');
        pending.state = terminal(result.status) ? result.status : 'unknown';
        await save(pending, requestId);
        return say(p, outcome(pending.state, locale, result.message), requestId);
      } catch {
        pending.state = 'unknown'; await save(pending, requestId);
        return reconcile(pending, o, requestId, locale);
      }
    },
    hooks(p: Principal, o: McpClientOpts, requestId?: string, locale?: SupportLocale): ActionHooks | undefined {
      if (!o.actionPolicy?.enabled || !signer) return undefined;
      return {
        tools: () => remote.tools(o, p, requestId),
        async prepare(raw) {
          const args = actionArguments.parse(raw);
          if (!o.actionPolicy!.operations.includes(args.operation)) {
            throw new AppError(403, 'ACTION_OPERATION_FORBIDDEN', 'Operation is not enabled');
          }
          const previous = await store.latest(p);
          if (previous && ['executing', 'unknown'].includes(previous.state)) {
            throw new AppError(409, 'ACTION_OUTCOME_UNKNOWN', 'Resolve previous outcome before preparing another action');
          }
          if (previous?.state === 'pending_confirmation') { previous.state = 'cancelled'; await save(previous, requestId); }
          const proposal = proposalSchema.parse(await remote.call(o, p, 'prepare_action', args, requestId));
          const ttl = Date.parse(proposal.expiresAt) - clock();
          if (proposal.operation !== args.operation || ttl <= 0 || ttl > 300000) {
            throw new AppError(502, 'ACTION_INVALID_PROPOSAL', 'Invalid proposal operation or expiry');
          }
          const record: ActionRecord = { ...p, id: randomUUID(), proposal, state: 'pending_confirmation',
            connectorHash: binding(o), presentedMessageId: null, confirmationMessageId: null,
            createdAt: new Date(clock()), updatedAt: new Date(clock()) };
          await store.insert(record);
          const notice = previous?.state === 'cancelled' ? actionCopy(locale, 'actionSuperseded', 'A proposta anterior foi cancelada.') + '\n\n' : '';
          const instruction = actionCopy(locale, 'actionInstruction', 'Responda confirmar para autorizar esta proposta, ou cancelar. Valida ate {expires}.')
            .replace('{confirm}', 'confirm').replace('{cancel}', 'cancel').replace('{expires}', () => proposal.expiresAt);
          const shown = await say(p, notice + proposal.summary + '\n\n' + instruction, requestId);
          record.presentedMessageId = shown.id; await save(record, requestId);
          return shown;
        },
      };
    },
  };
}
/** Fixed state prefixes prevent the model from interpreting a timeout as a completed mutation. */
function actionCopy(locale: SupportLocale | undefined, key: keyof SupportMessages, legacy: string) {
  return locale ? messagesFor(locale)[key] ?? legacy : legacy;
}
function outcome(state: string, locale?: SupportLocale, message?: string): string {
  const prefixes: Record<string, string> = {
    completed: 'Alteracao concluida.', failed: 'A alteracao falhou.',
    conflict: 'Os dados ou permissoes mudaram. Solicite uma nova proposta.',
    cancelled: 'Proposta cancelada. Ela nao pode mais ser confirmada.',
    expired: 'Proposta expirada. Solicite uma nova proposta.',
    unknown: 'O resultado ainda nao foi confirmado. Nao repetirei a alteracao; envie outra mensagem para consultar o estado.',
  };
  const key = `action_${state in prefixes ? state : 'unknown'}` as keyof SupportMessages;
  return actionCopy(locale, key, prefixes[state] ?? prefixes.unknown) + (message ? '\n' + message : '');
}
export type ActionService = ReturnType<typeof createActionService>;
