import { vi } from 'vitest';
import { createMockGatewayService } from '../../tests/mocks/mock-gateway.js';
import { createActionService } from './action-service.js';
import { type ActionRecord, type Principal } from './action-contract.js';
import type { ActionStore } from './action-store.js';
import type { McpTool } from '../orchestrator/mcp-client.js';
/** Isolated durable-store substitute; every read returns a copy, including across service restarts. */
export async function fixture() {
  const gateway = createMockGatewayService();
  const created = await gateway.createCase('ten_a', 'usr_a', 'Please change the car');
  const p = { sid: 'session-a', tenantId: 'ten_a', userId: 'usr_a', caseId: created.case.id };
  const records: ActionRecord[] = [];
  const scope = (a: Principal, b: Principal) => a.tenantId === b.tenantId && a.userId === b.userId && a.caseId === b.caseId;
  const store: ActionStore = {
    latest: async principal => structuredClone(records.filter(r => scope(r, principal)).at(-1) ?? null),
    insert: async row => { records.push(structuredClone(row)); },
    save: async (row, expected) => {
      const i = records.findIndex(r => r.id === row.id && scope(r, row) && r.state === expected);
      if (i < 0) throw new Error('ACTION_STATE_CONFLICT');
      records[i] = structuredClone(row);
    },
  };
  const tool: McpTool = { server: { id: 'billing', url: 'https://billing.example/mcp', accessToken: 'delegated' },
    name: 'pause', signature: 'schema1', readOnly: false,
    definition: { type: 'function', function: { name: 'billing_pause', description: 'Pause', parameters: { type: 'object' } } } };
  const dispatch = vi.fn(async () => 'paused');
  const service = createActionService(store, gateway, dispatch);
  const prepare = () => service.prepare(p, tool, { recurrence: 'example-id' });
  async function confirm(replyTo: string, who = p, catalog = [tool]) {
    const history = [...gateway._messages];
    const human = await gateway.addMessage(p.caseId, p.tenantId, p.userId, 'user', 'confirm');
    return service.respond(who, catalog, human, history, replyTo);
  }
  return { p, service, store, gateway, records, tool, dispatch, prepare, confirm };
}
