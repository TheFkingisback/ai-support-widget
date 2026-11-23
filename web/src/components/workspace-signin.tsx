'use client';

import { L, useLocale, useT } from '@/lib/localization';
import { useEffect, useState, type FormEvent } from 'react';
import { workspaceApi } from '@/lib/workspace-api';

const field = 'mt-2 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-white';
const button = 'rounded-lg bg-teal-300 px-4 py-2.5 font-semibold text-slate-950 disabled:opacity-50';

export function WorkspaceSignin() {
  const locale = useLocale();
  const t = useT();
  const [token, setToken] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const confirmation = new URLSearchParams(window.location.hash.slice(1)).get('confirm');
    if (confirmation) {
      setToken(confirmation);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    workspaceApi.availability().then(data => setAvailable(data.available), () => setAvailable(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (token) {
        await workspaceApi.confirm(token);
        window.location.assign('/workspace' + window.location.search);
        return;
      }
      await workspaceApi.begin(String(data.get('email')), String(data.get('name') ?? '').trim() || undefined, locale);
      setMessage('Check your email for a one-time sign-in link.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not sign in');
    } finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="space-y-5 rounded-xl border border-slate-700 bg-[#131d27] p-5">
    {token ? <p><L>{"Confirm that you want to open your workspace on this device."}</L></p> : <>
      <label className="block text-sm font-medium"><L>{"Email"}</L><input name="email" type="email" required maxLength={254} autoComplete="email" className={field} /></label>
      <label className="block text-sm font-medium"><L>{"Workspace name"}</L>{" "}<span className="font-normal text-slate-400"><L>{"(optional)"}</L></span><input name="name" maxLength={100} autoComplete="organization" className={field} /></label>
    </>}
    <button type="submit" className={button} disabled={busy || (!token && available !== true)}>{t(busy ? 'Please wait…' : token ? 'Confirm and open workspace' : 'Email me a sign-in link')}</button>
    {available === false && !token && <p role="status" className="text-sm text-amber-200"><L>{"Email signup is currently unavailable. You can still try the public demo."}</L></p>}
    {message && <p role="status" className="text-teal-200">{t(message)}</p>}
    {error && <p role="alert" className="text-rose-200">{t(error)}</p>}
  </form>;
}
