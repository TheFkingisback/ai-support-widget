import { randomUUID } from 'node:crypto';
import type { GatewayService } from '../gateway/gateway.service.js';
import type { Message } from '../../shared/types.js';
import { messagesFor } from '@ai-support/shared/messages';
import type { SupportLocale } from '@ai-support/shared/locales';
import type { Principal, ActionRecord } from './action-contract.js';
import type { ActionStore } from './action-store.js';
import { digest, invoke, type McpPrincipal, type McpTool } from '../orchestrator/mcp-client.js';
import { redactContent, safeText } from '../context/safe-content.js';

type Actor = Principal & McpPrincipal;
const binding = (p: Actor, t: McpTool) => digest(JSON.stringify([p.sid, t.server.id, t.server.url, t.signature]));
export function createActionService(store: ActionStore, gateway: GatewayService, dispatch = invoke) {
  const say = (p: Principal, text: string, req?: string) =>
    gateway.addMessage(p.caseId, p.tenantId, p.userId, 'assistant', text, undefined, req);
  return {
    async prepare(p: Actor, tool: McpTool, args: Record<string, unknown>, req?: string, locale?: SupportLocale) {
      const previous = await store.latest(p);
      if (previous && ['unknown', 'executing'].includes(previous.state)) throw new Error('Previous outcome unresolved');
      const id = randomUUID();
      const expiresAt = new Date(Date.now() + 300000).toISOString();
      const summary = tool.server.id + ' / ' + tool.name + '\n' + JSON.stringify(args, null, 2);
      if (JSON.stringify(redactContent(args)) !== JSON.stringify(args) || summary.length > 3600 || safeText(summary) !== summary || /[\u202a-\u202e\u2066-\u2069]/u.test(summary))
        throw new Error('Cannot present exact proposal');
      if (previous?.state === 'pending_confirmation') { previous.state = 'cancelled'; await store.save(previous, 'pending_confirmation'); }
      const record: ActionRecord = { tenantId: p.tenantId, userId: p.userId, caseId: p.caseId, id, proposal: { actionId: id, serverId: tool.server.id, operation: tool.name,
        signature: tool.signature, arguments: args, expiresAt }, connectorHash: binding(p, tool), state: 'pending_confirmation',
        presentedMessageId: null, confirmationMessageId: null, createdAt: new Date(), updatedAt: new Date() };
      await store.insert(record);
      const instruction = messagesFor(locale ?? 'en-GB').actionInstruction.replace('{confirm}', 'confirm').replace('{cancel}', 'cancel').replace('{expires}', expiresAt);
      const msg = await say(p, summary + '\n\n' + instruction, req);
      record.presentedMessageId = msg.id; await store.save(record, 'pending_confirmation');
      return msg;
    },
    async respond(p: Actor, tools: McpTool[], human: Message, history: Message[], replyTo?: string, req?: string, locale?: SupportLocale) {
      const copy = messagesFor(locale ?? 'en-GB');
      const command = human.content.trim().toLowerCase();
      const confirm = command === 'confirmar' || command === 'confirm';
      const cancel = command === 'cancelar' || command === 'cancel';
      const pending = await store.latest(p);
      if (!pending) return confirm || cancel ? say(p, copy.actionNoPending, req) : undefined;
      if (pending.state !== 'pending_confirmation') {
        if (!confirm && !cancel) return;
        const key = pending.state === 'executing' ? 'unknown' : pending.state;
        return say(p, copy['action_' + key as keyof typeof copy], req);
      }
      const save = async (state: ActionRecord['state']) => { pending.state = state; await store.save(pending, 'pending_confirmation'); };
      if (!confirm) { await save('cancelled'); return cancel ? say(p, copy.action_cancelled, req) : undefined; }
      if (Date.parse(pending.proposal.expiresAt) <= Date.now()) { await save('expired'); return say(p, copy.action_expired, req); }
      if (human.role !== 'user' || !replyTo || replyTo !== pending.presentedMessageId ||
          !history.some(m => m.role === 'assistant' && m.id === replyTo && Date.parse(m.createdAt) <= Date.parse(human.createdAt)))
        return say(p, copy.actionMismatch, req);
      const tool = tools.find(t => t.server.id === pending.proposal.serverId && t.name === pending.proposal.operation);
      if (!tool || binding(p, tool) !== pending.connectorHash) { await save('conflict'); return say(p, copy.action_conflict, req); }
      pending.confirmationMessageId = human.id;
      await save('executing');
      let result = '';
      try { result = await dispatch(tool, p, pending.proposal.arguments, pending.id); pending.state = 'completed'; }
      catch { pending.state = 'unknown'; }
      await store.save(pending, 'executing');
      await gateway.logAudit(p.tenantId, p.userId, p.caseId, 'action_' + pending.state, { proposalId: pending.id, serverId: tool.server.id, operation: tool.name }, req);
      return say(p, copy['action_' + pending.state as keyof typeof copy] + (result ? '\n' + result : ''), req);
    },
  };
}
export type ActionService = ReturnType<typeof createActionService>;
