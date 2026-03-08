'use client';
import { useState } from 'react';
import { Shield, ArrowRight, AlertCircle } from 'lucide-react';
import { adminLogin } from '@/lib/api';

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

    try {
      await adminLogin(key.trim());
      onAuthenticated();
    } catch {
      setError('Invalid API key. Please check and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-0 p-4">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-brand-600/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-slide-up">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 shadow-glow">
            <Shield size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">AI Support Admin</h1>
          <p className="mt-1 text-sm text-surface-600">Sign in to manage your platform</p>
        </div>

        <form onSubmit={handleSubmit}
          className="rounded-2xl border border-surface-400/50 bg-surface-200/50 p-8 shadow-card backdrop-blur-sm">

          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400 ring-1 ring-red-500/20 animate-fade-in" role="alert">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </div>
          )}

          <label htmlFor="api-key" className="mb-2 block text-sm font-medium text-surface-800">
            API Key
          </label>
          <input
            id="api-key" type="password" value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Enter your admin API key"
            className="input-field mb-6" autoFocus disabled={loading}
          />

          <button type="submit" disabled={loading || !key.trim()}
            className="btn-primary flex w-full items-center justify-center gap-2">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Verifying...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Sign In <ArrowRight size={16} />
              </span>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-surface-600">
          Use your super-admin key or tenant admin key to sign in
        </p>
      </div>
    </div>
  );
}
