import { createServer } from 'node:http';
import { once } from 'node:events';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { discover, invoke } from '../../modules/orchestrator/mcp-client.js';
import { createActionService } from '../../modules/actions/action-service.js';
import { fixture } from '../../modules/actions/action-fixtures.test-helper.js';

let port: number;
// Use actual HTTP and MCP SDKs on both ends. Only replace public TLS/DNS in this local fixture.
vi.mock('../../modules/orchestrator/mcp-network.js', async original => ({
  ...await original<typeof import('../../modules/orchestrator/mcp-network.js')>(),
  createMcpFetch: (url: string) => (_input: RequestInfo | URL, init?: RequestInit) =>
    fetch('http://127.0.0.1:' + port + new URL(url).pathname, init),
}));
const writes: { id: string; key?: string | string[] }[] = [];
const http = createServer(async (req, res) => {
  const id = req.url!.slice(1);
  if (req.headers.authorization !== 'Bearer token-' + id) { res.writeHead(403).end(); return; }
  if (req.method !== 'POST') { res.writeHead(405).end(); return; }
  const sdk = new McpServer({ name: id, version: '1' });
  sdk.registerTool('status', { annotations: { readOnlyHint: true } }, async () => ({ content: [{ type: 'text', text: id }] }));
  sdk.registerTool('pause', { inputSchema: { id: z.string() } }, async args => {
    writes.push({ id: args.id, key: req.headers['idempotency-key'] });
    return { content: [{ type: 'text', text: 'paused' }] };
  });
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on('close', () => { void sdk.close(); });
  await sdk.connect(transport); await transport.handleRequest(req, res);
});
beforeAll(async () => { http.listen(0, '127.0.0.1'); await once(http, 'listening'); port = (http.address() as { port: number }).port; });
afterAll(async () => { http.close(); http.closeAllConnections(); await once(http, 'close'); });
it('discovers and calls two independent native MCP servers and confirms a write once', async () => {
  const f = await fixture();
  const servers = ['billing','crm'].map(id => ({ id, url: 'https://fixture.example/' + id, accessToken: 'token-' + id }));
  const tools = await discover(servers, f.p);
  expect(tools).toHaveLength(4);
  for (const tool of tools.filter(t => t.readOnly)) expect(await invoke(tool, f.p, {})).toBe(tool.server.id);
  const pause = tools.find(t => !t.readOnly && t.server.id === 'billing')!;
  const service = createActionService(f.store, f.gateway);
  const shown = await service.prepare(f.p, pause, { id: 'synthetic' });
  expect(writes).toHaveLength(0);
  const human = await f.gateway.addMessage(f.p.caseId, f.p.tenantId, f.p.userId, 'user', 'confirm');
  await service.respond(f.p, tools, human, f.gateway._messages, shown.id);
  await service.respond(f.p, tools, human, f.gateway._messages, shown.id);
  expect(writes).toEqual([{ id: 'synthetic', key: f.records[0].id }]);
});
