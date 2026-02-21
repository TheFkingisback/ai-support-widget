'use client';
import type { CostSummary } from '@/lib/types';

interface CostSummaryCardProps {
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

export function CostSummaryCard({ costs, loading }: CostSummaryCardProps) {
  if (loading) return <p className="text-gray-500" role="status">Loading costs...</p>;
  if (!costs) return null;

  return (
    <div className="card mt-6" data-testid="cost-summary">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        LLM Costs — {costs.month}
      </h3>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total Cost" value={`$${fmt(costs.totalCost)}`} />
        <Stat label="API Calls" value={String(costs.totalCalls)} />
        <Stat label="Tokens In" value={fmtTokens(costs.totalTokensIn)} />
        <Stat label="Tokens Out" value={fmtTokens(costs.totalTokensOut)} />
      </div>

      {costs.byModel.length > 0 && (
        <table className="mt-4 w-full text-sm" data-testid="cost-by-model">
          <thead>
            <tr className="border-b border-gray-700 text-left text-gray-400">
              <th className="pb-1">Model</th>
              <th className="pb-1">Calls</th>
              <th className="pb-1">Tokens</th>
              <th className="pb-1">Cost</th>
            </tr>
          </thead>
          <tbody>
            {costs.byModel.map((m) => (
              <tr key={m.model} className="border-b border-gray-800">
                <td className="py-1 font-mono text-xs">{m.model}</td>
                <td className="py-1">{m.callCount}</td>
                <td className="py-1">{fmtTokens(m.tokensIn + m.tokensOut)}</td>
                <td className="py-1">${fmt(m.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}
