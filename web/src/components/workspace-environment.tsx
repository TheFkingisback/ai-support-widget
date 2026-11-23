'use client';

import { useState, type FormEvent } from 'react';
import { workspaceApi, type Environment, type WorkspaceEnvironment } from '@/lib/workspace-api';

const button = 'rounded border border-slate-600 px-3 py-2 text-sm hover:border-teal-300 disabled:opacity-50';

export function WorkspaceEnvironmentPanel({ env, data, reload }: { env: Environment; data: WorkspaceEnvironment; reload: () => Promise<void> }) {
  const [origin, setOrigin] = useState('');
  const [credential, setCredential] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<'replace' | 'revoke' | null>(null);

  async function run(action: () => Promise<unknown>) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); await reload(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'The installation could not be updated'); }
    finally { setBusy(false); }
  }
  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(async () => { await workspaceApi.origin(env, origin, 'add'); setOrigin(''); });
  }
  function generate() {
    return run(async () => { setCredential((await workspaceApi.generate(env)).credential); setConfirm(null); });
  }

  return <div className="space-y-5 rounded-xl border border-slate-700 bg-[#131d27] p-5">
    <h2 className="text-xl font-semibold capitalize">{env}</h2>
    <p className="break-all text-sm text-slate-300">Project ID <code className="text-teal-200">{data.tenantId}</code></p>
    <ul aria-label="Installation status" className="space-y-1 text-sm text-slate-300">
      <li>{data.origins.some(entry => entry.verified_at) ? 'Verified browser origin' : 'Verify a browser origin'}</li>
      <li>{data.hasCredential ? 'Integration credential created' : 'Create an integration credential'}</li>
      <li>{data.hasAnswer ? 'First assistant reply received' : 'Send a test chat through your application'}</li>
    </ul>
    <form className="space-y-3" onSubmit={add}>
      <label className="block text-sm">Browser origin<input type="url" required value={origin} onChange={event => setOrigin(event.target.value)} placeholder="https://app.example.com" className="mt-2 block w-full rounded border border-slate-600 bg-slate-900 px-3 py-2" /></label>
      <button className={button} disabled={busy}>Add origin</button>
    </form>
    {data.origins.map(entry => <div key={entry.origin} className="space-y-2 rounded border border-slate-700 p-3 text-sm">
      <p className="break-all font-medium">{entry.origin}</p>
      {entry.verified_at ? <p className="text-teal-200">Verified</p> : <>
        <p>Set a DNS TXT record at <code className="break-all text-teal-200">_ai-support.{new URL(entry.origin).hostname}</code>.</p>
        <code className="block break-all text-teal-200">ai-support={entry.challenge}</code>
        <button type="button" className={button} disabled={busy} onClick={() => void run(() => workspaceApi.origin(env, entry.origin, 'verify'))}>Verify DNS</button>
      </>}
      <button type="button" className="ml-2 text-slate-300 underline" disabled={busy} onClick={() => void run(() => workspaceApi.origin(env, entry.origin, 'remove'))}>Remove</button>
    </div>)}
    <div className="flex flex-wrap gap-2">
      <button type="button" className={button} disabled={busy} onClick={() => data.hasCredential ? setConfirm('replace') : void generate()}>{data.hasCredential ? 'Replace credential' : 'Create credential'}</button>
      {data.hasCredential && <button type="button" className={button} disabled={busy} onClick={() => setConfirm('revoke')}>Revoke credential</button>}
    </div>
    {confirm && <div className="space-y-3 text-sm"><p>Existing sessions in this environment will expire. Confirm {confirm === 'replace' ? 'replacement' : 'revocation'}?</p>
      <button type="button" className={button} disabled={busy} onClick={() => confirm === 'replace' ? void generate() : void run(async () => { await workspaceApi.revoke(env); setCredential(''); setConfirm(null); })}>Confirm</button>
      <button type="button" className="ml-3 underline" onClick={() => setConfirm(null)}>Cancel</button>
    </div>}
    {credential && <div className="space-y-2 rounded border border-teal-700 bg-slate-900 p-3 text-sm"><p>Copy this credential to your application server’s secret store.</p><code className="block break-all">{credential}</code>
      <button type="button" className={button} onClick={() => navigator.clipboard.writeText(credential).then(() => setNotice('Credential copied'), () => setError('Clipboard unavailable. Select the credential to copy it.'))}>Copy credential</button>
      <button type="button" className="ml-3 underline" onClick={() => setCredential('')}>Hide</button>
    </div>}
    {notice && <p role="status" className="text-teal-200">{notice}</p>}
    {error && <p role="alert" className="text-rose-200">{error}</p>}
  </div>;
}
