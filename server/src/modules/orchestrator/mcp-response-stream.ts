import type { Readable } from 'node:stream';
/** Bounded async-iterator bridge. Cancellation may race an incoming chunk on Node 20. */
export function mcpResponseStream(source: Readable, limit = 262144): ReadableStream<Uint8Array> {
  const iterator = source[Symbol.asyncIterator]();
  let closed = false; let bytes = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await iterator.next();
        if (closed) return;
        if (next.done) { closed = true; controller.close(); return; }
        const chunk: unknown = next.value;
        if (!(chunk instanceof Uint8Array) && typeof chunk !== 'string') throw new Error('Invalid MCP response chunk');
        const data = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
        bytes += data.byteLength;
        if (bytes > limit) throw new Error('MCP response exceeds 256 KiB');
        controller.enqueue(data);
      } catch (error) {
        if (!closed) { closed = true; controller.error(error); }
        source.destroy();
      }
    },
    cancel() {
      closed = true; source.destroy();
      void iterator.return?.().catch(() => {});
    },
  });
}
