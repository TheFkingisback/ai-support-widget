'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2, MessageSquare, DollarSign, CheckCircle2,
  ArrowRight, Clock, TrendingUp, Users,
} from 'lucide-react';
import { listTenants, getSessions, getAnalytics, getCosts } from '@/lib/api';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { SkeletonCard } from '@/components/ui/skeleton';
import type { Tenant, SessionSummary, AnalyticsSummary, CostSummary } from '@/lib/types';

export default function DashboardPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [costs, setCosts] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listTenants().catch(() => [] as Tenant[]),
      getSessions().catch(() => [] as SessionSummary[]),
    ]).then(([t, s]) => {
      setTenants(t);
      setSessions(s);
      if (t.length > 0) {
        getAnalytics(t[0].id).then(setAnalytics).catch(() => {});
        getCosts(t[0].id).then(setCosts).catch(() => {});
      }
      setLoading(false);
    });
  }, []);

  const activeSessions = sessions.filter((s) => s.status === 'active').length;
  const resolvedSessions = sessions.filter((s) => s.status === 'resolved').length;
  const totalCost = sessions.reduce((sum, s) => sum + s.totalCost, 0);

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your AI support platform" />

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Tenants" value={String(tenants.length)}
              icon={Building2} accent="brand" />
            <StatCard label="Active Sessions" value={String(activeSessions)}
              icon={Users} accent="emerald" />
            <StatCard label="Resolved" value={String(resolvedSessions)}
              icon={CheckCircle2} accent="sky" />
            <StatCard label="Total LLM Cost" value={`$${totalCost.toFixed(2)}`}
              icon={DollarSign} accent="amber" />
          </div>

          {analytics && (
            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              <StatCard label="Resolution Rate"
                value={`${(analytics.resolutionRate * 100).toFixed(1)}%`}
                icon={TrendingUp} accent="emerald" />
              <StatCard label="Avg Messages/Case"
                value={analytics.avgMessagesPerResolution.toFixed(1)}
                icon={MessageSquare} accent="brand" />
              <StatCard label="Avg Response Time"
                value={formatMs(analytics.avgTimeToFirstResponse)}
                icon={Clock} accent="sky" />
            </div>
          )}

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <RecentSessions sessions={sessions.slice(0, 6)} />
            <TenantsList tenants={tenants} />
          </div>
        </>
      )}
    </div>
  );
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

function RecentSessions({ sessions }: { sessions: SessionSummary[] }) {
  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-surface-800">Recent Sessions</h2>
        <Link href="/admin/sessions"
          className="flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300">
          View all <ArrowRight size={12} />
        </Link>
      </div>
      <div className="space-y-2">
        {sessions.map((s) => (
          <Link key={s.id} href={`/admin/sessions/${s.id}`}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:bg-surface-300/50">
            <div className="flex-1 min-w-0">
              <span className="block truncate text-sm font-mono text-surface-800">{s.id}</span>
              <span className="text-2xs text-surface-600">{s.userId}</span>
            </div>
            <StatusBadge status={s.status} />
            <span className="text-xs text-surface-600">
              {new Date(s.createdAt).toLocaleDateString()}
            </span>
          </Link>
        ))}
        {sessions.length === 0 && (
          <p className="py-4 text-center text-sm text-surface-600">No sessions yet</p>
        )}
      </div>
    </div>
  );
}

function TenantsList({ tenants }: { tenants: Tenant[] }) {
  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-surface-800">Tenants</h2>
        <Link href="/admin/tenants"
          className="flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300">
          Manage <ArrowRight size={12} />
        </Link>
      </div>
      <div className="space-y-2">
        {tenants.map((t) => (
          <Link key={t.id} href={`/admin/tenants/${t.id}`}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all hover:bg-surface-300/50">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600/10 text-brand-400 text-sm font-bold">
              {t.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <span className="block truncate text-sm font-medium text-surface-900">{t.name}</span>
              <span className="text-2xs text-surface-600">{t.id}</span>
            </div>
            <StatusBadge status={t.plan} />
          </Link>
        ))}
      </div>
    </div>
  );
}
