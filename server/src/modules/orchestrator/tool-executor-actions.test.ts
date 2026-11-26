import { expect, it, vi } from 'vitest';
import { executeWithTools } from './tool-executor.js';
import { callLLM } from './openrouter.js';
import { fixture } from '../actions/action-fixtures.test-helper.js';
vi.mock('./openrouter.js', () => ({ callLLM: vi.fn() }));
it('turns a model-selected native mutation into a durable human proposal', async () => {
  const f = await fixture();
  vi.mocked(callLLM).mockResolvedValue({ model: 'test', content: '', latencyMs: 0, tokensIn: 1, tokensOut: 1, estimatedCost: 0,
    toolCalls: [{ type: 'function', id: 'call', function: { name: 'billing_pause', arguments: '{"id":"abc"}' } }] });
  const result = await executeWithTools({ catalog: [f.tool], actor: f.p, llmMessages: [], model: 'test', apiKey: 'unused',
    prepare: (t, a) => f.service.prepare(f.p, t, a) });
  expect(result.actionMessage?.content).toContain('abc'); expect(f.dispatch).not.toHaveBeenCalled();
});
it('finds a native tool beyond the initial model catalog limit', async () => {
  const f = await fixture();
  const catalog = Array.from({ length: 90 }, (_, i) => ({ ...f.tool, name: 'tool_' + i,
    definition: { ...f.tool.definition, function: { ...f.tool.definition.function, name: 'alias_' + i, description: 'operation ' + i } } }));
  const answer = (name: string, args: object) => ({ model: 'fixture', content: '', latencyMs: 0, tokensIn: 1, tokensOut: 1, estimatedCost: 0,
    toolCalls: [{ type: 'function' as const, id: 'call_' + name, function: { name, arguments: JSON.stringify(args) } }] });
  vi.mocked(callLLM).mockResolvedValueOnce(answer('find_mcp_tools', { query: '', offset: 80 }))
    .mockResolvedValueOnce(answer('alias_89', { id: 'sample' }));
  const result = await executeWithTools({ catalog, actor: f.p, llmMessages: [], model: 'fixture', apiKey: 'unused',
    prepare: (t, a) => f.service.prepare(f.p, t, a) });
  expect(result.actionMessage?.content).toContain('tool_89');
  expect(f.dispatch).not.toHaveBeenCalled();
});
