'use client';
import { useState, useEffect, useRef } from 'react';
import { X, Copy, Check } from 'lucide-react';
import type { CreateTenantInput } from '@/lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateTenantInput) => Promise<{ adminApiKey: string }>;
}

export function CreateTenantModal({ open, onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [plan, setPlan] = useState<CreateTenantInput['plan']>('starter');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [serviceToken, setServiceToken] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) dialogRef.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open]);

  if (!open) return null;

  function handleClose() {
    setName(''); setPlan('starter'); setApiBaseUrl(''); setServiceToken('');
    setErrors({}); setGeneratedKey(null); setCopied(false);
    onClose();
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    if (!apiBaseUrl.trim()) errs.apiBaseUrl = 'API Base URL is required';
    if (!serviceToken.trim()) errs.serviceToken = 'Service token is required';
    try { if (apiBaseUrl.trim()) new URL(apiBaseUrl); } catch { errs.apiBaseUrl = 'Must be a valid URL'; }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const result = await onSubmit({ name: name.trim(), plan, apiBaseUrl: apiBaseUrl.trim(), serviceToken: serviceToken.trim() });
      setGeneratedKey(result.adminApiKey);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Creation failed' });
    } finally { setSubmitting(false); }
  }

  async function copyKey() {
    if (!generatedKey) return;
    await navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      data-testid="create-tenant-modal" role="dialog" aria-modal="true"
      aria-labelledby="create-tenant-title" ref={dialogRef} tabIndex={-1}>
      <div className="w-full max-w-md rounded-2xl border border-surface-400/50 bg-surface-200 p-6 shadow-xl animate-slide-up">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="create-tenant-title" className="text-lg font-semibold text-white">
            {generatedKey ? 'Tenant Created' : 'Create Tenant'}
          </h2>
          <button type="button" onClick={handleClose} aria-label="Close dialog"
            className="rounded-xl p-2 text-surface-600 hover:bg-surface-300 hover:text-white">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {generatedKey ? (
          <div className="space-y-4">
            <p className="text-sm text-amber-400">Save this key now. It will not be shown again.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded-xl bg-surface-300 px-4 py-3 text-sm text-emerald-400">{generatedKey}</code>
              <button type="button" onClick={copyKey} aria-label="Copy key"
                className="rounded-xl p-2.5 text-surface-600 hover:bg-surface-300 hover:text-white">
                {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
              </button>
            </div>
            <button type="button" onClick={handleClose} className="btn-primary w-full">Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.form && <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400 ring-1 ring-red-500/20">{errors.form}</p>}
            <Field label="Name" error={errors.name}>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="Acme Corp" />
            </Field>
            <Field label="Plan">
              <select value={plan} onChange={(e) => setPlan(e.target.value as CreateTenantInput['plan'])} className="input-field" aria-label="Plan">
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </Field>
            <Field label="API Base URL" error={errors.apiBaseUrl}>
              <input value={apiBaseUrl} onChange={(e) => setApiBaseUrl(e.target.value)} className="input-field" placeholder="https://api.acme.com" />
            </Field>
            <Field label="Service Token" error={errors.serviceToken}>
              <input value={serviceToken} onChange={(e) => setServiceToken(e.target.value)} type="password" className="input-field" placeholder="sk_live_..." />
            </Field>
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'Creating...' : 'Create Tenant'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-surface-800">{label}</span>
      {children}
      {error && <span role="alert" className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
}
