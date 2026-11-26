import { expect, it, vi } from 'vitest';
import { executeWithTools } from './tool-executor.js';
import { callLLM } from './openrouter.js';
import { fixture } from '../actions/action-fixtures.test-helper.js';
import type { McpTool } from './mcp-client.js';
import { fitsDirectly, searchCatalog } from './tool-catalog.js';
vi.mock('./openrouter.js', () => ({ callLLM: vi.fn() }));
it('turns a model-selected native mutation into a durable human proposal', async () => {
  const f = await fixture();
  vi.mocked(callLLM).mockResolvedValue({ model: 'test', content: '', latencyMs: 0, tokensIn: 1, tokensOut: 1, estimatedCost: 0,
    toolCalls: [{ type: 'function', id: 'call', function: { name: 'billing_pause', arguments: '{"id":"abc"}' } }] });
  const result = await executeWithTools({ catalog: [f.tool], actor: f.p, llmMessages: [], model: 'test', apiKey: 'unused',
    prepare: (t, a) => f.service.prepare(f.p, t, a) });
  expect(result.actionMessage?.content).toContain('abc'); expect(f.dispatch).not.toHaveBeenCalled();
});

function garageCatalog(base: McpTool, count: number): McpTool[] {
  return Array.from({ length: count }, (_, i) => {
    const name = i === count - 1 ? 'add_garage_car' : 'lookup_' + i;
    return { ...base, name, readOnly: i !== count - 1, definition: { type: 'function',
      function: { ...base.definition.function, name: 'tool_' + name, description: 'Native operation ' + i } } };
  });
}

const reply = { content: '', model: 'fixture', latencyMs: 0, tokensIn: 1, tokensOut: 1, estimatedCost: 0 };
const addCar = { type: 'function' as const, id: 'add', function: { name: 'tool_add_garage_car', arguments: '{"modelId":3}' } };

it('offers the garage action on the first turn of a 41-tool session and waits for confirmation', async () => {
  const f = await fixture();
  vi.mocked(callLLM).mockImplementationOnce(async request => {
    expect(request.tools?.some(t => t.function.name === addCar.function.name)).toBe(true);
    return { ...reply, toolCalls: [addCar] };
  });
  const result = await executeWithTools({ catalog: garageCatalog(f.tool, 41), actor: f.p, llmMessages: [],
    model: 'test', apiKey: 'unused', prepare: (t, args) => f.service.prepare(f.p, t, args) });
  expect(result.actionMessage?.content).toContain('add_garage_car');
  expect(f.records[0].proposal.arguments).toEqual({ modelId: 3 });
  expect(f.dispatch).not.toHaveBeenCalled();
});

it('discards a premature refusal and loads native tools from the session catalog', async () => {
  const f = await fixture();
  const catalog = garageCatalog(f.tool, 110);
  vi.mocked(callLLM).mockImplementationOnce(async request => {
    expect(request.tools?.map(t => t.function.name)).toEqual(['find_mcp_tools']);
    expect(JSON.stringify(request.messages)).not.toContain(f.tool.server.accessToken);
    return { ...reply, content: 'I cannot add a car.' };
  }).mockImplementationOnce(async request => {
    expect(request.tools?.some(t => t.function.name === addCar.function.name)).toBe(true);
    expect(JSON.stringify(request.messages)).not.toContain('I cannot add a car.');
    return { ...reply, toolCalls: [addCar] };
  });
  const result = await executeWithTools({ catalog, actor: f.p, model: 'test', apiKey: 'unused',
    llmMessages: [{ role: 'user', content: 'Add a Caterham to my garage' }],
    prepare: (t, args) => f.service.prepare(f.p, t, args) });
  expect(result.actionMessage?.content).toContain('add_garage_car');
  expect(result.tokensIn).toBe(2);
  expect(f.dispatch).not.toHaveBeenCalled();
});

it('paginates bulky schemas and ranks tools by exact alias and normalized keywords', async () => {
  const f = await fixture();
  const catalog = garageCatalog(f.tool, 41);
  const target = catalog[40];
  target.definition.function.description = 'Adicionar um veículo na garagem';
  target.definition.function.parameters = { description: 'x'.repeat(33_000) };
  expect(fitsDirectly(catalog)).toBe(false);
  expect(searchCatalog(catalog, 'garagem veiculo')[0]).toBe(target);
  expect(searchCatalog(catalog, 'tool_add_garage_car')[0]).toBe(target);
  expect(searchCatalog(catalog, 'no_match_anywhere')).toEqual([]);
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
