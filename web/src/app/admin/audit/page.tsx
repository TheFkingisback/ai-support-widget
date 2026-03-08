'use client';
import { useState, useEffect } from 'react';
import { ScrollText, ChevronLeft, ChevronRight } from 'lucide-react';
import { listTenants, getAuditLog } from '@/lib/api';
import type { Tenant, AuditEntry } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonTable } from '@/components/ui/skeleton';

export default function AuditPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listTenants().then((t) => {
      setTenants(t);
      if (t.length > 0) setSelectedId(t[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    getAuditLog(selectedId, page, 20)
      .then((res) => {
        setEntries(res.entries);
        setHasMore(res.hasMore);
        setTotal(res.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedId, page]);

  return (
    <div>
      <PageHeader title="Audit Log" description="Track all platform activity"
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Audit Log' }]}
        actions={
          <select value={selectedId}
            onChange={(e) => { setSelectedId(e.target.value); setPage(1); }}
            aria-label="Select tenant" className="input-field w-auto">
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        }
      />

      {loading ? <SkeletonTable rows={8} /> : entries.length === 0 ? (
        <EmptyState icon={ScrollText} title="No audit entries"
          description="Activity will be logged here as users interact with the platform." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-surface-400/50 bg-surface-200/50">
            <table className="w-full text-sm" data-testid="audit-table">
              <thead>
                <tr className="border-b border-surface-400">
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-600">Timestamp</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-600">User</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-600">Action</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-600">Case</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-600">Details</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-surface-400/30 transition-colors hover:bg-surface-300/20">
                    <td className="px-4 py-3 text-surface-700 whitespace-nowrap">
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-surface-800 font-medium">{e.userId}</td>
                    <td className="px-4 py-3">
                      <span className="badge-blue">{e.action}</span>
                    </td>
                    <td className="px-4 py-3 text-surface-600 font-mono text-xs">
                      {e.caseId ?? '--'}
                    </td>
                    <td className="px-4 py-3 text-surface-600 text-xs max-w-xs truncate"
                      title={JSON.stringify(e.details)}>
                      {JSON.stringify(e.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav className="mt-4 flex items-center justify-between" aria-label="Pagination">
            <span className="text-sm text-surface-600">{total} entries total</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1} aria-label="Previous page"
                className="btn-secondary flex items-center gap-1 px-3 py-1.5 text-xs">
                <ChevronLeft size={14} /> Prev
              </button>
              <span className="px-3 py-1.5 text-sm text-surface-700" aria-current="page">
                Page {page}
              </span>
              <button type="button" onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore} aria-label="Next page"
                className="btn-secondary flex items-center gap-1 px-3 py-1.5 text-xs">
                Next <ChevronRight size={14} />
              </button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
