import type { SupportLocale } from '@ai-support/shared/locales';

const translatedDocuments = new Set([
  'INICIAR.html', 'GUIA.md', 'MCP.md', 'ACEITE.md', 'PUBLICACAO.md', 'PROMPT-TENANT.txt', 'README.md',
  'backend-session.mjs', 'mcp-auth.mjs', 'widget-controller.mjs', 'examples.test.mjs',
]);

export function localizedArtifact(path: string, locale: SupportLocale) {
  const [, directory, file, extra] = path.split('/');
  if (extra !== undefined || !file) return path;
  const translated = directory === 'integration-v4' && translatedDocuments.has(file);
  const archive = directory === 'downloads' && (
    file === 'ai-support-starter.zip' || file === 'release-manifest.json' || /^ai-support-integration-v4-sdk-\d+\.\d+\.\d+\.zip$/.test(file)
  );
  return translated || archive ? `/${directory}/${locale}/${file}` : path;
}
