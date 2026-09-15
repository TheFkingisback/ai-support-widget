import { getAdminApiKey } from './api';

export interface McpSettings { configured: boolean; serverUrl: string; allowedTools: string[]; updatedAt?: string }
export interface McpInput { serverUrl: string; serviceToken: string; allowedTools: string[] }
/** Reads/writes the selected tenant MCP integration without returning a stored credential. */
export async function mcpSettings(tenantId: string, method: 'GET' | 'PUT' | 'DELETE', body?: McpInput): Promise<McpSettings> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
  const response = await fetch(`${base}/api/admin/tenants/${encodeURIComponent(tenantId)}/mcp`, {
    method, cache: 'no-store', headers: { Authorization: `Bearer ${getAdminApiKey()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.message ?? 'Could not update MCP configuration');
  if (method !== 'GET') return mcpSettings(tenantId, 'GET');
  return value as McpSettings;
}
