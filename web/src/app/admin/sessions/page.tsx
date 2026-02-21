'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, Database, Cpu, DollarSign } from 'lucide-react';
import { getSessions } from '@/lib/api';
import type { SessionSummary } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-900/50 text-green-400',
  resolved: 'bg-blue-900/50 text-blue-400',
  escalated: 'bg-red-900/50 text-red-400',
};

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    setLoading(true);
    getSessions().then(setSessions).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? sessions : sessions.filter((s) => s.status === filter);

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <h1 className="text-2xl font-bold">Sessions</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter by status"
          className="input-field ml-auto w-auto"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="resolved">Resolved</option>
          <option value="escalated">Escalated</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500" role="status">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">No sessions yet. Create a support case to see it here.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <Link
              key={s.id}
              href={`/admin/sessions/${s.id}`}
              className="block rounded-lg border border-gray-800 bg-gray-900 p-4 transition-colors hover:border-gray-600"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-blue-400">{s.id}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[s.status] ?? ''}`}>
                    {s.status}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(s.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="mt-2 text-sm text-gray-400">User: {s.userId}</div>
              <div className="mt-2 flex gap-5 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <MessageSquare size={14} aria-hidden="true" />
                  {s.messageCount} msgs
                </span>
                <span className="flex items-center gap-1">
                  <Database size={14} aria-hidden="true" />
                  {s.hasSnapshot ? 'Context received' : 'No context'}
                </span>
                <span className="flex items-center gap-1">
                  <Cpu size={14} aria-hidden="true" />
                  {s.llmCalls} LLM calls
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign size={14} aria-hidden="true" />
                  ${s.totalCost.toFixed(4)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
