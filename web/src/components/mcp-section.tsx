'use client';
import { useEffect, useState } from 'react';
import { mcpSettings, type ActionPolicy, type ActionVerification } from '@/lib/mcp-api';
import { getAdminRole, getAdminTenantId } from '@/lib/api';

/** Self-service tenant integration configuration. The secret is write-only. */
export function McpSection({ tenantId }: { tenantId: string }) {
  const [verification, setVerification] = useState<ActionVerification | null>(null);
  const [actionPolicy, setActionPolicy] = useState<ActionPolicy | undefined>();
  const [url, setUrl] = useState(''); const [tools, setTools] = useState('');
  const [secret, setSecret] = useState(''); const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(true); const [error, setError] = useState('');
  const [status, setStatus] = useState(''); const operator = getAdminRole() === 'super_admin' ||
    (getAdminRole() === 'tenant_admin' && getAdminTenantId() === tenantId);
  useEffect(() => {
    if (!operator) return;
    let active = true;
    mcpSettings(tenantId, 'GET').then(data => {
      if (!active) return;
      setVerification(data.actionVerification ?? null); setActionPolicy(data.actionPolicy ?? undefined); setUrl(data.serverUrl); setTools(data.allowedTools.join('\n')); setConfigured(data.configured);
    }).catch(() => { if (active) setError('Could not load MCP configuration.'); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [tenantId, operator]);
  if (!operator) return null;
  async function save(method: 'PUT' | 'DELETE') {
    setBusy(true); setError(''); setStatus('');
    try {
      const data = await mcpSettings(tenantId, method, method === 'PUT' ? {
        serverUrl: url.trim(), serviceToken: secret, actionPolicy: actionPolicy ? { ...actionPolicy,
          operations: [...new Set(actionPolicy.operations.map(s => s.trim()).filter(Boolean))] } : undefined,
        allowedTools: tools.split(/[\n,]/).map(s => s.trim()).filter(Boolean),
      } : undefined);
      setConfigured(data.configured); setVerification(data.actionVerification ?? null); setActionPolicy(data.actionPolicy ?? undefined); setUrl(data.serverUrl); setTools(data.allowedTools.join('\n')); setSecret('');
      setStatus(method === 'PUT' ? 'Configuration saved. Validate the client connection before release.' : 'MCP disabled for this tenant.');
    } catch (err) { setError(err instanceof Error ? err.message : 'MCP configuration failed'); }
    finally { setBusy(false); }
  }
  return <section className="card space-y-4" aria-label="Tenant MCP">
    <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-600">Tenant MCP</h2>
    <p className="text-sm">{configured ? 'Configured for this tenant only.' : 'Disabled. Chat works with supplied context.'} Read tools must be explicitly approved.</p>
    <label className="flex gap-2 text-sm"><input type="checkbox" disabled={busy || (!verification && !actionPolicy?.enabled)} checked={actionPolicy?.enabled ?? false}
      onChange={e => setActionPolicy({ contractVersion: 1, operations: actionPolicy?.operations ?? [], enabled: e.target.checked })} />Enable human-confirmed actions</label>
    <label className="block text-sm">Allowed operation names, one per line
      <textarea className="input-field mt-1" rows={3} value={(actionPolicy?.operations ?? []).join('\n')}
        onChange={e => setActionPolicy({ contractVersion: 1, enabled: actionPolicy?.enabled ?? false,
          operations: e.target.value.split('\n') })} /></label>
    <p className="text-xs text-surface-600">Use operations implemented by your MCP provider under the action contract. Every execution requires human confirmation. </p>
    {!verification && <p className="text-sm">Human-confirmed actions are not available on this platform yet. Read tools can still be configured.</p>}
    {verification && <details><summary>Verification key for your MCP provider</summary>
      <p className="text-xs">Algorithm: {verification.algorithm}. Key ID: {verification.keyId}. Issuer: {verification.issuer}.</p>
      <label className="block text-sm">Public verification key<textarea className="input-field mt-1" readOnly rows={5} value={verification.publicKeyPem} /></label>
      <p className="text-xs">Install this public key in your provider to verify confirmation proofs. Keep your business rules and user permission checks in that provider.</p>
    </details>}
    <label className="block text-sm">Public HTTPS endpoint
      <input className="input-field mt-1" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://app.example.com/mcp" /></label>
    <label className="block text-sm">Dedicated MCP service credential
      <input className="input-field mt-1" type="password" autoComplete="new-password" value={secret} onChange={e => setSecret(e.target.value)} /></label>
    <p className="text-xs text-surface-600">Provide the credential from this client backend. At least 32 characters. Stored encrypted; never returned. Enter it again when changing settings. This is not the widget credential or a JWT signing secret.</p>
    <label className="block text-sm">Allowed tool names, one per line
      <textarea className="input-field mt-1" rows={4} value={tools} onChange={e => setTools(e.target.value)} /></label>
    <p className="text-xs text-surface-600">Each listed tool must declare readOnlyHint: true. The client must authorize the delegated user on every call. Saving does not test connectivity.</p>
    <div className="flex gap-3"><button className="btn-primary" disabled={busy || (actionPolicy?.enabled && !verification) || !url || secret.length < 32 || !tools.trim() || (actionPolicy?.enabled && !actionPolicy.operations.some(s => s.trim()))} onClick={() => save('PUT')}>Save MCP</button>
      <button className="btn-secondary" disabled={busy || !configured} onClick={() => save('DELETE')}>Disable MCP</button></div>
    {status && <p role="status" className="text-sm">{status}</p>}
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
  </section>;
}
