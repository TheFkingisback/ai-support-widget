import { describe, it, expect, vi, beforeEach } from 'vitest';
const mock = vi.hoisted(() => ({
  listTools: vi.fn(), callTool: vi.fn(), connect: vi.fn(), close: vi.fn(), transports: [] as Array<Record<string, unknown>>,
}));
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({ Client: class {
  listTools = mock.listTools; callTool = mock.callTool; connect = mock.connect; close = mock.close;
} }));
vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({ StreamableHTTPClientTransport: class {
  constructor(url: URL, opts: Record<string, unknown>) { mock.transports.push({ url: url.href, ...opts }); }
} }));
import { getMcpTools, callMcpTool, type McpClientOpts } from './mcp-client.js';
const opts: McpClientOpts = { tenantId: 'ten_a', serverUrl: 'https://a.example.com/mcp', serviceToken: 'test-credential', allowedTools: ['read_a', 'write_a'] };
beforeEach(() => {
  vi.clearAllMocks(); mock.transports.length = 0; mock.close.mockResolvedValue(undefined);
  mock.listTools.mockResolvedValue({ tools: [
    { name: 'read_a', inputSchema: { type: 'object' }, annotations: { readOnlyHint: true } },
    { name: 'write_a', inputSchema: { type: 'object' }, annotations: { readOnlyHint: false } },
    { name: 'other_tenant', inputSchema: { type: 'object' }, annotations: { readOnlyHint: true } },
  ] });
});
describe('MCP execution contract', () => {
  it('sends selected tenant credential and delegated identity, exposes only approved read-only tools', async () => {
    expect((await getMcpTools(opts, 'usr_a')).map(t => t.function.name)).toEqual(['read_a']);
    expect(mock.transports[0]).toMatchObject({ url: opts.serverUrl, requestInit: { headers: {
      Authorization: 'Bearer test-credential', 'X-MCP-User-Id': 'usr_a', 'X-MCP-Tenant-Id': 'ten_a',
    } } });
    expect(mock.close).toHaveBeenCalled();
  });
  it('refuses hallucinated and write tools before execution', async () => {
    await expect(callMcpTool(opts, 'usr_a', 'other_tenant', {})).rejects.toThrow('not allowed');
    await expect(callMcpTool(opts, 'usr_a', 'write_a', {})).rejects.toThrow('read-only');
    expect(mock.callTool).not.toHaveBeenCalled();
  });
  it('fails on isError and sanitizes successful tool text', async () => {
    mock.callTool.mockResolvedValueOnce({ isError: true, content: [{ type: 'text', text: 'private upstream failure' }] });
    await expect(callMcpTool(opts, 'usr_a', 'read_a', {})).rejects.toMatchObject({ errorCode: 'MCP_TOOL_ERROR' });
    mock.callTool.mockResolvedValueOnce({ content: [{ type: 'text', text: 'Bearer abcdefghijklmnopqrstuvwxyz0123456789' }] });
    expect(await callMcpTool(opts, 'usr_a', 'read_a', {})).toBe('[REDACTED]');
  });
});
