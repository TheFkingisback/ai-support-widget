'use client';
import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { AdminLogin } from '@/components/admin-login';
import { getAdminApiKey, clearAdminApiKey, listTenants } from '@/lib/api';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const key = getAdminApiKey();
    if (!key) {
      setChecking(false);
      return;
    }
    listTenants()
      .then(() => setAuthenticated(true))
      .catch(() => clearAdminApiKey())
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <p className="text-gray-500">Loading...</p>
    </div>;
  }

  if (!authenticated) {
    return <AdminLogin onAuthenticated={() => setAuthenticated(true)} />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white">
        Skip to main content
      </a>
      <Sidebar />
      <main id="main-content" className="flex-1 overflow-auto bg-gray-950 p-6">{children}</main>
    </div>
  );
}
