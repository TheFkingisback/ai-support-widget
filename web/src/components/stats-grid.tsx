import type { AnalyticsSummary } from '@/lib/types';

interface Props {
  analytics: AnalyticsSummary;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

export function StatsGrid({ analytics }: Props) {
  const stats = [
    { label: 'Total Cases', value: analytics.totalCases.toString() },
    { label: 'Resolution Rate', value: `${(analytics.resolutionRate * 100).toFixed(1)}%` },
    { label: 'Avg Messages', value: analytics.avgMessagesPerResolution.toFixed(1) },
    { label: 'Avg Time to Resolve', value: formatMs(analytics.avgTimeToResolution) },
    {
      label: 'Avg Rating',
      value: analytics.avgRating > 0
        ? `${analytics.avgRating.toFixed(1)}/10`
        : 'N/A',
    },
    { label: 'Resolved w/o Human', value: analytics.resolvedWithoutHuman.toString() },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="stats-grid">
      {stats.map((s) => (
        <div key={s.label} className="card">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{s.label}</p>
          <p className="mt-2 text-2xl font-bold">{s.value}</p>
        </div>
      ))}
    </div>
  );
}
