import type { ActionPolicy } from '../actions/action-contract.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { log } from '../../shared/logger.js';
import { createMcpFetch } from './mcp-network.js';
import { safeText } from '../context/safe-content.js';
import { AppError } from '../../shared/errors.js';

export interface McpClientOpts {
  tenantId: string;
  serverUrl: string;
  serviceToken: string;
  allowedTools: string[];
  actionPolicy?: ActionPolicy;
}

export interface ToolDef {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

function createTransport(opts: McpClientOpts, userId: string, actionHeaders: Record<string, string> = {}): StreamableHTTPClientTransport {
  return new StreamableHTTPClientTransport(new URL(opts.serverUrl), {
    fetch: createMcpFetch(opts.serverUrl),
    requestInit: {
      headers: {
        'Authorization': `Bearer ${opts.serviceToken}`,
        'X-MCP-User-Id': userId,
        'X-MCP-Tenant-Id': opts.tenantId,
        ...actionHeaders,
      },
    },
  });
}

/** Internal transport; reserved headers may only be supplied by the action backend. */
export async function withClient<T>(
  opts: McpClientOpts, userId: string, requestId: string | undefined,
  fn: (client: Client) => Promise<T>,
  actionHeaders?: Record<string, string>,
): Promise<T> {
  const client = new Client({ name: 'ai-support-widget', version: '1.0.0' });
  const transport = createTransport(opts, userId, actionHeaders);
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
    return tools.filter(t => !['prepare_action', 'execute_action', 'get_action_status'].includes(t.name) && opts.allowedTools.includes(t.name) && t.annotations?.readOnlyHint === true).map((t) => ({
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
  if (['prepare_action', 'execute_action', 'get_action_status'].includes(toolName) || !opts.allowedTools.includes(toolName)) throw new AppError(403, 'MCP_TOOL_FORBIDDEN', 'Tool is not allowed');
  log.info('MCP tool call', requestId, { tenantId: opts.tenantId, tool: toolName });

  return withClient(opts, userId, requestId, async (client) => {
    const catalog = await client.listTools();
    if (!catalog.tools.some(t => t.name === toolName && t.annotations?.readOnlyHint === true)) {
      throw new AppError(403, 'MCP_TOOL_FORBIDDEN', 'Only approved read-only tools are supported');
    }
    const result = await client.callTool({ name: toolName, arguments: args });
    if (result.isError) throw new AppError(502, 'MCP_TOOL_ERROR', 'The client tool reported a failure');
    const content = result.content as Array<{ type: string; text?: string }> | undefined;
    if (Array.isArray(content)) {
      return safeText(content.filter((c) => c.type === 'text').map((c) => c.text ?? '').join('\n')).slice(0, 32000);
    }
    return safeText(JSON.stringify(result)).slice(0, 32000);
  });
}
