'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search, Building2 } from 'lucide-react';
import { listTenants, createTenant } from '@/lib/api';
import { CreateTenantModal } from '@/components/create-tenant-modal';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonTable } from '@/components/ui/skeleton';
import type { Tenant, CreateTenantInput } from '@/lib/types';

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setTenants(await listTenants());
    } catch { /* handled */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(input: CreateTenantInput): Promise<{ adminApiKey: string }> {
    const result = await createTenant(input);
    await load();
    return { adminApiKey: result.adminApiKey };
  }

  const filtered = tenants.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader title="Tenants" description="Manage your platform tenants"
        breadcrumbs={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Tenants' }]}
        actions={
          <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} aria-hidden="true" /> New Tenant
          </button>
        }
      />

      {!loading && tenants.length > 0 && (
        <div className="relative mb-6">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenants..." className="input-field pl-10" />
        </div>
      )}

      {loading ? <SkeletonTable rows={4} /> : filtered.length === 0 && tenants.length === 0 ? (
        <EmptyState icon={Building2} title="No tenants yet"
          description="Create your first tenant to start using the platform."
          action={{ label: 'Create Tenant', onClick: () => setModalOpen(true) }} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <Link key={t.id} href={`/admin/tenants/${t.id}`} className="card-interactive group">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600/10 text-brand-400 text-lg font-bold transition-colors group-hover:bg-brand-600/20">
                  {t.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="truncate text-sm font-semibold text-white">{t.name}</h3>
                  <p className="text-2xs text-surface-600 font-mono">{t.id}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <StatusBadge status={t.plan} />
                <span className="text-xs text-surface-600">
                  {new Date(t.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.config.enabledConnectors.map((c) => (
                  <span key={c} className="rounded-md bg-surface-300 px-2 py-0.5 text-2xs text-surface-700">{c}</span>
                ))}
                <span className="rounded-md bg-surface-300 px-2 py-0.5 text-2xs text-surface-700">
                  {t.config.modelPolicy}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreateTenantModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleCreate} />
    </div>
  );
}
