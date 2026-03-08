'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Save, ArrowLeft, Trash2, ExternalLink } from 'lucide-react';
import { listTenants, updateTenant, deleteTenant } from '@/lib/api';
import type { Tenant, TenantConfig, UpdateTenantInput } from '@/lib/types';
import ModelPicker from '@/components/model-picker';
import { AdminKeySection } from '@/components/admin-key-section';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';

const CONNECTORS = ['email', 'zendesk', 'jira'];

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [config, setConfig] = useState<TenantConfig | null>(null);
  const [name, setName] = useState('');
  const [plan, setPlan] = useState<Tenant['plan']>('starter');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async () => {
    const tenants = await listTenants();
    const found = tenants.find((t) => t.id === tenantId);
    if (found) {
      setTenant(found); setConfig({ ...found.config });
      setName(found.name); setPlan(found.plan);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    const updates: UpdateTenantInput = { name, plan, config };
    const updated = await updateTenant(tenantId, updates);
    setTenant(updated); setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function setField<K extends keyof TenantConfig>(key: K, val: TenantConfig[K]) {
    setConfig((prev) => prev ? { ...prev, [key]: val } : prev);
  }

  function toggleConnector(c: string) {
    if (!config) return;
    const list = config.enabledConnectors.includes(c)
      ? config.enabledConnectors.filter((x) => x !== c)
      : [...config.enabledConnectors, c];
    setField('enabledConnectors', list);
  }

  if (!tenant || !config) {
    return <div className="skeleton h-96 w-full rounded-2xl" />;
  }

  return (
    <div data-testid="tenant-detail">
      <PageHeader title={tenant.name}
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Tenants', href: '/admin/tenants' },
          { label: tenant.name },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={tenant.plan} />
            <span className="text-xs text-surface-600 font-mono">{tenant.id}</span>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="General">
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
          </Field>
          <Field label="Plan">
            <select value={plan} onChange={(e) => setPlan(e.target.value as Tenant['plan'])}
              className="input-field" aria-label="Plan">
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </Field>
        </Section>

        <Section title="Configuration">
          <NumField label="Max Context Bytes" value={config.maxContextBytes} onChange={(v) => setField('maxContextBytes', v)} />
          <NumField label="Max Event Window (hours)" value={config.maxEventWindowHours} onChange={(v) => setField('maxEventWindowHours', v)} />
          <NumField label="Max Log Lines" value={config.maxLogLines} onChange={(v) => setField('maxLogLines', v)} />
          <NumField label="Max Docs" value={config.maxDocs} onChange={(v) => setField('maxDocs', v)} />
          <NumField label="Retention Days" value={config.retentionDays} onChange={(v) => setField('retentionDays', v)} />
          <Field label="Model Policy">
            <select value={config.modelPolicy} onChange={(e) => setField('modelPolicy', e.target.value as TenantConfig['modelPolicy'])}
              className="input-field" aria-label="Model policy">
              <option value="fast">Fast</option>
              <option value="strong">Strong</option>
              <option value="auto">Auto</option>
            </select>
          </Field>
          <Field label="Preferred Model">
            <ModelPicker value={config.preferredModel} onChange={(id) => setField('preferredModel', id)} />
          </Field>
        </Section>

        <Section title="AI Instructions">
          <Field label="Custom instructions for the AI (max 2000 chars)">
            <textarea value={config.customInstructions ?? ''}
              onChange={(e) => setField('customInstructions', e.target.value)}
              maxLength={2000} rows={5}
              placeholder="e.g. Always respond in Portuguese. Our company is TrackShare."
              className="input-field resize-y" />
          </Field>
          <p className="text-xs text-surface-600">{(config.customInstructions ?? '').length} / 2000</p>
        </Section>

        <Section title="Connectors">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Connector toggles">
            {CONNECTORS.map((c) => {
              const on = config.enabledConnectors.includes(c);
              return (
                <button key={c} type="button" onClick={() => toggleConnector(c)} aria-pressed={on}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                    on ? 'bg-brand-600 text-white shadow-glow' : 'bg-surface-300 text-surface-700 hover:bg-surface-400'
                  }`}>
                  {c}
                </button>
              );
            })}
          </div>
        </Section>

        <AdminKeySection tenantId={tenantId} />

        <Section title="Quick Links">
          <Link href={`/admin/tenants/${tenantId}/cases`}
            className="flex items-center gap-2 text-sm text-brand-400 hover:text-brand-300 transition-colors">
            <ExternalLink size={14} /> Browse Cases
          </Link>
        </Section>
      </div>

      <div className="mt-8 flex items-center gap-4">
        <button type="button" onClick={handleSave} disabled={saving}
          className="btn-primary flex items-center gap-2 px-6">
          <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
        {saved && <span role="status" className="text-sm text-emerald-400 animate-fade-in">Saved!</span>}
        {deleteError && <span className="text-sm text-red-400">{deleteError}</span>}
        <div className="ml-auto">
          {confirmDelete ? (
            <div className="flex items-center gap-2 animate-fade-in">
              <span className="text-sm text-red-400">Confirm delete?</span>
              <button type="button" className="btn-danger px-4 py-2 text-xs" onClick={async () => {
                try { await deleteTenant(tenantId); router.push('/admin/tenants'); }
                catch (err) { setDeleteError(err instanceof Error ? err.message : 'Failed'); }
              }}>Delete</button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="btn-secondary px-4 py-2 text-xs">Cancel</button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)}
              className="btn-danger flex items-center gap-1.5">
              <Trash2 size={14} /> Delete Tenant
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-surface-600">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-surface-700">{label}</span>
      {children}
    </label>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Field label={label}>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="input-field" />
    </Field>
  );
}
