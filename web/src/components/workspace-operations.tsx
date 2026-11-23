'use client';

import { L, useLocale, useT } from '@/lib/localization';
import { localeInfo, locales, matchLocale } from '@ai-support/shared/locales';
import { useEffect, useState, type FormEvent } from 'react';
import { workspaceApi, type ConversationEnvironment, type TeamMember, type WorkspaceConversation, type WorkspaceTranscript } from '@/lib/workspace-api';

const panel = 'space-y-4 rounded-xl border border-slate-700 bg-[#131d27] p-5';
const control = 'rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm disabled:opacity-50';

export function WorkspaceTeam() {
  const locale = useLocale();
  const t = useT();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { workspaceApi.members().then(data => setMembers(data.members), failure => setError(failure.message)); }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true); setStatus(''); setError('');
    try { await action(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to update the team'); }
    finally { setBusy(false); }
  }
  function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const role = data.get('role') === 'developer' ? 'developer' : 'support';
    const recipientLocale = matchLocale(data.get('locale')) ?? locale;
    void run(async () => { await workspaceApi.invite(email, role, recipientLocale); setEmail(''); setStatus('Invitation sent. The member appears after accepting by email.'); });
  }
  return <section className={panel} aria-label="Workspace team">
    <h2 className="text-xl font-semibold"><L>{"Workspace team"}</L></h2>
    <form className="flex flex-wrap items-end gap-3" onSubmit={invite}>
      <label className="grid gap-2 text-sm"><L>{"Email"}</L><input className={control} type="email" maxLength={254} required value={email} onChange={event => setEmail(event.target.value)} /></label>
      <label className="grid gap-2 text-sm"><L>{"Role"}</L><select name="role" className={control}><option value="developer"><L>{"Developer"}</L></option><option value="support"><L>{"Support"}</L></option></select></label>
      <label className="grid gap-2 text-sm"><L>{"Invitation language"}</L><select name="locale" className={control} defaultValue=""><option value="">{t('Current language')}</option>{Object.entries(locales).map(([tag, entry]) => <option key={tag} value={tag} lang={tag}>{entry.name}</option>)}</select></label>
      <button type="submit" className={control} disabled={busy}><L>{"Invite"}</L></button>
    </form>
    <ul className="space-y-2 text-sm">{members.map(member => <li className="flex flex-wrap items-center gap-3 border-t border-slate-700 pt-2" key={member.email}>
      <span className="break-all">{member.email}</span><span className="mr-auto capitalize text-slate-300">{member.role}</span>
      {member.role !== 'owner' && (removing === member.email
        ? <><button type="button" className={control} disabled={busy} onClick={() => void run(async () => {
          await workspaceApi.removeMember(member.email); setMembers(items => items.filter(item => item.email !== member.email)); setRemoving(''); setStatus('Member removed.');
        })}><L>{"Confirm removal"}</L></button><button type="button" onClick={() => setRemoving('')}><L>{"Cancel"}</L></button></>
        : <button type="button" className={control} onClick={() => setRemoving(member.email)}><L>{"Remove member"}</L></button>)}
    </li>)}</ul>
    {status && <p role="status" className="text-teal-200">{t(status)}</p>}
    {error && <p role="alert" className="text-rose-200">{t(error)}</p>}
  </section>;
}

export function WorkspaceConversations() {
  const locale = useLocale();
  const t = useT();
  const [env, setEnv] = useState<ConversationEnvironment>('production');
  const [items, setItems] = useState<WorkspaceConversation[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<WorkspaceTranscript>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setItems([]); setTranscript(undefined);
    workspaceApi.conversations(env).then(result => {
      if (!active) return;
      setItems(result.conversations); setNext(result.next);
    }, failure => { if (active) setError(failure.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [env]);

  return <section className={panel} aria-label="Workspace conversations">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold"><L>{"Conversations"}</L></h2>
      <label className="flex items-center gap-2 text-sm"><L>{"Environment"}</L><select className={control} value={env} onChange={event => setEnv(event.target.value as ConversationEnvironment)}>
        <option value="production"><L>{"Production"}</L></option><option value="staging"><L>{"Staging"}</L></option><option value="sandbox"><L>{"Sandbox"}</L></option>
      </select></label></div>
    {loading ? <p role="status"><L>{"Loading conversations…"}</L></p> : items.length === 0 && !error && <p className="text-slate-300"><L>{"No conversations in this environment yet."}</L></p>}
    {!!items.length && <ul className="space-y-2 text-sm">{items.map(item => <li key={item.id}><button type="button" className={control} onClick={() => void workspaceApi.transcript(env, item.id).then(setTranscript, failure => setError(failure.message))}>
      {t(item.status)} · {new Date(item.created_at).toLocaleString(localeInfo(locale).formatting)} · {item.id}
    </button></li>)}</ul>}
    {next && !loading && <button className={control} type="button" onClick={() => void workspaceApi.conversations(env, next).then(result => {
      setItems(previous => [...previous, ...result.conversations]); setNext(result.next);
    }, failure => setError(failure.message))}><L>{"Load more"}</L></button>}
    {transcript && <article className="space-y-3 rounded border border-slate-700 p-4"><h3 className="break-all font-semibold">{transcript.id}</h3>
      {transcript.messages.map(message => <div key={message.id}><p className="text-sm font-semibold capitalize text-teal-200">{t(message.role)}</p><p dir="auto" className="whitespace-pre-wrap break-words text-slate-200">{message.content}</p></div>)}
    </article>}
    {error && <p role="alert" className="text-rose-200">{t(error)}</p>}
  </section>;
}
