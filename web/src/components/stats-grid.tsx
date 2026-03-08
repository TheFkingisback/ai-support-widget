import {
  BarChart3, CheckCircle2, MessageSquare, Clock, Star, Users,
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
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
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" data-testid="stats-grid">
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
  );
}
