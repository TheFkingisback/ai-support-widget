import { build } from 'esbuild';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const file = name => fileURLToPath(new URL(name, import.meta.url));
const { version } = JSON.parse(await readFile(file('package.json'), 'utf8'));
await build({ entryPoints: [file('dist/widget.js')], bundle: true, format: 'iife',
  globalName: 'AISupportWidgetModule', outfile: file('dist/widget.bundle.js'), minify: true,
  footer: { js: 'window.AISupportWidget=AISupportWidgetModule.AISupportWidget;' },
});
const bytes = await readFile(file('dist/widget.bundle.js'));
for (const name of ['widget.js', 'widget.bundle.js', `widget.v${version}.js`]) {
  await copyFile(file('dist/widget.bundle.js'), file(`../web/public/${name}`));
}
await writeFile(file('../web/public/widget.manifest.json'), JSON.stringify({
  version, file: `widget.v${version}.js`, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length,
}, null, 2) + '\n');
