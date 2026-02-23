import type { McpClientOpts } from './mcp-client.js';
import { getMcpTools, callMcpTool } from './mcp-client.js';
import type { LLMMessage, ToolCall, ToolDef, LLMResponse } from './openrouter.js';
import { callLLM } from './openrouter.js';
import { log } from '../../shared/logger.js';

const MAX_TOOL_ITERATIONS = 3;

interface ToolExecOpts {
  mcpOpts: McpClientOpts;
  userId: string;
  model: string;
  apiKey: string;
  llmMessages: LLMMessage[];
  requestId?: string;
}

/**
 * Fetches tool definitions from the MCP server and converts them for OpenRouter.
 * Caches per-request (tools don't change during a conversation turn).
 */
export async function fetchToolDefs(
  mcpOpts: McpClientOpts,
  userId: string,
  requestId?: string,
): Promise<ToolDef[]> {
  try {
    return await getMcpTools(mcpOpts, userId, requestId);
  } catch (err) {
    log.warn('Failed to fetch MCP tools, continuing without', requestId, {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Executes a tool-augmented LLM conversation loop:
 * 1. Call LLM with tools
 * 2. If LLM returns tool_calls, execute each via MCP
 * 3. Feed tool results back to LLM
 * 4. Repeat up to MAX_TOOL_ITERATIONS
 * 5. Return the final text response + aggregated token counts
 */
export async function executeWithTools(opts: ToolExecOpts): Promise<LLMResponse> {
  const { mcpOpts, userId, model, apiKey, requestId } = opts;
  const messages = [...opts.llmMessages];

  const tools = await fetchToolDefs(mcpOpts, userId, requestId);
  if (tools.length === 0) {
    return callLLM({ model, messages }, apiKey, requestId);
  }

  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let totalCost = 0;
  let finalResponse: LLMResponse | null = null;

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await callLLM({ model, messages, tools }, apiKey, requestId);
    totalTokensIn += response.tokensIn;
    totalTokensOut += response.tokensOut;
    totalCost += response.estimatedCost;

    if (!response.toolCalls || response.toolCalls.length === 0) {
      finalResponse = response;
      break;
    }

    log.info('LLM requested tool calls', requestId, {
      iteration, toolCount: response.toolCalls.length,
      tools: response.toolCalls.map((t) => t.function.name),
    });

    // Add assistant message with tool calls
    messages.push({
      role: 'assistant',
      content: response.content,
      tool_calls: response.toolCalls,
    });

    // Execute each tool call and add results
    for (const tc of response.toolCalls) {
      const result = await executeSingleTool(mcpOpts, userId, tc, requestId);
      messages.push({ role: 'tool', content: result, tool_call_id: tc.id });
    }
  }

  // If we exhausted iterations, do one final call without tools
  if (!finalResponse) {
    log.warn('Tool loop exhausted, final call without tools', requestId);
    finalResponse = await callLLM({ model, messages }, apiKey, requestId);
    totalTokensIn += finalResponse.tokensIn;
    totalTokensOut += finalResponse.tokensOut;
    totalCost += finalResponse.estimatedCost;
  }

  return {
    ...finalResponse,
    tokensIn: totalTokensIn,
    tokensOut: totalTokensOut,
    estimatedCost: totalCost,
  };
}

async function executeSingleTool(
  mcpOpts: McpClientOpts,
  userId: string,
  tc: ToolCall,
  requestId?: string,
): Promise<string> {
  try {
    const args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
    return await callMcpTool(mcpOpts, userId, tc.function.name, args, requestId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error('MCP tool execution failed', requestId, { tool: tc.function.name, error: msg });
    return `Error executing tool ${tc.function.name}: ${msg}`;
  }
}
