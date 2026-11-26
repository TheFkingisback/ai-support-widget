import type { Message } from '../../shared/types.js';
import { callLLM, type LLMMessage, type LLMResponse, type ToolDef } from './openrouter.js';
import { invoke, type McpPrincipal, type McpTool } from './mcp-client.js';
import { catalogGuide, fitsDirectly, SEARCH_PAGE_SIZE, searchCatalog } from './tool-catalog.js';
import { log } from '../../shared/logger.js';

interface Options {
  catalog: McpTool[]; actor: McpPrincipal; model: string; apiKey: string; llmMessages: LLMMessage[]; requestId?: string;
  prepare?: (tool: McpTool, args: Record<string, unknown>) => Promise<Message>;
}
const search: ToolDef = { type: 'function', function: { name: 'find_mcp_tools',
  description: 'Load native tools (including actions) by exact function name or related keywords. Use an empty query and offset to browse.',
  parameters: { type: 'object', properties: { query: { type: 'string' }, offset: { type: 'integer', minimum: 0 } }, required: ['query'] },
} };
export async function executeWithTools(opts: Options): Promise<LLMResponse & { actionMessage?: Message }> {
  const { catalog, actor, model, apiKey, requestId } = opts;
  const messages = [...opts.llmMessages];
  if (!catalog.length) messages.push({ role: 'system', content: 'No live tools are available. Disclose that a live lookup or action could not be performed.' });
  const searchable = catalog.length > 32;
  const paged = !fitsDirectly(catalog);
  let visible = paged ? [] : catalog;
  if (paged) messages.push({ role: 'system', content: catalogGuide(catalog) });
  log.info('MCP catalog offered to model', requestId, { catalogSize: catalog.length, nativeTools: visible.length, paged });
  const maxToolRounds = paged ? 8 : 6;
  const cost = { tokensIn: 0, tokensOut: 0, estimatedCost: 0 };
  for (let iteration = 0; ; iteration++) {
    const tools = visible.map(t => t.definition);
    if (searchable) tools.push(search);
    const response = await callLLM({ model, messages, tools: iteration < maxToolRounds ? tools : [] }, apiKey, requestId);
    cost.tokensIn += response.tokensIn; cost.tokensOut += response.tokensOut; cost.estimatedCost += response.estimatedCost;
    if (paged && !visible.length && !response.toolCalls?.length && iteration < maxToolRounds) {
      // A prose answer to a search-only catalog has seen no native schemas yet.
      // Ignore it and perform discovery even on models that skip the search call.
      const request = [...opts.llmMessages].reverse().find(message => message.role === 'user')?.content ?? '';
      const matches = searchCatalog(catalog, request);
      visible = (matches.length ? matches : catalog).slice(0, SEARCH_PAGE_SIZE);
      messages.push({ role: 'system', content: 'Native tools have now been loaded. Use them for the request, or search the session catalog for additional tools before reporting an unavailable operation.' });
      log.info('Loaded MCP tools after skipped discovery', requestId, { catalogSize: catalog.length, loaded: visible.length });
      continue;
    }
    if (!response.toolCalls?.length || iteration >= maxToolRounds) return { ...response, ...cost };
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
          const matches = searchCatalog(catalog, query);
          const page = matches.slice(offset, offset + SEARCH_PAGE_SIZE);
          if (paged && page.length) visible = [...new Set([...page, ...visible])].slice(0, 64);
          if (paged && !visible.length) visible = catalog.slice(0, SEARCH_PAGE_SIZE);
          content = JSON.stringify({ total: matches.length, offset, tools: page.map(t => t.definition.function.name),
            nextOffset: offset + page.length < matches.length ? offset + page.length : null,
            hint: page.length ? undefined : 'Try another keyword, an exact name from the catalog, or an empty query to browse.' });
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
