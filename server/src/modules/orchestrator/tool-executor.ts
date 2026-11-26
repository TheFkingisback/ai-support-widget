import type { Message } from '../../shared/types.js';
import { callLLM, type LLMMessage, type LLMResponse, type ToolDef } from './openrouter.js';
import { invoke, type McpPrincipal, type McpTool } from './mcp-client.js';

interface Options {
  catalog: McpTool[]; actor: McpPrincipal; model: string; apiKey: string; llmMessages: LLMMessage[]; requestId?: string;
  prepare?: (tool: McpTool, args: Record<string, unknown>) => Promise<Message>;
}
const search: ToolDef = { type: 'function', function: { name: 'find_mcp_tools',
  description: 'Find available tools by server, name or description. Use an empty query and offset to browse.',
  parameters: { type: 'object', properties: { query: { type: 'string' }, offset: { type: 'integer', minimum: 0 } }, required: ['query'] },
} };
export async function executeWithTools(opts: Options): Promise<LLMResponse & { actionMessage?: Message }> {
  const { catalog, actor, model, apiKey, requestId } = opts;
  const messages = [...opts.llmMessages];
  if (!catalog.length) messages.push({ role: 'system', content: 'No live tools are available. Disclose that a live lookup or action could not be performed.' });
  const searchable = catalog.length > 32;
  let visible = searchable ? [] : catalog;
  const cost = { tokensIn: 0, tokensOut: 0, estimatedCost: 0 };
  for (let iteration = 0; ; iteration++) {
    const tools = visible.map(t => t.definition);
    if (searchable) tools.push(search);
    const response = await callLLM({ model, messages, tools: iteration < 6 ? tools : [] }, apiKey, requestId);
    cost.tokensIn += response.tokensIn; cost.tokensOut += response.tokensOut; cost.estimatedCost += response.estimatedCost;
    if (!response.toolCalls?.length || iteration >= 6) return { ...response, ...cost };
    const offered = visible;
    messages.push({ role: 'assistant', content: response.content, tool_calls: response.toolCalls });
    for (const call of response.toolCalls) {
      let content: string;
      try {
        const args = JSON.parse(call.function.arguments);
        if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('Invalid arguments');
        if (searchable && call.function.name === search.function.name) {
          const query = String(args.query ?? '').trim().toLowerCase();
          const offset = Number.isSafeInteger(args.offset) && args.offset > 0 ? args.offset : 0;
          const matches = catalog.filter(t => t.definition.function.description.toLowerCase().includes(query));
          visible = matches.slice(offset, offset + 20);
          content = JSON.stringify({ total: matches.length, offset, tools: visible.map(t => t.definition.function.name) });
        } else {
          const tool = offered.find(t => t.definition.function.name === call.function.name);
          if (!tool) throw new Error('Unknown tool');
          if (!tool.readOnly) {
            if (!opts.prepare) throw new Error('Confirmation unavailable');
            const actionMessage = await opts.prepare(tool, args);
            return { ...response, ...cost, content: actionMessage.content, actionMessage };
          }
          content = await invoke(tool, actor, args);
        }
      } catch { content = 'MCP request failed. No successful result was obtained. Do not claim completion.'; }
      messages.push({ role: 'tool', content, tool_call_id: call.id });
    }
  }
}
