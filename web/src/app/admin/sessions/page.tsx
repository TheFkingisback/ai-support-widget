'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, Database, Cpu, DollarSign, Trash2, Search } from 'lucide-react';
import { getSessions, purgeSessions } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonTable } from '@/components/ui/skeleton';
import type { SessionSummary } from '@/lib/types';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [purging, setPurging] = useState(false);
  const [purgeMsg, setPurgeMsg] = useState<string | null>(null);
  const [purgeDays, setPurgeDays] = useState(30);

  const loadSessions = () => {
    setLoading(true);
    getSessions().then(setSessions).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(loadSessions, []);

  const handlePurge = async () => {
    if (!confirm(`Delete all sessions older than ${purgeDays} days? This cannot be undone.`)) return;
    setPurging(true);
    setPurgeMsg(null);
    try {
      const result = await purgeSessions(purgeDays);
      setPurgeMsg(`Purged ${result.purged} sessions`);
      loadSessions();
    } catch { setPurgeMsg('Purge failed'); } finally { setPurging(false); }
  };

  const filtered = sessions
    .filter((s) => filter === 'all' || s.status === filter)
    .filter((s) => !search || s.id.includes(search) || s.userId.includes(search));

  return (
    <div>
      <PageHeader title="Sessions" description="Monitor support conversations"
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Sessions' }]}
        actions={
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter by status" className="input-field w-auto">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
            <option value="unresolved">Unresolved</option>
            <option value="escalated">Escalated</option>
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
          <input type="number" min={1} max={365} value={purgeDays}
            onChange={(e) => setPurgeDays(Number(e.target.value))}
            className="w-14 bg-transparent py-2.5 text-center text-sm text-surface-900 outline-none" aria-label="Days" />
          <span className="text-xs text-surface-600">days</span>
          <button type="button" onClick={handlePurge} disabled={purging}
            className="btn-danger py-1.5 px-3 text-xs">
            {purging ? '...' : 'Purge'}
          </button>
        </div>
      </div>

      {purgeMsg && <p className="mb-4 text-xs text-surface-600 animate-fade-in">{purgeMsg}</p>}

      {loading ? <SkeletonTable rows={5} /> : filtered.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No sessions"
          description="Sessions will appear here when users start support conversations." />
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
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
              <p className="mt-2 text-sm text-surface-700">User: {s.userId}</p>
              <div className="mt-3 flex gap-5 text-xs text-surface-600">
                <span className="flex items-center gap-1.5">
                  <MessageSquare size={13} /> {s.messageCount} msgs
                </span>
                <span className="flex items-center gap-1.5">
                  <Database size={13} /> {s.hasSnapshot ? 'Context' : 'No context'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Cpu size={13} /> {s.llmCalls} LLM calls
                </span>
                <span className="flex items-center gap-1.5">
                  <DollarSign size={13} /> ${s.totalCost.toFixed(4)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
