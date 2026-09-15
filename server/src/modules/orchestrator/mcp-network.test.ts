import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
const state = vi.hoisted(() => ({ addresses: [{ address: '8.8.8.8', family: 4 }], status: 200, body: '{}', connected: 0 }));
vi.mock('node:dns', () => ({ lookup: (_host: string, _options: unknown, callback: Function) => callback(null, state.addresses) }));
vi.mock('node:https', () => ({ request: (_url: URL, options: any, response: Function) => {
  const req = new EventEmitter() as EventEmitter & { end: Function; destroy: Function };
  req.destroy = (error?: Error) => { if (error) req.emit('error', error); req.emit('close'); };
  req.end = () => queueMicrotask(() => options.lookup('mcp.example.com', { all: true }, (error: Error | null, addresses: unknown) => {
    if (error) { req.destroy(error); return; }
    expect(addresses).toEqual(state.addresses); state.connected++;
    const res = Object.assign(Readable.from([Buffer.from(state.body)]), { statusCode: state.status, headers: { 'content-type': 'application/json' } });
    res.on('close', () => req.emit('close')); response(res);
  }));
  return req;
} }));
import { createMcpFetch } from './mcp-network.js';
beforeEach(() => { state.addresses = [{ address: '8.8.8.8', family: 4 }]; state.status = 200; state.body = '{}'; state.connected = 0; });
describe('MCP transport boundaries', () => {
  it('uses the vetted DNS answers for the actual socket and preserves JSON response', async () => {
    const response = await createMcpFetch('https://mcp.example.com/mcp')('https://mcp.example.com/mcp', { method: 'POST', body: '{}' });
    expect(await response.json()).toEqual({}); expect(state.connected).toBe(1);
  });
  it('rejects a hostname resolving to a mix of public and private addresses before connecting', async () => {
    state.addresses.push({ address: '169.254.169.254', family: 4 });
    await expect(createMcpFetch('https://mcp.example.com/mcp')('https://mcp.example.com/mcp')).rejects.toThrow('blocked');
    expect(state.connected).toBe(0);
  });
  it('refuses redirects instead of forwarding credentials', async () => {
    state.status = 302;
    await expect(createMcpFetch('https://mcp.example.com/mcp')('https://mcp.example.com/mcp')).rejects.toThrow('redirect');
    expect(state.connected).toBe(1);
  });
  it('bounds streamed responses, including bodies without content-length', async () => {
    state.body = 'x'.repeat(262145);
    const response = await createMcpFetch('https://mcp.example.com/mcp')('https://mcp.example.com/mcp');
    await expect(response.text()).rejects.toThrow('256 KiB');
  });
  it('rejects a changed origin or path before sending anything', async () => {
    const fetch = createMcpFetch('https://mcp.example.com/mcp');
    await expect(fetch('https://other.example.com/mcp')).rejects.toThrow('destination');
    await expect(fetch('https://mcp.example.com/other')).rejects.toThrow('destination');
    expect(state.connected).toBe(0);
  });
});
