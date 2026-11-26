import { createHash } from 'node:crypto';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { SessionServer } from '../sessions/session-mcp.js';
import type { ToolDef } from './openrouter.js';
import { createMcpFetch } from './mcp-network.js';
import { redactContent, safeText } from '../context/safe-content.js';
import { log } from '../../shared/logger.js';

export interface McpPrincipal { tenantId: string; userId: string; sid: string; expiresAt?: number }
export interface McpTool {
  server: SessionServer; name: string; readOnly: boolean; signature: string; definition: ToolDef;
}
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
function definition(server: SessionServer, tool: Tool): McpTool {
  const name = tool.name;
  const readOnly = tool.annotations?.readOnlyHint === true;
  const prefix = ((readOnly ? '' : 'prepare_') + server.id + '_' + name).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 49);
  const alias = prefix + '_' + digest(JSON.stringify([server.id, name])).slice(0, 12);
  const proposal = readOnly ? '' : 'Prepare a proposal now. The backend asks for confirmation before execution. Omit optional fields the user did not specify. Provider operation: ';
  const description = proposal + safeText(server.id + ' / ' + name + ': ' + (tool.description ?? ''));
  return { server, name, readOnly, signature: digest(JSON.stringify([name, readOnly, tool.inputSchema, tool.description])),
    definition: { type: 'function', function: { name: alias, description: description.slice(0, 2048),
      parameters: tool.inputSchema } } };
}
async function connected<T>(s: SessionServer, p: McpPrincipal, fn: (c: Client) => Promise<T>, actionId?: string) {
  const client = new Client({ name: 'ai-support-widget', version: '4.0.0' });
  const guardedFetch = createMcpFetch(s.url);
  const timeout = AbortSignal.timeout(20_000);
  const transport = new StreamableHTTPClientTransport(new URL(s.url), {
    fetch: async (input, init) => {
      if (p.expiresAt !== undefined && Date.now() >= p.expiresAt * 1000) throw new Error('Session expired');
      return guardedFetch(input, { ...init, signal: init?.signal ? AbortSignal.any([timeout, init.signal]) : timeout });
    }, requestInit: { headers: {
      Authorization: 'Bearer ' + s.accessToken,
      ...(actionId ? { 'Idempotency-Key': actionId } : {}),
    } },
  });
  try { await client.connect(transport); return await fn(client); }
  finally { await client.close().catch(() => {}); }
}
async function list(client: Client): Promise<Tool[]> {
  const tools: Tool[] = [];
  const cursors = new Set<string>();
  const names = new Set<string>();
  let bytes = 0;
  let cursor: string | undefined;
  do {
    const page = await client.listTools(cursor ? { cursor } : undefined);
    bytes += Buffer.byteLength(JSON.stringify(page.tools));
    if (bytes > 4_000_000 || cursors.size >= 128) throw new Error('MCP catalog too large');
    for (const tool of page.tools) {
      if (names.has(tool.name)) throw new Error('Duplicate MCP tool');
      names.add(tool.name); tools.push(tool);
    }
    cursor = page.nextCursor;
    if (cursor && cursors.has(cursor)) throw new Error('Repeated MCP catalog cursor');
    if (cursor) cursors.add(cursor);
  } while (cursor);
  return tools;
}
export async function discover(servers: SessionServer[], p: McpPrincipal, requestId?: string) {
  const catalogs = await Promise.all(servers.map(async server => {
    try { return (await connected(server, p, list)).map(t => definition(server, t)); }
    catch { log.warn('MCP catalog unavailable', requestId, { serverId: server.id }); return []; }
  }));
  return catalogs.flat();
}
export async function invoke(tool: McpTool, p: McpPrincipal, args: Record<string, unknown>, actionId?: string) {
  if (!tool.readOnly && !actionId) throw new Error('Confirmation required');
  return connected(tool.server, p, async client => {
    const current = (await list(client)).find(t => t.name === tool.name);
    if (!current || definition(tool.server, current).signature !== tool.signature) throw new Error('MCP tool changed');
    const result = await client.callTool({ name: tool.name, arguments: args });
    if (result.isError) throw new Error('MCP provider error');
    const value = result.structuredContent ? redactContent(result.structuredContent) : (Array.isArray(result.content)
      ? result.content.filter(c => c.type === 'text').map(c => c.text).join('\n') : '');
    return safeText((typeof value === 'string' ? value : JSON.stringify(value)).replaceAll(tool.server.accessToken, '[REDACTED]')).slice(0, 32000);
  }, actionId);
}
