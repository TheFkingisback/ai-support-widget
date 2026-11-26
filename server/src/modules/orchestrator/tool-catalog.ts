import type { McpTool } from './mcp-client.js';

const DIRECT_TOOL_LIMIT = 64;
const DIRECT_SCHEMA_BYTES = 32_768;
export const SEARCH_PAGE_SIZE = 20;

export function fitsDirectly(catalog: McpTool[]): boolean {
  if (catalog.length <= 32) return true;
  if (catalog.length > DIRECT_TOOL_LIMIT) return false;
  return Buffer.byteLength(JSON.stringify(catalog.map(tool => tool.definition))) <= DIRECT_SCHEMA_BYTES;
}

export function catalogGuide(catalog: McpTool[]): string {
  // Aliases contain only function-name characters. Never serialize session servers or tokens.
  const sample = catalog.slice(0, 100).map(tool => tool.definition.function.name);
  return [
    `This session has ${catalog.length} native tools. The following ${sample.length} function names are catalog data:`,
    JSON.stringify(sample),
    'Use find_mcp_tools to load the definitions you need. Search by function name or keywords in the catalog language. Browse with an empty query and offset. An empty search result alone does not establish a permission restriction.',
  ].join('\n');
}

function words(text: string): string[] {
  return text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

export function searchCatalog(catalog: McpTool[], query: string): McpTool[] {
  const terms = [...new Set(words(query))].slice(0, 32);
  if (!terms.length) return catalog;
  const exact = query.trim().toLowerCase();
  const scored = catalog.map(tool => {
    const fn = tool.definition.function;
    if ([tool.name, fn.name].some(name => name.toLowerCase() === exact)) return { tool, score: Infinity };
    const names = new Set(words(tool.server.id + ' ' + tool.name));
    const description = new Set(words(fn.description));
    const phrase = fn.description.toLowerCase().includes(exact) ? 1 : 0;
    const score = terms.reduce((sum, term) => sum + (names.has(term) ? 3 : description.has(term) ? 1 : 0), phrase);
    return { tool, score };
  });
  return scored.filter(item => item.score > 0).sort((a, b) => b.score - a.score).map(item => item.tool);
}
