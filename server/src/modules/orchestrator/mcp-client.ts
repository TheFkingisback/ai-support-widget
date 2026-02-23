import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { log } from '../../shared/logger.js';

export interface McpClientOpts {
  serverUrl: string;
  serviceToken: string;
}

export interface ToolDef {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

function createTransport(opts: McpClientOpts, userId: string): StreamableHTTPClientTransport {
  return new StreamableHTTPClientTransport(new URL(opts.serverUrl), {
    requestInit: {
      headers: {
        'Authorization': `Bearer ${opts.serviceToken}`,
        'X-MCP-User-Id': userId,
      },
    },
  });
}

async function withClient<T>(
  opts: McpClientOpts, userId: string, requestId: string | undefined,
  fn: (client: Client) => Promise<T>,
): Promise<T> {
  const client = new Client({ name: 'ai-support-widget', version: '1.0.0' });
  const transport = createTransport(opts, userId);
  const start = Date.now();

  try {
    await client.connect(transport);
    const result = await fn(client);
    log.info('MCP call complete', requestId, { latencyMs: Date.now() - start });
    return result;
  } finally {
    await client.close().catch(() => {});
  }
}

/** Lists available MCP tools, converted to OpenRouter/Claude tool format. */
export async function getMcpTools(
  opts: McpClientOpts, userId: string, requestId?: string,
): Promise<ToolDef[]> {
  return withClient(opts, userId, requestId, async (client) => {
    const { tools } = await client.listTools();
    return tools.map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description ?? '',
        parameters: t.inputSchema as Record<string, unknown>,
      },
    }));
  });
}

/** Calls a single MCP tool and returns the text result. */
export async function callMcpTool(
  opts: McpClientOpts, userId: string,
  toolName: string, args: Record<string, unknown>, requestId?: string,
): Promise<string> {
  log.info('MCP tool call', requestId, { tool: toolName, args });

  return withClient(opts, userId, requestId, async (client) => {
    const result = await client.callTool({ name: toolName, arguments: args });
    const content = result.content as Array<{ type: string; text?: string }> | undefined;
    if (Array.isArray(content)) {
      return content.filter((c) => c.type === 'text').map((c) => c.text ?? '').join('\n');
    }
    return JSON.stringify(result);
  });
}
