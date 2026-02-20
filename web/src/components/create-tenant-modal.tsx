'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import type { CreateTenantInput } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateTenantInput) => void;
}

export function CreateTenantModal({ open, onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [plan, setPlan] = useState<CreateTenantInput['plan']>('starter');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [serviceToken, setServiceToken] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!open) return null;

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!apiBaseUrl.trim()) errs.apiBaseUrl = 'API Base URL is required';
    if (!serviceToken.trim()) errs.serviceToken = 'Service token is required';
    try {
      if (apiBaseUrl.trim()) new URL(apiBaseUrl);
    } catch {
      errs.apiBaseUrl = 'Must be a valid URL';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ name: name.trim(), plan, apiBaseUrl: apiBaseUrl.trim(), serviceToken: serviceToken.trim() });
    setName(''); setPlan('starter'); setApiBaseUrl(''); setServiceToken('');
    setErrors({});
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" data-testid="create-tenant-modal">
      <div className="w-full max-w-md rounded-lg bg-gray-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create Tenant</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name" error={errors.name}>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="input-field" placeholder="Acme Corp" />
          </Field>
          <Field label="Plan">
            <select value={plan} onChange={(e) => setPlan(e.target.value as CreateTenantInput['plan'])}
              className="input-field">
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </Field>
          <Field label="API Base URL" error={errors.apiBaseUrl}>
            <input value={apiBaseUrl} onChange={(e) => setApiBaseUrl(e.target.value)}
              className="input-field" placeholder="https://api.acme.com" />
          </Field>
          <Field label="Service Token" error={errors.serviceToken}>
            <input value={serviceToken} onChange={(e) => setServiceToken(e.target.value)} type="password"
              className="input-field" placeholder="sk_live_..." />
          </Field>
          <button type="submit" className="btn-primary w-full">
            Create Tenant
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-gray-400">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
}
