import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  label: string;
  value: string;
  icon?: LucideIcon;
  trend?: { value: string; positive: boolean };
  accent?: 'brand' | 'emerald' | 'amber' | 'rose' | 'sky';
}

const ACCENT_ICON: Record<string, string> = {
  brand: 'bg-brand-500/10 text-brand-400',
  emerald: 'bg-emerald-500/10 text-emerald-400',
  amber: 'bg-amber-500/10 text-amber-400',
  rose: 'bg-rose-500/10 text-rose-400',
  sky: 'bg-sky-500/10 text-sky-400',
};

export function StatCard({ label, value, icon: Icon, trend, accent = 'brand' }: Props) {
  return (
    <div className="card group animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-surface-600">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-surface-900">{value}</p>
        </div>
        {Icon && (
          <div className={`rounded-xl p-2.5 ${ACCENT_ICON[accent]}`}>
            <Icon size={20} aria-hidden="true" />
          </div>
        )}
      </div>
      {trend && (
        <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${
          trend.positive ? 'text-emerald-400' : 'text-rose-400'
        }`}>
          {trend.positive
            ? <TrendingUp size={14} aria-hidden="true" />
            : <TrendingDown size={14} aria-hidden="true" />}
          {trend.value}
        </div>
      )}
    </div>
  );
}
