'use client';
import { useState } from 'react';
import { Shield, ArrowRight, AlertCircle } from 'lucide-react';
import { adminLogin } from '@/lib/api';

interface Props {
  onAuthenticated: () => void;
}

export function AdminLogin({ onAuthenticated }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || !email.trim() || !password) return;
    setLoading(true);
    setError('');

    try {
      await adminLogin(email.trim(), password);
      onAuthenticated();
    } catch {
      setError('Unable to sign in. Check your email and password, or try again shortly.');
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

          <label htmlFor="email" className="mb-2 block text-sm font-medium text-surface-800">
            Email
          </label>
          <input
            id="email" name="email" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email" autoComplete="username" required maxLength={254}
            className="input-field mb-6" autoFocus disabled={loading}
          />
          <label htmlFor="password" className="mb-2 block text-sm font-medium text-surface-800">
            Password
          </label>
          <input
            id="password" name="password" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password" autoComplete="current-password" required maxLength={1024}
            className="input-field mb-6" disabled={loading}
          />

          <button type="submit" disabled={loading || !email.trim() || !password}
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
          Sign in with your administrator email and password
        </p>
      </div>
    </div>
  );
}
