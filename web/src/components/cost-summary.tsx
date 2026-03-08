'use client';
import { DollarSign } from 'lucide-react';
import type { CostSummary } from '@/lib/types';

interface Props {
  costs: CostSummary | null;
  loading: boolean;
}

function fmt(n: number): string {
  return n >= 1 ? n.toFixed(2) : n.toFixed(4);
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function CostSummaryCard({ costs, loading }: Props) {
  if (loading) return <div className="skeleton h-48 w-full rounded-2xl" />;
  if (!costs) return null;

  return (
    <div className="card" data-testid="cost-summary">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-xl bg-amber-500/10 p-2 text-amber-400">
          <DollarSign size={18} />
        </div>
        <h3 className="text-sm font-semibold text-surface-800">
          LLM Costs -- {costs.month}
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total Cost" value={`$${fmt(costs.totalCost)}`} />
        <Stat label="API Calls" value={String(costs.totalCalls)} />
        <Stat label="Tokens In" value={fmtTokens(costs.totalTokensIn)} />
        <Stat label="Tokens Out" value={fmtTokens(costs.totalTokensOut)} />
      </div>

      {costs.byModel.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-surface-400/30">
          <table className="w-full text-sm" data-testid="cost-by-model"
            aria-label={`Cost breakdown by model for ${costs.month}`}>
            <thead>
              <tr className="border-b border-surface-400/30 text-left text-xs text-surface-600">
                <th scope="col" className="px-3 py-2">Model</th>
                <th scope="col" className="px-3 py-2">Calls</th>
                <th scope="col" className="px-3 py-2">Tokens</th>
                <th scope="col" className="px-3 py-2">Cost</th>
              </tr>
            </thead>
            <tbody>
              {costs.byModel.map((m) => (
                <tr key={m.model} className="border-b border-surface-400/20 last:border-0">
                  <td className="px-3 py-2 font-mono text-xs text-brand-400">{m.model}</td>
                  <td className="px-3 py-2 text-surface-800">{m.callCount}</td>
                  <td className="px-3 py-2 text-surface-700">{fmtTokens(m.tokensIn + m.tokensOut)}</td>
                  <td className="px-3 py-2 text-emerald-400">${fmt(m.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xl font-bold text-surface-900">{value}</p>
      <p className="text-xs text-surface-600">{label}</p>
    </div>
  );
}
