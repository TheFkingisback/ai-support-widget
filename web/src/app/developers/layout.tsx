'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowLeft } from 'lucide-react';
import { SidebarNav } from './components/sidebar-nav';

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white lg:hidden"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Back to Home</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/demo" className="btn-secondary text-xs">
              Live Demo
            </Link>
            <Link href="/admin" className="btn-primary text-xs">
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar — desktop */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-gray-800/50 p-4">
            <SidebarNav />
          </div>
        </aside>

        {/* Sidebar — mobile overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-30 lg:hidden" onClick={() => setMobileOpen(false)}>
            <div className="absolute inset-0 bg-black/60" />
            <aside
              className="absolute left-0 top-14 h-[calc(100vh-3.5rem)] w-64 overflow-y-auto border-r border-gray-800/50 bg-gray-950 p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <SidebarNav />
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="min-w-0 flex-1 px-6 py-10 lg:px-12">
          <div className="mx-auto max-w-4xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
