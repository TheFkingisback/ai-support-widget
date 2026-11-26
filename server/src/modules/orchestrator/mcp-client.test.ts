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
import { discover, invoke } from './mcp-client.js';
const server = { id: 'billing', url: 'https://a.example.com/mcp', accessToken: 'delegated-a' };
const actor = { tenantId: 'ten_a', userId: 'usr_a', sid: 'sid' };
beforeEach(() => {
  vi.clearAllMocks(); mock.transports.length = 0; mock.close.mockResolvedValue(undefined);
  mock.listTools.mockResolvedValue({ tools: [
    { name: 'read_a', inputSchema: { type: 'object' }, annotations: { readOnlyHint: true } },
    { name: 'write_a', inputSchema: { type: 'object' }, annotations: { readOnlyHint: false } },
    { name: 'other_tenant', inputSchema: { type: 'object' }, annotations: { readOnlyHint: true } },
  ] });
});
describe('MCP session discovery and invocation', () => {
  it('routes duplicate tool names to the right server with its own token', async () => {
    const other = { id: 'crm', url: 'https://crm.example.com/mcp', accessToken: 'delegated-b' };
    const tools = await discover([server, other], actor);
    expect(new Set(tools.map(t => t.definition.function.name)).size).toBe(6);
    expect(tools[0].definition.function.name).toMatch(/^billing_read_a_/);
    expect(tools[1].definition.function.name).toMatch(/^prepare_billing_write_a_/);
    expect(tools[1].definition.function.description).toContain('Omit optional fields');
    expect(tools[1].name).toBe('write_a');
    expect(mock.transports[1]).toMatchObject({ url: other.url, requestInit: { headers: {
      Authorization: 'Bearer delegated-b',
    } } });
    await expect(invoke(tools[1], actor, {})).rejects.toThrow('Confirmation required');
    mock.callTool.mockResolvedValue({ content: [{ type: 'text', text: 'Bearer abcdefghijklmnopqrstuvwxyz0123456789' }] });
    expect(await invoke(tools[3], actor, {})).toBe('[REDACTED]');
    expect(mock.transports.at(-1)?.url).toBe(other.url);
  });
  it('follows every cursor and treats missing annotations as a proposed action', async () => {
    mock.listTools.mockResolvedValueOnce({ tools: [], nextCursor: 'page2' }).mockResolvedValueOnce({
      tools: [{ name: 'native', inputSchema: { type: 'object' } }] });
    const [tool] = await discover([server], actor);
    expect(tool.readOnly).toBe(false); expect(mock.listTools).toHaveBeenCalledWith({ cursor: 'page2' });
    await expect(invoke(tool, actor, {}, 'confirmation')).rejects.toThrow('changed'); expect(mock.callTool).not.toHaveBeenCalled();
  });
  it('rejects repeated cursors and keeps independent servers available', async () => {
    mock.listTools.mockResolvedValue({ tools: [], nextCursor: 'cycle' });
    expect(await discover([server], actor)).toEqual([]);
  });
});
