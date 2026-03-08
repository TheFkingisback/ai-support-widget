'use client';
import type { LucideIcon } from 'lucide-react';
import { DollarSign, Cpu, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { LLMCostEntry } from '@/lib/types';

interface Props { costs: LLMCostEntry[] }

export function CostsPanel({ costs }: Props) {
  if (costs.length === 0) {
    return <p className="py-8 text-center text-sm text-surface-600">No LLM calls recorded.</p>;
  }

  const totalCost = costs.reduce((s, c) => s + c.estimatedCost, 0);
  const totalIn = costs.reduce((s, c) => s + c.tokensIn, 0);
  const totalOut = costs.reduce((s, c) => s + c.tokensOut, 0);

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard icon={Cpu} label="Total Calls" value={String(costs.length)} />
        <SummaryCard icon={ArrowDownRight} label="Tokens In" value={totalIn.toLocaleString()} />
        <SummaryCard icon={ArrowUpRight} label="Tokens Out" value={totalOut.toLocaleString()} />
        <SummaryCard icon={DollarSign} label="Total Cost" value={`$${totalCost.toFixed(4)}`} accent />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-surface-400/50 bg-surface-200/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-400">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-600">Time</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-600">Model</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-600">Tokens In</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-600">Tokens Out</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-600">Cost</th>
            </tr>
          </thead>
          <tbody>
            {costs.map((c) => (
              <tr key={c.id} className="border-b border-surface-400/30 transition-colors hover:bg-surface-300/20">
                <td className="px-4 py-3 text-surface-600 whitespace-nowrap">
                  {new Date(c.createdAt).toLocaleTimeString()}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-brand-400">{c.model}</td>
                <td className="px-4 py-3 text-right text-surface-800">{c.tokensIn.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-surface-800">{c.tokensOut.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-emerald-400 font-medium">${c.estimatedCost.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, accent }: {
  icon: LucideIcon; label: string; value: string; accent?: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className="text-surface-600" aria-hidden="true" />
        <span className="text-xs text-surface-600">{label}</span>
      </div>
      <p className={`text-lg font-bold ${accent ? 'text-emerald-400' : 'text-surface-900'}`}>{value}</p>
    </div>
  );
}
