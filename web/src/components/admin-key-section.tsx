'use client';
import { useState } from 'react';
import { Copy, Check, KeyRound } from 'lucide-react';
import { resetTenantKey } from '@/lib/api';

interface Props {
  tenantId: string;
}

export function AdminKeySection({ tenantId }: Props) {
  const [newKey, setNewKey] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  async function handleReset() {
    if (!confirming) { setConfirming(true); return; }
    setResetting(true);
    setError('');
    try {
      const result = await resetTenantKey(tenantId);
      setNewKey(result.adminApiKey);
      setConfirming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset key');
      setConfirming(false);
    } finally { setResetting(false); }
  }

  async function copyKey() {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="card">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-surface-600">
        Admin API Key
      </h2>
      <div className="space-y-3">
        {newKey ? (
          <div className="space-y-3 animate-fade-in">
            <p className="text-sm text-amber-400">Save this key now. It will not be shown again.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded-xl bg-surface-300 px-4 py-3 text-sm text-emerald-400">
                {newKey}
              </code>
              <button type="button" onClick={copyKey} aria-label="Copy key"
                className="rounded-xl p-2.5 text-surface-600 hover:bg-surface-300 hover:text-white">
                {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-surface-600">
              Generate a new admin key. The previous key will stop working immediately.
            </p>
            {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
            {confirming && (
              <p className="text-sm text-amber-400 animate-fade-in" role="alert">
                Are you sure? The current key will be invalidated.
              </p>
            )}
            <button type="button" onClick={handleReset} disabled={resetting}
              className="btn-danger flex items-center gap-2">
              <KeyRound size={14} aria-hidden="true" />
              {resetting ? 'Resetting...' : confirming ? 'Confirm Reset' : 'Reset Admin Key'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
