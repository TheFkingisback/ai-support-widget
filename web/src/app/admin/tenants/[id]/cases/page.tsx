'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Inbox, X } from 'lucide-react';
import { getCases } from '@/lib/api';
import type { Case } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonTable } from '@/components/ui/skeleton';

export default function CasesPage() {
  const params = useParams();
  const tenantId = params.id as string;
  const [cases, setCases] = useState<Case[]>([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Case | null>(null);

  useEffect(() => {
    setLoading(true);
    getCases(tenantId).then(setCases).catch(() => {}).finally(() => setLoading(false));
  }, [tenantId]);

  const filtered = filter === 'all' ? cases : cases.filter((c) => c.status === filter);

  return (
    <div>
      <PageHeader title="Cases"
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Tenants', href: '/admin/tenants' },
          { label: tenantId, href: `/admin/tenants/${tenantId}` },
          { label: 'Cases' },
        ]}
        actions={
          <select value={filter} onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter by status" className="input-field w-auto" data-testid="status-filter">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
            <option value="unresolved">Unresolved</option>
            <option value="escalated">Escalated</option>
          </select>
        }
      />

      {loading ? <SkeletonTable rows={5} /> : filtered.length === 0 ? (
        <EmptyState icon={Inbox} title="No cases" description="Support cases will appear here." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-surface-400/50 bg-surface-200/50">
          <table className="w-full text-sm" data-testid="cases-table">
            <thead>
              <tr className="border-b border-surface-400">
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-600">Case ID</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-600">User</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-600">Status</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-600">Messages</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-600">Created</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-600">Resolved</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-surface-400/30 cursor-pointer transition-colors hover:bg-surface-300/20"
                  tabIndex={0} role="button" aria-label={`View case ${c.id}`}
                  onClick={() => setSelected(c)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(c); } }}>
                  <td className="px-4 py-3 font-mono text-xs text-brand-400">{c.id}</td>
                  <td className="px-4 py-3 text-surface-800">{c.userId}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-surface-700">{c.messageCount}</td>
                  <td className="px-4 py-3 text-surface-600">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-surface-600">{c.resolvedAt ? new Date(c.resolvedAt).toLocaleDateString() : '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <CaseModal caseData={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function CaseModal({ caseData, onClose }: { caseData: Case; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog" aria-modal="true" aria-labelledby="case-modal-title"
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div className="w-full max-w-lg rounded-2xl border border-surface-400/50 bg-surface-200 p-6 shadow-xl animate-slide-up">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="case-modal-title" className="font-semibold text-white">Case {caseData.id}</h2>
          <button type="button" onClick={onClose} aria-label="Close"
            className="rounded-xl p-2 text-surface-600 hover:bg-surface-300 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <dl className="space-y-3 text-sm">
          {[
            ['Status', caseData.status],
            ['User', caseData.userId],
            ['Messages', String(caseData.messageCount)],
            ['Feedback', caseData.feedback ?? 'None'],
            ['Rating', caseData.rating != null ? `${caseData.rating}/10` : 'N/A'],
            ['Created', new Date(caseData.createdAt).toLocaleString()],
            ['Resolved', caseData.resolvedAt ? new Date(caseData.resolvedAt).toLocaleString() : 'N/A'],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between">
              <dt className="text-surface-600">{label}</dt>
              <dd className="text-surface-900 font-medium">{val}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 flex justify-end">
          <Link href={`/admin/sessions/${caseData.id}`} className="btn-primary text-xs">
            View Full Session
          </Link>
        </div>
      </div>
    </div>
  );
}
