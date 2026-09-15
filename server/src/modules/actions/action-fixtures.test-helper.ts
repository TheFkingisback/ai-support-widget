import { vi } from 'vitest';
import { createMockGatewayService } from '../../tests/mocks/mock-gateway.js';
import { createActionService } from './action-service.js';
import { digest, type ActionRecord, type Principal } from './action-contract.js';
import type { ActionStore } from './action-store.js';
import type { McpClientOpts } from '../orchestrator/mcp-client.js';
/** Isolated durable-store substitute; every read returns a copy, including across service restarts. */
export async function fixture() {
  const gateway = createMockGatewayService();
  const created = await gateway.createCase('ten_a', 'usr_a', 'Please change the car');
  const p: Principal = { tenantId: 'ten_a', userId: 'usr_a', caseId: created.case.id };
  const records: ActionRecord[] = []; const locked = new Set<string>();
  const scope = (a: Principal, b: Principal) => a.tenantId === b.tenantId && a.userId === b.userId && a.caseId === b.caseId;
  const store: ActionStore = {
    latest: async principal => structuredClone(records.filter(r => scope(r, principal)).at(-1) ?? null),
    insert: async row => { records.push(structuredClone(row)); },
    save: async row => { const i = records.findIndex(r => r.id === row.id && scope(r, row)); records[i] = structuredClone(row); },
    async withLock(principal, fn) {
      const key = JSON.stringify([principal.tenantId, principal.userId, principal.caseId]);
      if (locked.has(key)) throw new Error('ACTION_CONVERSATION_BUSY');
      locked.add(key); try { return await fn(); } finally { locked.delete(key); }
    },
  };
  let time = Date.now(); let serial = 0;
  const proposal = () => ({ contractVersion: 1, actionId: 'act_' + ++serial, status: 'pending_confirmation',
    operation: 'reassign_session_car', summary: 'Trocar o carro da sessao 17 para Carro B. Nenhum tempo sera alterado.',
    argumentsHash: digest('arguments'), summaryHash: digest('Trocar o carro da sessao 17 para Carro B. Nenhum tempo sera alterado.'),
    expiresAt: new Date(time + 120000).toISOString() });
  const mcp: McpClientOpts = { tenantId: p.tenantId, serverUrl: 'https://track.example.com/mcp',
    serviceToken: 'fixture-only', allowedTools: ['get_user_cars'],
    actionPolicy: { contractVersion: 1, enabled: true, operations: ['reassign_session_car'] } };
  const remote = { tools: vi.fn().mockResolvedValue([]), call: vi.fn(async (_o, _p, tool, args) =>
    tool === 'prepare_action' ? proposal() : { contractVersion: 1, actionId: args.actionId, status: 'completed' }) };
  const signer = { sign: vi.fn(() => 'fixture-proof') };
  const restart = () => createActionService(store, gateway, signer, remote, () => time);
  const service = restart();
  const prepare = () => service.hooks(p, mcp)!.prepare({ operation: 'reassign_session_car', arguments: { sessionId: '17', carId: 'B' } });
  const human = async (text = 'confirmar') => gateway.addMessage(p.caseId, p.tenantId, p.userId, 'user', text);
  const turn = async (replyToMessageId?: string, text = 'confirmar') => ({ principal: p, mcp,
    previousMessages: [...gateway._messages], replyToMessageId, message: await human(text) });
  return { gateway, p, records, store, mcp, remote, signer, service, restart, prepare, turn, proposal,
    advance: (ms: number) => { time += ms; } };
}
