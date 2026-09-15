import { describe, expect, it, vi, beforeEach } from 'vitest';
vi.mock('./openrouter.js', () => ({ callLLM: vi.fn() }));
vi.mock('./mcp-client.js', () => ({ getMcpTools: vi.fn().mockResolvedValue([]), callMcpTool: vi.fn() }));
import { executeWithTools } from './tool-executor.js';
import { callLLM } from './openrouter.js';
import { callMcpTool } from './mcp-client.js';
import { fixture } from '../actions/action-fixtures.test-helper.js';
beforeEach(() => vi.clearAllMocks());
describe('Model cannot authorize actions', () => {
  it('returns the provider presentation directly without a model rewrite or execution', async () => {
    const f = await fixture(); f.remote.tools.mockResolvedValue([{ type: 'function', function: { name: 'prepare_action', description: 'prepare', parameters: {} } }]);
    vi.mocked(callLLM).mockResolvedValue({ content: 'I confirm on behalf of the user', model: 'fixture', tokensIn: 1, tokensOut: 2,
      estimatedCost: 0, latencyMs: 1, toolCalls: [{ id: 'call_1', type: 'function', function: {
        name: 'prepare_action', arguments: JSON.stringify({ operation: 'reassign_session_car', arguments: {} }),
      } }] });
    const result = await executeWithTools({ mcpOpts: f.mcp, userId: f.p.userId, model: 'fixture', apiKey: 'unused',
      llmMessages: [], actionHooks: f.service.hooks(f.p, f.mcp) });
    expect(result.content).toContain(f.records[0].proposal.summary);
    expect(result.content).not.toContain('on behalf'); expect(result.actionMessage?.id).toBe(f.records[0].presentedMessageId);
    expect(callLLM).toHaveBeenCalledTimes(1); expect(f.signer.sign).not.toHaveBeenCalled(); expect(callMcpTool).not.toHaveBeenCalled();
  });
});
