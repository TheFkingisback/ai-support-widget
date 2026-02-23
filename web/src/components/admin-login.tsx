'use client';
import { useState } from 'react';
import { adminLogin } from '@/lib/api';

interface Props {
  onAuthenticated: () => void;
}

export function AdminLogin({ onAuthenticated }: Props) {
  const [key, setKey] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'super' | 'tenant'>('super');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    if (mode === 'tenant' && !tenantId.trim()) return;
    setLoading(true);
    setError('');

    try {
      await adminLogin(key.trim(), mode === 'tenant' ? tenantId.trim() : undefined);
      onAuthenticated();
    } catch {
      setError('Invalid credentials. Access denied.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl border border-gray-800 bg-gray-900 p-8">
        <h1 className="mb-6 text-center text-xl font-bold text-white">Admin Access</h1>

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode('super')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === 'super' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Super Admin
          </button>
          <button
            type="button"
            onClick={() => setMode('tenant')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === 'tenant' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            Tenant Admin
          </button>
        </div>

        {mode === 'tenant' && (
          <>
            <label htmlFor="tenant-id" className="mb-2 block text-sm text-gray-400">
              Tenant ID
            </label>
            <input
              id="tenant-id"
              type="text"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="ten_..."
              className="input-field mb-4 w-full"
              disabled={loading}
            />
          </>
        )}

        <label htmlFor="api-key" className="mb-2 block text-sm text-gray-400">
          API Key
        </label>
        <input
          id="api-key"
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Enter API key"
          className="input-field mb-4 w-full"
          autoFocus
          disabled={loading}
        />
        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || !key.trim() || (mode === 'tenant' && !tenantId.trim())}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
