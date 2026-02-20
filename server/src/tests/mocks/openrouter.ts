import http from 'node:http';

export interface MockLLMOptions {
  content?: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  statusCode?: number;
}

const DEFAULT_RESPONSE_CONTENT =
  `I can see that your upload failed with error code UPLOAD_TOO_LARGE. ` +
  `The file report.pdf (50MB) exceeds the 25MB upload limit for your plan. ` +
  `This is confirmed by job job_proc_001 which failed during validation at 2026-02-20T09:00:00.000Z. ` +
  `I'm confident this is the root cause.\n\n` +
  `You can retry the upload with a smaller file (under 25MB), or check the documentation ` +
  `for guidance on compressing files before upload.`;

export function createMockOpenRouterServer(
  opts?: MockLLMOptions,
): { server: http.Server; start: () => Promise<string>; calls: Array<{ body: string }> } {
  const calls: Array<{ body: string }> = [];
  const content = opts?.content ?? DEFAULT_RESPONSE_CONTENT;
  const model = opts?.model ?? 'anthropic/claude-sonnet-4-20250514';
  const promptTokens = opts?.promptTokens ?? 500;
  const completionTokens = opts?.completionTokens ?? 120;
  const statusCode = opts?.statusCode ?? 200;

  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => {
      calls.push({ body });

      res.statusCode = statusCode;
      res.setHeader('Content-Type', 'application/json');

      if (statusCode !== 200) {
        res.end(JSON.stringify({ error: { message: 'Mock error' } }));
        return;
      }

      res.end(JSON.stringify({
        choices: [{ message: { role: 'assistant', content } }],
        model,
        usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens },
      }));
    });
  });

  return {
    server,
    calls,
    start: () =>
      new Promise<string>((resolve) => {
        server.listen(0, '127.0.0.1', () => {
          const addr = server.address();
          if (addr && typeof addr === 'object') {
            resolve(`http://127.0.0.1:${addr.port}`);
          }
        });
      }),
  };
}
