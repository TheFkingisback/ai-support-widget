import { request as httpsRequest } from 'node:https';
import { lookup } from 'node:dns';
import { isIP } from 'node:net';
import { mcpResponseStream } from './mcp-response-stream.js';
import { ValidationError } from '../../shared/errors.js';

/** Only globally routable addresses may receive a tenant's MCP credential. */
export function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b, c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113));
  }
  // Conservative IPv6 global-unicast allowlist; reject transition and documentation ranges.
  return isIP(address) === 6 && /^[23]/.test(address) &&
    !/^(2001:|2002:|3fff:)/i.test(address);
}
/** Requires a public HTTPS endpoint without embedded credentials or query tokens. */
export function validateMcpUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new ValidationError('Invalid MCP URL'); }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      (url.port && url.port !== '443') || host === 'localhost' || /\.(local|internal|corp|localhost)$/.test(host) ||
      (isIP(host) ? !isPublicAddress(host) : !host.includes('.'))) {
    throw new ValidationError('MCP requires a public HTTPS endpoint on port 443, without query or credentials');
  }
  return url;
}
/** Fetch for Streamable HTTP: pin validated DNS answers at the socket, deny redirects, bound streaming. */
export function createMcpFetch(serverUrl: string): typeof fetch {
  const target = validateMcpUrl(serverUrl);
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.origin !== target.origin || url.pathname !== target.pathname || url.search || url.hash) {
      throw new Error('MCP destination changed');
    }
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    // HTTP compression is disabled so the bounded stream is also the decoded payload.
    headers.set('accept-encoding', 'identity');
    return new Promise<Response>((resolve, reject) => {
      const req = httpsRequest(url, {
        method: init?.method ?? (input instanceof Request ? input.method : 'GET'),
        headers: Object.fromEntries(headers.entries()),
        signal: init?.signal ?? undefined,
        lookup(hostname, options, callback) {
          lookup(hostname, { all: true }, (err, addresses) => {
            if (err || !addresses.length || addresses.some(item => !isPublicAddress(item.address))) {
              callback(new Error('MCP DNS destination blocked'), '', 4); return;
            }
            const selected = options.family ? addresses.filter(a => a.family === options.family) : addresses;
            if (!selected.length) { callback(new Error('MCP address unavailable'), '', 4); return; }
            if (options.all) callback(null, selected);
            else callback(null, selected[0].address, selected[0].family);
          });
        },
      }, res => {
        const status = res.statusCode ?? 502;
        if ((status >= 300 && status < 400) || res.headers['content-encoding']) {
          res.destroy(); req.destroy(); reject(new Error('MCP redirect or compressed response blocked')); return;
        }
        const responseHeaders = new Headers();
        for (const [key, val] of Object.entries(res.headers)) {
          if (val !== undefined) responseHeaders.set(key, Array.isArray(val) ? val.join(', ') : val);
        }
        const empty = [204, 205, 304].includes(status);
        const body = empty ? null : mcpResponseStream(res);
        if (empty) res.resume();
        resolve(new Response(body, { status, headers: responseHeaders }));
      });
      const timer = setTimeout(() => req.destroy(new Error('MCP request timeout')), 20000);
      req.on('close', () => clearTimeout(timer));
      req.on('error', reject);
      if (init?.body !== undefined && init.body !== null && typeof init.body !== 'string') {
        req.destroy(new Error('Unsupported MCP request body')); return;
      }
      req.end(init?.body ?? undefined);
    });
  };
}
