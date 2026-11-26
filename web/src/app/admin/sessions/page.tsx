'use client';
import { L, useT, useLocale } from '@/lib/localization';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { MessageSquare, Database, Cpu, DollarSign, Trash2, Search } from 'lucide-react';
import { sessionPage, previewPurge, purgeSessions } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonTable } from '@/components/ui/skeleton';
import type { SessionSummary } from '@/lib/types';

export default function SessionsPage() {
  const t = useT();
  const locale = useLocale();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [purging, setPurging] = useState(false);
  const [purgeMsg, setPurgeMsg] = useState<string | null>(null);
  const [daysInput, setDaysInput] = useState('30');
  const [next, setNext] = useState<string | null>(null);
  const [revision, refresh] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const generation = useRef(0);
  const days = Number(daysInput);
  const validPeriod = Number.isInteger(days) && days >= 1 && days <= 365;
  const status = filter === 'all' ? undefined : filter;

  useEffect(() => {
    const id = ++generation.current;
    setNext(null); setSessions([]); setLoading(true); setLoadError(false);
    const timer = setTimeout(() => {
      sessionPage({ status, search }).then(page => {
        if (generation.current === id) { setSessions(page.sessions); setNext(page.next); }
      }).catch(() => { if (generation.current === id) setLoadError(true); })
        .finally(() => { if (generation.current === id) setLoading(false); });
    }, 150);
    return () => { clearTimeout(timer); generation.current++; };
  }, [status, search, revision]);

  async function loadMore() {
    if (!next || loading) return;
    const id = generation.current;
    setLoading(true); setLoadError(false);
    try {
      const page = await sessionPage({ before: next, status, search });
      if (id === generation.current) { setSessions(items => [...items, ...page.sessions]); setNext(page.next); }
    } catch { if (id === generation.current) setLoadError(true); }
    finally { if (id === generation.current) setLoading(false); }
  }

  async function handlePurge() {
    if (!validPeriod || purging) return;
    setPurging(true); setPurgeMsg(null);
    try {
      const preview = await previewPurge(days);
      if (!preview.count) { setPurgeMsg(t('Sessions deleted: {count}', { count: 0 })); return; }
      if (!confirm(t('Delete {count} sessions last updated before {date}?', { count: preview.count, date: new Date(preview.cutoff).toLocaleString(locale) }))) return;
      const result = await purgeSessions(days, preview.cutoff);
      setPurgeMsg(t('Sessions deleted: {count}', { count: result.purged })); refresh(v => v + 1);
    } catch { setPurgeMsg(t('Purge failed')); } finally { setPurging(false); }
  }

  return (
    <div>
      <PageHeader title="Sessions" description="Monitor support conversations"
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Sessions' }]}
        actions={
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter by status" className="input-field w-auto">
            <option value="all"><L>{"All Status"}</L></option>
            <option value="active"><L>{"Active"}</L></option>
            <option value="resolved"><L>{"Resolved"}</L></option>
            <option value="unresolved"><L>{"Unresolved"}</L></option>
            <option value="escalated"><L>{"Escalated"}</L></option>
          </select>
        }
      />

      <div className="mb-6 flex gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID or user..." className="input-field pl-10" />
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-surface-400 bg-surface-200 px-3">
          <Trash2 size={14} className="text-red-400" aria-hidden="true" />
          <input type="number" min={1} max={365} value={daysInput}
            onChange={(e) => setDaysInput(e.target.value)}
            className="w-14 bg-transparent py-2.5 text-center text-sm text-surface-900 outline-none" aria-label="Days" />
          <span className="text-xs text-surface-600"><L>{"days"}</L></span>
          <button type="button" onClick={handlePurge} disabled={purging || !validPeriod}
            className="btn-danger py-1.5 px-3 text-xs">
            {purging ? '…' : t('Purge')}
          </button>
        </div>
      </div>

      {purgeMsg && <p className="mb-4 text-xs text-surface-600 animate-fade-in">{purgeMsg}</p>}

      {loadError && <p role="alert"><L>{"Failed to load data"}</L></p>}
      {loadError && !sessions.length ? null : loading && !sessions.length ? <SkeletonTable rows={5} /> : sessions.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No sessions"
          description="Sessions will appear here when users start support conversations." />
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <Link key={s.id} href={`/admin/sessions/${s.id}`} className="card-interactive block p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-brand-400">{s.id}</span>
                  <StatusBadge status={s.status} />
                </div>
                <span className="text-xs text-surface-600">
                  {new Date(s.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-sm text-surface-700"><L>{"User:"}</L>{" "}{s.userId}</p>
              <div className="mt-3 flex gap-5 text-xs text-surface-600">
                <span className="flex items-center gap-1.5">
                  <MessageSquare size={13} /> {s.messageCount}<L>{"msgs"}</L></span>
                <span className="flex items-center gap-1.5">
                  <Database size={13} /> {s.hasSnapshot ? 'Context' : 'No context'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Cpu size={13} /> {s.llmCalls}<L>{"LLM calls"}</L></span>
                <span className="flex items-center gap-1.5">
                  <DollarSign size={13} /> ${s.totalCost.toFixed(4)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
      {next && <button className="btn-secondary mt-4" disabled={loading} onClick={loadMore}><L>{"Load more"}</L></button>}
    </div>
  );
}
