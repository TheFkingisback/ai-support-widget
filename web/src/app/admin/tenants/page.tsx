'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { listTenants, createTenant } from '@/lib/api';
import { CreateTenantModal } from '@/components/create-tenant-modal';
import type { Tenant, CreateTenantInput } from '@/lib/types';

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listTenants();
      setTenants(data);
    } catch {
      /* error handled silently */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(input: CreateTenantInput): Promise<{ adminApiKey: string }> {
    const result = await createTenant(input);
    await load();
    return { adminApiKey: result.adminApiKey };
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tenants</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} aria-hidden="true" /> Create Tenant
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500" role="status">Loading...</p>
      ) : (
        <table className="w-full text-sm" data-testid="tenants-table">
          <thead>
            <tr className="table-header">
              <th scope="col" className="pb-3 pr-4">Name</th>
              <th scope="col" className="pb-3 pr-4">Plan</th>
              <th scope="col" className="pb-3 pr-4">Connectors</th>
              <th scope="col" className="pb-3 pr-4">Model Policy</th>
              <th scope="col" className="pb-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="table-row">
                <td className="py-3 pr-4">
                  <Link href={`/admin/tenants/${t.id}`} className="text-blue-400 hover:underline">
                    {t.name}
                  </Link>
                </td>
                <td className="py-3 pr-4">
                  <PlanBadge plan={t.plan} />
                </td>
                <td className="py-3 pr-4 text-gray-400">{t.config.enabledConnectors.join(', ')}</td>
                <td className="py-3 pr-4 text-gray-400">{t.config.modelPolicy}</td>
                <td className="py-3 text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <CreateTenantModal open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleCreate} />
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    starter: 'bg-gray-700 text-gray-300',
    pro: 'bg-blue-900/50 text-blue-300',
    enterprise: 'bg-purple-900/50 text-purple-300',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[plan] ?? 'bg-gray-700'}`}>
      {plan}
    </span>
  );
}
