'use client';
import { useState, useEffect } from 'react';
import { listTenants, getAnalytics } from '@/lib/api';
import type { Tenant, AnalyticsSummary } from '@/lib/types';
import { StatsGrid } from '@/components/stats-grid';
import { IntentsChart, ErrorsChart } from '@/components/charts';

export default function AnalyticsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
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
    getAnalytics(selectedId)
      .then(setAnalytics)
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false));
  }, [selectedId]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
          className="rounded bg-gray-800 px-3 py-2 text-sm" data-testid="tenant-selector">
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {loading && <p className="text-gray-500">Loading analytics...</p>}

      {analytics && (
        <div data-testid="analytics-content">
          <StatsGrid analytics={analytics} />
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <ChartCard title="Top Intents">
              <IntentsChart data={analytics.topIntents} />
            </ChartCard>
            <ChartCard title="Top Errors">
              <ErrorsChart data={analytics.topErrors} />
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-400 uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}
