'use client';
import { useState } from 'react';
import { setAdminApiKey, listTenants } from '@/lib/api';

interface Props {
  onAuthenticated: () => void;
}

export function AdminLogin({ onAuthenticated }: Props) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setLoading(true);
    setError('');

    setAdminApiKey(key.trim());
    try {
      await listTenants();
      onAuthenticated();
    } catch {
      setError('Invalid API key. Access denied.');
      setAdminApiKey('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl border border-gray-800 bg-gray-900 p-8">
        <h1 className="mb-6 text-center text-xl font-bold text-white">Admin Access</h1>
        <label htmlFor="api-key" className="mb-2 block text-sm text-gray-400">
          API Key
        </label>
        <input
          id="api-key"
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Enter admin API key"
          className="input-field mb-4 w-full"
          autoFocus
          disabled={loading}
        />
        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || !key.trim()}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? 'Verifying...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
