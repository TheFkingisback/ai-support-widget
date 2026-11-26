import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(new URL('widget.manifest.json', import.meta.url), 'utf8'));

const files = {
  '/': ['starter/index.html', 'text/html; charset=utf-8'],
  '/starter/index.html': ['starter/index.html', 'text/html; charset=utf-8'],
  '/starter/sample.css': ['starter/sample.css', 'text/css; charset=utf-8'],
  '/starter/sample.js': ['starter/sample.js', 'text/javascript; charset=utf-8'],
  [`/${manifest.file}`]: [manifest.file, 'text/javascript; charset=utf-8'],
  '/widget.manifest.json': ['widget.manifest.json', 'application/json; charset=utf-8'],
};
const port = 4173;
createServer(async (request, response) => {
  const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
  const file = Object.hasOwn(files, path) ? files[path] : undefined;
  if (request.method !== 'GET' || !file) {
    response.writeHead(404).end();
    return;
  }
  try {
    const body = await readFile(new URL(file[0], import.meta.url));
    response.writeHead(200, { 'Content-Type': file[1], 'X-Content-Type-Options': 'nosniff' }).end(body);
  } catch {
    response.writeHead(500).end('The sample file is missing. Extract the entire starter ZIP.');
  }
}).listen(port, '127.0.0.1', () => process.stdout.write(`http://127.0.0.1:${port}\n`));
