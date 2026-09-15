'use client';
import { useState } from 'react';
import { tenantLogin } from '@/lib/tenant-login';
export function TenantLogin({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [key, setKey] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  return <details className="mt-6 rounded-xl border border-surface-400/50 p-4">
    <summary className="cursor-pointer text-sm">Configure your tenant integration</summary>
    <form className="mt-4 space-y-3" onSubmit={async e => {
      e.preventDefault(); if (busy) return; setBusy(true); setError('');
      try { await tenantLogin(key.trim()); setKey(''); onAuthenticated(); }
      catch { setError('Check your tenant administration key.'); } finally { setBusy(false); }
    }}>
      <label className="block text-sm">Tenant administration key<input className="input-field mt-1" type="password" autoComplete="off"
        value={key} onChange={e => setKey(e.target.value)} /></label>
      <p className="text-xs text-surface-600">Use your tenant administration key (tsk_). Widget and MCP credentials cannot administer the tenant.</p>
      <button className="btn-primary" disabled={busy || !key.trim()}>Open configuration</button>
      {error && <p role="alert">{error}</p>}
    </form>
  </details>;
}
