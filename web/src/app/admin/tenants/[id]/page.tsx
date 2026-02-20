'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Save, ArrowLeft } from 'lucide-react';
import { listTenants, updateTenant } from '@/lib/api';
import type { Tenant, TenantConfig, UpdateTenantInput } from '@/lib/types';

const CONNECTORS = ['email', 'zendesk', 'jira'];

export default function TenantDetailPage() {
  const params = useParams();
  const tenantId = params.id as string;
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [config, setConfig] = useState<TenantConfig | null>(null);
  const [name, setName] = useState('');
  const [plan, setPlan] = useState<Tenant['plan']>('starter');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const tenants = await listTenants();
    const found = tenants.find((t) => t.id === tenantId);
    if (found) {
      setTenant(found);
      setConfig({ ...found.config });
      setName(found.name);
      setPlan(found.plan);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    const updates: UpdateTenantInput = { name, plan, config };
    const updated = await updateTenant(tenantId, updates);
    setTenant(updated);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function setConfigField<K extends keyof TenantConfig>(key: K, val: TenantConfig[K]) {
    setConfig((prev) => prev ? { ...prev, [key]: val } : prev);
  }

  function toggleConnector(name: string) {
    if (!config) return;
    const list = config.enabledConnectors.includes(name)
      ? config.enabledConnectors.filter((c) => c !== name)
      : [...config.enabledConnectors, name];
    setConfigField('enabledConnectors', list);
  }

  if (!tenant || !config) return <p className="text-gray-500">Loading...</p>;

  return (
    <div data-testid="tenant-detail">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/admin/tenants" className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"><ArrowLeft size={20} /></Link>
        <h1 className="text-2xl font-bold">{tenant.name}</h1>
        <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs">{tenant.id}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="General">
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="input-field" />
          </Field>
          <Field label="Plan">
            <select value={plan} onChange={(e) => setPlan(e.target.value as Tenant['plan'])}
              className="input-field">
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </Field>
        </Section>

        <Section title="Configuration">
          <NumField label="Max Context Bytes" value={config.maxContextBytes}
            onChange={(v) => setConfigField('maxContextBytes', v)} />
          <NumField label="Max Event Window (hours)" value={config.maxEventWindowHours}
            onChange={(v) => setConfigField('maxEventWindowHours', v)} />
          <NumField label="Max Log Lines" value={config.maxLogLines}
            onChange={(v) => setConfigField('maxLogLines', v)} />
          <NumField label="Max Docs" value={config.maxDocs}
            onChange={(v) => setConfigField('maxDocs', v)} />
          <NumField label="Retention Days" value={config.retentionDays}
            onChange={(v) => setConfigField('retentionDays', v)} />
          <Field label="Model Policy">
            <select value={config.modelPolicy}
              onChange={(e) => setConfigField('modelPolicy', e.target.value as TenantConfig['modelPolicy'])}
              className="input-field">
              <option value="fast">Fast</option>
              <option value="strong">Strong</option>
              <option value="auto">Auto</option>
            </select>
          </Field>
        </Section>

        <Section title="Connectors">
          <div className="flex flex-wrap gap-2">
            {CONNECTORS.map((c) => (
              <button key={c} onClick={() => toggleConnector(c)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  config.enabledConnectors.includes(c)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}>
                {c}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Quick Links">
          <Link href={`/admin/tenants/${tenantId}/cases`}
            className="block text-blue-400 hover:underline text-sm">Browse Cases</Link>
        </Section>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <button onClick={handleSave} disabled={saving}
          className="btn-primary flex items-center gap-2 px-6">
          <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
        {saved && <span className="text-sm text-green-400">Saved successfully</span>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Field label={label}>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="input-field" />
    </Field>
  );
}
