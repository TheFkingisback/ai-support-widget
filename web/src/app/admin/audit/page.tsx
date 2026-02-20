'use client';
import { useState, useEffect } from 'react';
import { listTenants, getAuditLog } from '@/lib/api';
import type { Tenant, AuditEntry } from '@/lib/types';

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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <select value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setPage(1); }}
          aria-label="Select tenant" className="input-field w-auto">
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {loading ? <p className="text-gray-500" role="status">Loading...</p> : (
        <>
          <table className="w-full text-sm" data-testid="audit-table">
            <thead>
              <tr className="table-header">
                <th scope="col" className="pb-3 pr-4">Timestamp</th>
                <th scope="col" className="pb-3 pr-4">User</th>
                <th scope="col" className="pb-3 pr-4">Action</th>
                <th scope="col" className="pb-3 pr-4">Case</th>
                <th scope="col" className="pb-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="table-row">
                  <td className="py-3 pr-4 text-gray-400">{new Date(e.createdAt).toLocaleString()}</td>
                  <td className="py-3 pr-4 text-gray-300">{e.userId}</td>
                  <td className="py-3 pr-4">
                    <span className="rounded bg-gray-800 px-2 py-0.5 text-xs">{e.action}</span>
                  </td>
                  <td className="py-3 pr-4 text-gray-400">{e.caseId ?? '—'}</td>
                  <td className="py-3 text-gray-500 text-xs truncate max-w-xs"
                    title={JSON.stringify(e.details)}>
                    {JSON.stringify(e.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <nav className="mt-4 flex items-center justify-between text-sm text-gray-400" aria-label="Pagination">
            <span>Total: {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                aria-label="Previous page" className="btn-secondary px-3 py-1">Prev</button>
              <span className="px-2 py-1" aria-current="page">Page {page}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={!hasMore}
                aria-label="Next page" className="btn-secondary px-3 py-1">Next</button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
