'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getCases } from '@/lib/api';
import type { Case } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-900/50 text-green-400',
  resolved: 'bg-blue-900/50 text-blue-400',
  unresolved: 'bg-yellow-900/50 text-yellow-400',
  escalated: 'bg-red-900/50 text-red-400',
};

export default function CasesPage() {
  const params = useParams();
  const tenantId = params.id as string;
  const [cases, setCases] = useState<Case[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);

  useEffect(() => {
    setLoading(true);
    getCases(tenantId).then(setCases).catch(() => {}).finally(() => setLoading(false));
  }, [tenantId]);

  const filtered = filter === 'all' ? cases : cases.filter((c) => c.status === filter);

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href={`/admin/tenants/${tenantId}`} aria-label="Back to tenant details" className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white">
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <h1 className="text-2xl font-bold">Cases</h1>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter by status"
          className="input-field ml-auto w-auto" data-testid="status-filter">
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="resolved">Resolved</option>
          <option value="unresolved">Unresolved</option>
          <option value="escalated">Escalated</option>
        </select>
      </div>

      {loading ? <p className="text-gray-500" role="status">Loading...</p> : (
        <table className="w-full text-sm" data-testid="cases-table">
          <thead>
            <tr className="table-header">
              <th scope="col" className="pb-3 pr-4">Case ID</th>
              <th scope="col" className="pb-3 pr-4">User</th>
              <th scope="col" className="pb-3 pr-4">Status</th>
              <th scope="col" className="pb-3 pr-4">Messages</th>
              <th scope="col" className="pb-3 pr-4">Created</th>
              <th scope="col" className="pb-3">Resolved</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="table-row cursor-pointer"
                tabIndex={0} role="button" aria-label={`View case ${c.id}`}
                onClick={() => setSelectedCase(c)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedCase(c); } }}>
                <td className="py-3 pr-4 text-blue-400">{c.id}</td>
                <td className="py-3 pr-4 text-gray-400">{c.userId}</td>
                <td className="py-3 pr-4">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[c.status] ?? ''}`}>
                    {c.status}
                  </span>
                </td>
                <td className="py-3 pr-4 text-gray-400">{c.messageCount}</td>
                <td className="py-3 pr-4 text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                <td className="py-3 text-gray-400">
                  {c.resolvedAt ? new Date(c.resolvedAt).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedCase && (
        <CaseDetail caseData={selectedCase} onClose={() => setSelectedCase(null)} />
      )}
    </div>
  );
}

function CaseDetail({ caseData, onClose }: { caseData: Case; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      data-testid="case-detail" role="dialog" aria-modal="true" aria-labelledby="case-detail-title"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div className="w-full max-w-lg rounded-lg bg-gray-900 p-6 shadow-xl max-h-[80vh] overflow-auto">
        <div className="mb-4 flex justify-between items-center">
          <h2 id="case-detail-title" className="font-semibold">Case {caseData.id}</h2>
          <button onClick={onClose} aria-label="Close case details" className="btn-secondary px-3 py-1 text-sm">Close</button>
        </div>
        <dl className="space-y-2 text-sm">
          <Dt label="Status">{caseData.status}</Dt>
          <Dt label="User">{caseData.userId}</Dt>
          <Dt label="Messages">{caseData.messageCount}</Dt>
          <Dt label="Feedback">{caseData.feedback ?? 'None'}</Dt>
          <Dt label="Rating">{caseData.rating != null ? `${caseData.rating}/10` : 'N/A'}</Dt>
          <Dt label="Created">{new Date(caseData.createdAt).toLocaleString()}</Dt>
          <Dt label="Resolved">{caseData.resolvedAt ? new Date(caseData.resolvedAt).toLocaleString() : 'N/A'}</Dt>
        </dl>
      </div>
    </div>
  );
}

function Dt({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-200">{children}</dd>
    </div>
  );
}
