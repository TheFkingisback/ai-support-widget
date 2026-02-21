'use client';
import type { LLMCostEntry } from '@/lib/types';

interface Props { costs: LLMCostEntry[] }

export function CostsPanel({ costs }: Props) {
  if (costs.length === 0) {
    return <p className="text-gray-500">No LLM calls recorded for this session.</p>;
  }

  const totalCost = costs.reduce((s, c) => s + c.estimatedCost, 0);
  const totalIn = costs.reduce((s, c) => s + c.tokensIn, 0);
  const totalOut = costs.reduce((s, c) => s + c.tokensOut, 0);

  return (
    <div>
      <div className="mb-4 flex gap-6 rounded-lg border border-gray-800 bg-gray-900 p-4 text-sm">
        <div>
          <span className="text-gray-500">Total calls</span>
          <p className="text-lg font-semibold text-gray-200">{costs.length}</p>
        </div>
        <div>
          <span className="text-gray-500">Tokens in</span>
          <p className="text-lg font-semibold text-gray-200">{totalIn.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-gray-500">Tokens out</span>
          <p className="text-lg font-semibold text-gray-200">{totalOut.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-gray-500">Total cost</span>
          <p className="text-lg font-semibold text-green-400">${totalCost.toFixed(4)}</p>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="pb-2 pr-4">Time</th>
            <th className="pb-2 pr-4">Model</th>
            <th className="pb-2 pr-4 text-right">Tokens In</th>
            <th className="pb-2 pr-4 text-right">Tokens Out</th>
            <th className="pb-2 text-right">Cost</th>
          </tr>
        </thead>
        <tbody>
          {costs.map((c) => (
            <tr key={c.id} className="border-t border-gray-800">
              <td className="py-2 pr-4 text-gray-400">
                {new Date(c.createdAt).toLocaleTimeString()}
              </td>
              <td className="py-2 pr-4 font-mono text-xs text-blue-400">{c.model}</td>
              <td className="py-2 pr-4 text-right text-gray-300">
                {c.tokensIn.toLocaleString()}
              </td>
              <td className="py-2 pr-4 text-right text-gray-300">
                {c.tokensOut.toLocaleString()}
              </td>
              <td className="py-2 text-right text-green-400">${c.estimatedCost.toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
