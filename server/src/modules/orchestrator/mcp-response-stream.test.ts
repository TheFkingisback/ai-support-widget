import { describe, expect, it } from 'vitest';
import { PassThrough } from 'node:stream';
import { mcpResponseStream } from './mcp-response-stream.js';
describe('MCP response cancellation', () => {
  it('cancels a pending read before a late chunk without enqueueing into a closed controller', async () => {
    const source = new PassThrough(); const reader = mcpResponseStream(source).getReader();
    const read = reader.read(); await reader.cancel(); source.write(Buffer.from('late data'));
    expect(await read).toEqual({ done: true, value: undefined }); expect(source.destroyed).toBe(true);
  });
  it('propagates upstream errors and bounds incremental chunks', async () => {
    const source = new PassThrough(); const response = new Response(mcpResponseStream(source, 3));
    const text = response.text(); source.write('123'); source.end('4'); await expect(text).rejects.toThrow('256 KiB');
    const failed = new PassThrough(); const read = new Response(mcpResponseStream(failed)).text();
    failed.destroy(new Error('upstream reset')); await expect(read).rejects.toThrow('upstream reset');
  });
});
