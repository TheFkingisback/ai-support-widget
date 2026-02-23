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

  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
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
    try {
      if (apiBaseUrl.trim()) new URL(apiBaseUrl);
    } catch {
      errs.apiBaseUrl = 'Must be a valid URL';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const result = await onSubmit({
        name: name.trim(), plan, apiBaseUrl: apiBaseUrl.trim(), serviceToken: serviceToken.trim(),
      });
      setGeneratedKey(result.adminApiKey);
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Creation failed' });
    } finally {
      setSubmitting(false);
    }
  }

  async function copyKey() {
    if (!generatedKey) return;
    await navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      data-testid="create-tenant-modal" role="dialog" aria-modal="true" aria-labelledby="create-tenant-title"
      ref={dialogRef} tabIndex={-1}>
      <div className="w-full max-w-md rounded-lg bg-gray-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="create-tenant-title" className="text-lg font-semibold">
            {generatedKey ? 'Tenant Created' : 'Create Tenant'}
          </h2>
          <button onClick={handleClose} aria-label="Close dialog"
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {generatedKey ? (
          <KeyDisplay apiKey={generatedKey} copied={copied} onCopy={copyKey} onDone={handleClose} />
        ) : (
          <TenantForm name={name} plan={plan} apiBaseUrl={apiBaseUrl} serviceToken={serviceToken}
            errors={errors} submitting={submitting} onNameChange={setName}
            onPlanChange={setPlan} onUrlChange={setApiBaseUrl}
            onTokenChange={setServiceToken} onSubmit={handleSubmit} />
        )}
      </div>
    </div>
  );
}

function KeyDisplay({ apiKey, copied, onCopy, onDone }: {
  apiKey: string; copied: boolean; onCopy: () => void; onDone: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-yellow-400">
        Save this admin key now. It will not be shown again.
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 break-all rounded bg-gray-800 px-3 py-2 text-sm text-green-400">
          {apiKey}
        </code>
        <button onClick={onCopy} aria-label="Copy key"
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white">
          {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
        </button>
      </div>
      <p className="text-xs text-gray-500">
        The tenant admin uses this key to log in via the Tenant Admin login mode.
      </p>
      <button onClick={onDone} className="btn-primary w-full">Done</button>
    </div>
  );
}

function TenantForm({ name, plan, apiBaseUrl, serviceToken, errors, submitting,
  onNameChange, onPlanChange, onUrlChange, onTokenChange, onSubmit }: {
  name: string; plan: CreateTenantInput['plan']; apiBaseUrl: string; serviceToken: string;
  errors: Record<string, string>; submitting: boolean;
  onNameChange: (v: string) => void; onPlanChange: (v: CreateTenantInput['plan']) => void;
  onUrlChange: (v: string) => void; onTokenChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {errors.form && <p role="alert" className="text-sm text-red-400">{errors.form}</p>}
      <Field label="Name" error={errors.name}>
        <input value={name} onChange={(e) => onNameChange(e.target.value)}
          className="input-field" placeholder="Acme Corp" />
      </Field>
      <Field label="Plan">
        <select value={plan} onChange={(e) => onPlanChange(e.target.value as CreateTenantInput['plan'])}
          className="input-field">
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </Field>
      <Field label="API Base URL" error={errors.apiBaseUrl}>
        <input value={apiBaseUrl} onChange={(e) => onUrlChange(e.target.value)}
          className="input-field" placeholder="https://api.acme.com" />
      </Field>
      <Field label="Service Token" error={errors.serviceToken}>
        <input value={serviceToken} onChange={(e) => onTokenChange(e.target.value)} type="password"
          className="input-field" placeholder="sk_live_..." />
      </Field>
      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Creating...' : 'Create Tenant'}
      </button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-gray-400">{label}</span>
      {children}
      {error && <span role="alert" className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
}
