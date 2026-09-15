import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ listTools: vi.fn(), callTool: vi.fn(), transports: [] as Array<Record<string, unknown>> }));
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({ Client: class {
  listTools = mock.listTools; callTool = mock.callTool; connect = async () => {}; close = async () => {};
} }));
vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({ StreamableHTTPClientTransport: class {
  constructor(_url: URL, opts: Record<string, unknown>) { mock.transports.push(opts); }
} }));
import { actionRemote } from './action-remote.js';
import { getMcpTools, callMcpTool } from '../orchestrator/mcp-client.js';
import { fixture } from './action-fixtures.test-helper.js';
beforeEach(() => {
  vi.clearAllMocks(); mock.transports.length = 0;
  mock.listTools.mockResolvedValue({ tools: ['prepare_action','execute_action','get_action_status'].map(name => ({
    name, inputSchema: { type: 'object', properties: { arguments: { type: 'object' } } },
    annotations: { readOnlyHint: name === 'get_action_status' },
  })) });
  mock.callTool.mockResolvedValue({ structuredContent: { contractVersion: 1 } });
});
describe('MCP action protocol boundary', () => {
  it('exposes preparation only and sends identity/proof as headers, never model arguments', async () => {
    const f = await fixture(); expect((await actionRemote.tools(f.mcp, f.p)).map(t => t.function.name)).toEqual(['prepare_action']);
    await actionRemote.call(f.mcp, f.p, 'execute_action', { actionId: 'act_1' }, 'req_1', 'signed-proof');
    expect(mock.transports.at(-1)).toMatchObject({ requestInit: { headers: {
      'X-MCP-Conversation-Id': f.p.caseId, 'X-MCP-Tenant-Id': f.p.tenantId, 'X-MCP-User-Id': f.p.userId,
      'X-MCP-Confirmation': 'signed-proof', Authorization: 'Bearer fixture-only',
    } } });
    expect(mock.callTool).toHaveBeenCalledWith({ name: 'execute_action', arguments: { actionId: 'act_1' } });
  });
  it('denies absent proof, tenant mismatch, disabled policy and missing catalog', async () => {
    const f = await fixture();
    await expect(actionRemote.call(f.mcp, f.p, 'execute_action', {})).rejects.toThrow();
    await expect(actionRemote.tools(f.mcp, { ...f.p, tenantId: 'ten_b' })).rejects.toThrow();
    await expect(actionRemote.tools({ ...f.mcp, actionPolicy: undefined }, f.p)).rejects.toThrow();
    mock.listTools.mockResolvedValue({ tools: [] });
    await expect(actionRemote.call(f.mcp, f.p, 'prepare_action', {})).rejects.toThrow();
    expect(mock.callTool).not.toHaveBeenCalled();
  });
  it('cannot bypass confirmation by declaring a reserved tool as read-only', async () => {
    const f = await fixture(); f.mcp.allowedTools = ['execute_action','prepare_action','get_action_status'];
    mock.listTools.mockResolvedValue({ tools: f.mcp.allowedTools.map(name => ({ name, inputSchema: {}, annotations: { readOnlyHint: true } })) });
    expect(await getMcpTools(f.mcp, f.p.userId)).toEqual([]);
    for (const name of f.mcp.allowedTools) await expect(callMcpTool(f.mcp, f.p.userId, name, {})).rejects.toThrow();
    expect(mock.callTool).not.toHaveBeenCalled();
  });
  it('propagates provider failure and rejects malformed results', async () => {
    const f = await fixture(); mock.callTool.mockResolvedValueOnce({ isError: true });
    await expect(actionRemote.call(f.mcp, f.p, 'get_action_status', {})).rejects.toThrow();
    mock.callTool.mockResolvedValueOnce({ content: [{ type: 'text', text: '{bad' }] });
    await expect(actionRemote.call(f.mcp, f.p, 'get_action_status', {})).rejects.toThrow();
    mock.callTool.mockResolvedValueOnce({ content: [{ type: 'text', text: '{"status":"completed"}' }] });
    expect(await actionRemote.call(f.mcp, f.p, 'get_action_status', {})).toEqual({ status: 'completed' });
  });
});
