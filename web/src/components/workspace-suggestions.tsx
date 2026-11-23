'use client';

import { useEffect, useState } from 'react';
import { localeInfo } from '@ai-support/shared/locales';
import { L, useLocale, useT } from '@/lib/localization';
import { suggestionStatuses, workspaceApi, type ConversationEnvironment, type SuggestionStatus, type WorkspaceSuggestion } from '@/lib/workspace-api';

const labels = {new:'New', reviewing:'In review', planned:'Planned', shipped:'Shipped', declined:'Declined'};
type Page = { suggestions: WorkspaceSuggestion[]; next: string | null };

export function WorkspaceSuggestions({ canUpdate }: {canUpdate: boolean}) {
  const t = useT();
  const locale = useLocale();
  const [env, setEnv] = useState<ConversationEnvironment>('production');
  const [page, setPage] = useState<Page>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setPage(undefined); setError('');
    workspaceApi.suggestions(env).then(data => { if (active) setPage(data); })
      .catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [env]);

  async function update(id: string, status: SuggestionStatus) {
    setBusy(true); setError('');
    try {
      await workspaceApi.updateSuggestion(env, id, status);
      setPage(previous => previous && { ...previous, suggestions: previous.suggestions.map(item => item.id === id ? { ...item, status } : item) });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not update the idea'); }
    finally { setBusy(false); }
  }

  async function loadMore() {
    if (!page?.next) return;
    setBusy(true); setError('');
    try {
      const more = await workspaceApi.suggestions(env, page.next);
      setPage({ ...more, suggestions: [...page.suggestions, ...more.suggestions] });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not load ideas'); }
    finally { setBusy(false); }
  }

  return <section className="space-y-4 rounded-xl border border-slate-700 bg-[#131d27] p-5">
    <h2 className="text-2xl font-semibold"><L>{"Product ideas"}</L></h2>
    <label className="flex items-center gap-3"><L>{"Environment"}</L>
      <select className="rounded border border-slate-600 bg-slate-900 px-2 py-1" value={env} disabled={busy}
        onChange={event => setEnv(event.target.value as ConversationEnvironment)}>
        <option value="production">{t('Production')}</option><option value="staging">{t('Staging')}</option><option value="sandbox">{t('Sandbox')}</option>
      </select>
    </label>
    {error && <p role="alert">{t(error)}</p>}
    {page && (page.suggestions.length === 0 ? <p><L>{"No ideas yet."}</L></p> :
      <ul className="space-y-3">{page.suggestions.map(idea => <li key={idea.id} className="space-y-2 border-b border-slate-700 pb-3">
        <p dir="auto" className="whitespace-pre-wrap break-words">{idea.content}</p>
        <p className="text-sm text-slate-400">{new Date(idea.created_at).toLocaleString(localeInfo(locale).formatting)}</p>
        {canUpdate ? <select aria-label={t('Idea status')} disabled={busy} value={idea.status} className="rounded bg-slate-900 px-2 py-1"
          onChange={event => void update(idea.id,event.target.value as SuggestionStatus)}>
          {suggestionStatuses.map(status => <option key={status} value={status}>{t(labels[status])}</option>)}
        </select> : <p>{t(labels[idea.status])}</p>}
      </li>)}</ul>)}
    {page?.next && <button type="button" disabled={busy} onClick={() => void loadMore()} className="text-teal-300 underline"><L>{"Load more"}</L></button>}
  </section>;
}
