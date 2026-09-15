'use client';
import { useEffect, useState } from 'react';
import { mcpSettings } from '@/lib/mcp-api';
import { getAdminRole } from '@/lib/api';

/** Operator configuration for tenant-isolated read-only tools. The secret is write-only. */
export function McpSection({ tenantId }: { tenantId: string }) {
  const [url, setUrl] = useState(''); const [tools, setTools] = useState('');
  const [secret, setSecret] = useState(''); const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(true); const [error, setError] = useState('');
  const [status, setStatus] = useState(''); const operator = getAdminRole() === 'super_admin';
  useEffect(() => {
    if (!operator) return;
    let active = true;
    mcpSettings(tenantId, 'GET').then(data => {
      if (!active) return;
      setUrl(data.serverUrl); setTools(data.allowedTools.join('\n')); setConfigured(data.configured);
    }).catch(() => { if (active) setError('Could not load MCP configuration.'); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [tenantId, operator]);
  if (!operator) return null;
  async function save(method: 'PUT' | 'DELETE') {
    setBusy(true); setError(''); setStatus('');
    try {
      const data = await mcpSettings(tenantId, method, method === 'PUT' ? {
        serverUrl: url.trim(), serviceToken: secret,
        allowedTools: tools.split(/[\n,]/).map(s => s.trim()).filter(Boolean),
      } : undefined);
      setConfigured(data.configured); setUrl(data.serverUrl); setTools(data.allowedTools.join('\n')); setSecret('');
      setStatus(method === 'PUT' ? 'Configuration saved. Validate the client connection before release.' : 'MCP disabled for this tenant.');
    } catch (err) { setError(err instanceof Error ? err.message : 'MCP configuration failed'); }
    finally { setBusy(false); }
  }
  return <section className="card space-y-4" aria-label="Tenant MCP">
    <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-600">Tenant MCP</h2>
    <p className="text-sm">{configured ? 'Configured for this tenant only.' : 'Disabled. Chat works with supplied context.'} Only approved read-only tools are available.</p>
    <label className="block text-sm">Public HTTPS endpoint
      <input className="input-field mt-1" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://app.example.com/mcp" /></label>
    <label className="block text-sm">Dedicated MCP service credential
      <input className="input-field mt-1" type="password" autoComplete="new-password" value={secret} onChange={e => setSecret(e.target.value)} /></label>
    <p className="text-xs text-surface-600">Provide the credential from this client backend. At least 32 characters. Stored encrypted; never returned. Enter it again when changing settings. This is not the widget credential or a JWT signing secret.</p>
    <label className="block text-sm">Allowed tool names, one per line
      <textarea className="input-field mt-1" rows={4} value={tools} onChange={e => setTools(e.target.value)} /></label>
    <p className="text-xs text-surface-600">Each listed tool must declare readOnlyHint: true. The client must authorize the delegated user on every call. Saving does not test connectivity.</p>
    <div className="flex gap-3"><button className="btn-primary" disabled={busy || !url || secret.length < 32 || !tools.trim()} onClick={() => save('PUT')}>Save MCP</button>
      <button className="btn-secondary" disabled={busy || !configured} onClick={() => save('DELETE')}>Disable MCP</button></div>
    {status && <p role="status" className="text-sm">{status}</p>}
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
  </section>;
}
