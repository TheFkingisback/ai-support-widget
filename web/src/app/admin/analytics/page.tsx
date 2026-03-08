'use client';
import { useState, useEffect } from 'react';
import {
  BarChart3, CheckCircle2, MessageSquare, Clock, Star, Users,
} from 'lucide-react';
import { listTenants, getAnalytics, getCosts } from '@/lib/api';
import type { Tenant, AnalyticsSummary, CostSummary } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { IntentsChart, ErrorsChart } from '@/components/charts';
import { CostSummaryCard } from '@/components/cost-summary';
import { SkeletonCard } from '@/components/ui/skeleton';

export default function AnalyticsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [costs, setCosts] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listTenants().then((t) => {
      setTenants(t);
      if (t.length > 0) setSelectedId(t[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    Promise.all([
      getAnalytics(selectedId).catch(() => null),
      getCosts(selectedId).catch(() => null),
    ]).then(([a, c]) => {
      setAnalytics(a);
      setCosts(c);
    }).finally(() => setLoading(false));
  }, [selectedId]);

  function formatMs(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60_000).toFixed(1)}m`;
  }

  return (
    <div>
      <PageHeader title="Analytics" description="Performance metrics and insights"
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Analytics' }]}
        actions={
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
            aria-label="Select tenant" className="input-field w-auto" data-testid="tenant-selector">
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        }
      />

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : analytics ? (
        <div data-testid="analytics-content" className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Total Cases" value={String(analytics.totalCases)}
              icon={BarChart3} accent="brand" />
            <StatCard label="Resolution Rate"
              value={`${(analytics.resolutionRate * 100).toFixed(1)}%`}
              icon={CheckCircle2} accent="emerald" />
            <StatCard label="Avg Messages"
              value={analytics.avgMessagesPerResolution.toFixed(1)}
              icon={MessageSquare} accent="sky" />
            <StatCard label="Avg Time to Resolve"
              value={formatMs(analytics.avgTimeToResolution)}
              icon={Clock} accent="amber" />
            <StatCard label="Avg Rating"
              value={analytics.avgRating > 0 ? `${analytics.avgRating.toFixed(1)}/10` : 'N/A'}
              icon={Star} accent="amber" />
            <StatCard label="Resolved w/o Human"
              value={String(analytics.resolvedWithoutHuman)}
              icon={Users} accent="emerald" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <h3 className="mb-4 text-sm font-semibold text-surface-800">Top Intents</h3>
              <IntentsChart data={analytics.topIntents} />
            </div>
            <div className="card">
              <h3 className="mb-4 text-sm font-semibold text-surface-800">Top Errors</h3>
              <ErrorsChart data={analytics.topErrors} />
            </div>
          </div>

          <CostSummaryCard costs={costs} loading={false} />
        </div>
      ) : (
        <p className="text-sm text-surface-600">Select a tenant to view analytics.</p>
      )}
    </div>
  );
}
