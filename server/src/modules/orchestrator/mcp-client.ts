import { log } from '../../shared/logger.js';

export interface McpClientOpts {
  serverUrl: string;
  serviceToken: string;
}

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

interface McpToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * Sends a batch of JSON-RPC messages to the MCP server.
 * Each batch starts with initialize + initialized notification so the stateless server
 * processes tool requests in a single HTTP round-trip.
 */
async function mcpBatch(
  opts: McpClientOpts,
  userId: string,
  messages: JsonRpcRequest[],
  requestId?: string,
): Promise<JsonRpcResponse[]> {
  const batch: JsonRpcRequest[] = [
    {
      jsonrpc: '2.0', id: 0, method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'ai-support-widget', version: '1.0.0' },
      },
    },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
    ...messages,
  ];

  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(opts.serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${opts.serviceToken}`,
        'X-MCP-User-Id': userId,
      },
      body: JSON.stringify(batch),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`MCP server returned ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const responses = Array.isArray(data) ? data as JsonRpcResponse[] : [data as JsonRpcResponse];
    log.info('MCP batch complete', requestId, { latencyMs: Date.now() - start, responses: responses.length });
    return responses;
  } finally {
    clearTimeout(timeout);
  }
}

/** Lists available MCP tools, converted to OpenRouter/Claude tool format. */
export async function getMcpTools(
  opts: McpClientOpts,
  userId: string,
  requestId?: string,
): Promise<Array<{ type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }>> {
  const responses = await mcpBatch(opts, userId, [
    { jsonrpc: '2.0', id: 1, method: 'tools/list' },
  ], requestId);

  const toolsResp = responses.find((r) => r.id === 1);
  const tools = (toolsResp?.result?.tools ?? []) as McpToolDef[];

  return tools.map((t) => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.inputSchema },
  }));
}

/** Calls a single MCP tool and returns the text result. */
export async function callMcpTool(
  opts: McpClientOpts,
  userId: string,
  toolName: string,
  args: Record<string, unknown>,
  requestId?: string,
): Promise<string> {
  log.info('MCP tool call', requestId, { tool: toolName, args });

  const responses = await mcpBatch(opts, userId, [
    { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: toolName, arguments: args } },
  ], requestId);

  const toolResp = responses.find((r) => r.id === 1);
  if (toolResp?.error) {
    throw new Error(`MCP tool error: ${toolResp.error.message}`);
  }

  const content = toolResp?.result?.content as Array<{ type: string; text?: string }> | undefined;
  if (Array.isArray(content)) {
    return content.filter((c) => c.type === 'text').map((c) => c.text ?? '').join('\n');
  }

  return JSON.stringify(toolResp?.result ?? {});
}
