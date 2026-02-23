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

  async function handleReset() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setResetting(true);
    try {
      const result = await resetTenantKey(tenantId);
      setNewKey(result.adminApiKey);
      setConfirming(false);
    } catch (err) {
      setConfirming(false);
    } finally {
      setResetting(false);
    }
  }

  async function copyKey() {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="card">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
        Admin API Key
      </h2>
      <div className="space-y-3">
        {newKey ? (
          <div className="space-y-2">
            <p className="text-sm text-yellow-400">
              Save this key now. It will not be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-gray-800 px-3 py-2 text-sm text-green-400">
                {newKey}
              </code>
              <button onClick={copyKey} aria-label="Copy key"
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white">
                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              Generate a new admin key for this tenant. The previous key will stop working immediately.
            </p>
            {confirming && (
              <p className="text-sm text-yellow-400" role="alert">
                Are you sure? The current key will be invalidated.
              </p>
            )}
            <button onClick={handleReset} disabled={resetting}
              className="flex items-center gap-2 rounded-lg bg-red-900/30 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-900/50">
              <KeyRound size={14} aria-hidden="true" />
              {resetting ? 'Resetting...' : confirming ? 'Confirm Reset' : 'Reset Admin Key'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
