'use client';
import { L } from '@/lib/localization';
import { useState, useEffect } from 'react';
import { getIntegrationCredential, rotateIntegrationCredential, revokeIntegrationCredential } from '@/lib/api';

export function IntegrationCredentialSection({ tenantId }: { tenantId: string }) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [credential, setCredential] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<'rotate' | 'revoke' | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let active = true;
    setConfigured(null); setCredential(''); setConfirm(null); setError(''); setCopied(false);
    getIntegrationCredential(tenantId).then(result => { if (active) setConfigured(result.configured); })
      .catch(() => { if (active) setError('Could not load integration settings. Reload to try again.'); });
    return () => { active = false; };
  }, [tenantId]);
  async function run(action: 'rotate' | 'revoke') {
    setBusy(true); setError(''); setCopied(false); setCredential('');
    try {
      if (action === 'rotate') {
        const result = await rotateIntegrationCredential(tenantId);
        setCredential(result.credential); setConfigured(true);
      } else { await revokeIntegrationCredential(tenantId); setConfigured(false); }
      setConfirm(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not update the credential.'); }
    finally { setBusy(false); }
  }
  return <section className="card space-y-4" aria-label="Widget integration">
    <h2 className="text-xs font-semibold uppercase tracking-wider text-surface-600"><L>{"Widget integration"}</L></h2>
    <p className="text-sm text-surface-700"><L>{"Generate a credential for your application backend to request short-lived support sessions. Keep it in your server secret store."}</L></p>
    <p className="text-xs text-surface-600"><L>{"Tenant:"}</L>{" "}<code>{tenantId}</code></p>
    <p className="text-sm" role="status">{configured === null ? 'Loading…' : configured ? 'Integration credential active' : 'No integration credential configured'}</p>
    {credential && <div className="space-y-3 rounded-lg border border-brand-500 p-4">
      <p className="text-sm"><L>{"Save this credential now. It is shown only once."}</L></p>
      <input aria-label="New integration credential" readOnly value={credential} className="input-field font-mono text-xs" />
      <button type="button" className="btn-secondary" onClick={async () => {
        try { await navigator.clipboard.writeText(credential); setCopied(true); }
        catch { setError('Copy unavailable. Select and copy the credential manually.'); }
      }}>{copied ? 'Copied' : 'Copy credential'}</button>
    </div>}
    {confirm ? <div className="space-y-3">
      <p className="text-sm">{confirm === 'rotate' ? 'Replacing' : 'Revoking'}<L>{"this credential immediately invalidates its existing widget sessions."}</L>{" "}{confirm === 'rotate' ? 'Update the application backend with the new credential.' : 'The application will need a new credential to resume support.'}</p>
      <button type="button" disabled={busy} className="btn-danger mr-2" onClick={() => run(confirm)}>{busy ? 'Updating…' : 'Confirm'}</button>
      <button type="button" disabled={busy} className="btn-secondary" onClick={() => setConfirm(null)}><L>{"Cancel"}</L></button>
    </div> : <div className="flex flex-wrap gap-3">
      <button type="button" disabled={busy || configured === null} className="btn-primary" onClick={() => configured ? setConfirm('rotate') : run('rotate')}>
        {busy ? 'Generating…' : configured ? 'Replace credential' : 'Generate integration credential'}
      </button>
      {configured && <button type="button" disabled={busy} className="btn-danger" onClick={() => setConfirm('revoke')}><L>{"Revoke"}</L></button>}
    </div>}
    <p className="text-xs text-surface-600"><L>{"Backend endpoint:"}</L>{" "}<code>POST /api/widget/sessions</code><L>{". Authenticate with this credential and provide the user identity from your application session. The response contains the widget JWT, tenant key and expiry."}</L></p>
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
  </section>;
}
