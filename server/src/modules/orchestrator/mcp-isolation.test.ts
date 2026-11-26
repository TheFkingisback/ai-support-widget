import { describe, it, expect } from 'vitest';
import { isPublicAddress, validateMcpUrl, createMcpFetch } from './mcp-network.js';
describe('MCP network boundary', () => {
  it.each(['127.0.0.1','10.1.2.3','169.254.169.254','100.64.0.1','192.168.0.1','172.31.1.1','::1','::ffff:127.0.0.1','fc00::1','2002:7f00:1::','2001:db8::1'])('blocks nonpublic address %s', ip => expect(isPublicAddress(ip)).toBe(false));
  it('accepts public addresses and refuses redirects or alternate destinations before network use', async () => {
    expect(isPublicAddress('8.8.8.8')).toBe(true); expect(isPublicAddress('2606:4700::1111')).toBe(true);
    expect(() => validateMcpUrl('http://example.com/mcp')).toThrow();
    expect(() => validateMcpUrl('https://example.com/mcp?token=x')).toThrow();
    await expect(createMcpFetch('https://example.com/mcp')('https://evil.example.com/mcp')).rejects.toThrow('destination changed');
  });
});
