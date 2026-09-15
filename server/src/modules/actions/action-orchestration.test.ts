import { describe, expect, it, vi } from 'vitest';
vi.mock('../orchestrator/openrouter.js', () => ({ callLLM: vi.fn(), resolveModel: vi.fn() }));
import { callLLM } from '../orchestrator/openrouter.js';
import { createOrchestratorService } from '../orchestrator/orchestrator.service.js';
import type { SnapshotService } from '../snapshot/snapshot.service.js';
import { createContextService } from '../context/context.service.js';
import { fixture } from './action-fixtures.test-helper.js';
describe('Confirmation through the authenticated conversation', () => {
  it('consumes the persisted human message without invoking the model and rejects another owner', async () => {
    const f = await fixture(); const shown = await f.prepare();
    const snapshotService: SnapshotService = { buildSnapshot: vi.fn(), getSnapshot: vi.fn() };
    const orchestrator = createOrchestratorService({ gatewayService: f.gateway, snapshotService,
      contextService: createContextService(), resolveMcp: async () => f.mcp, actions: f.service, apiKey: 'unused' });
    await expect(orchestrator.handleMessage(f.p.caseId, f.p.tenantId, 'usr_other', 'confirmar', undefined, undefined,
      { replyToMessageId: shown.id })).rejects.toThrow();
    const reply = await orchestrator.handleMessage(f.p.caseId, f.p.tenantId, f.p.userId, 'confirmar', 'req_1', 'renewed-jwt',
      { replyToMessageId: shown.id });
    expect(reply.content).toContain('concluida'); expect(callLLM).not.toHaveBeenCalled();
    expect(snapshotService.getSnapshot).not.toHaveBeenCalled();
    expect(f.records[0].confirmationMessageId).toBe(f.gateway._messages.findLast(m => m.role === 'user')?.id);
  });
});
