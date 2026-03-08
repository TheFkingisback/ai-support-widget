'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Building2, BarChart3, ScrollText,
  MessageSquare, LogOut, Menu, X, Shield, ChevronDown,
} from 'lucide-react';
import { getAdminRole, clearAdminApiKey } from '@/lib/api';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Management',
    items: [
      { href: '/admin/tenants', label: 'Tenants', icon: Building2 },
      { href: '/admin/sessions', label: 'Sessions', icon: MessageSquare },
    ],
  },
  {
    label: 'Insights',
    items: [
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
      { href: '/admin/audit', label: 'Audit Log', icon: ScrollText },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = getAdminRole();

  function handleLogout() {
    clearAdminApiKey();
    window.location.href = '/admin';
  }

  const nav = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-surface-400/30 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 shadow-glow">
          <Shield size={16} className="text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white tracking-tight">AI Support</span>
          <span className="text-2xs text-surface-600">Admin Console</span>
        </div>
        <button onClick={() => setMobileOpen(false)}
          className="ml-auto text-surface-600 hover:text-white md:hidden" aria-label="Close menu">
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin navigation">
        {NAV_GROUPS.map((group) => (
          <NavGroup key={group.label} group={group} pathname={pathname}
            onNavigate={() => setMobileOpen(false)} />
        ))}
      </nav>

      <div className="border-t border-surface-400/30 p-3 space-y-2">
        <div className="flex items-center gap-3 rounded-xl bg-surface-300/50 px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600/20 text-brand-400">
            <Shield size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-xs font-medium text-surface-900">
              {role === 'super_admin' ? 'Super Admin' : 'Tenant Admin'}
            </p>
            <p className="text-2xs text-surface-600">
              {role === 'super_admin' ? 'Full access' : 'Limited access'}
            </p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-surface-600 transition-all hover:bg-surface-300 hover:text-surface-800">
          <LogOut size={16} aria-hidden="true" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-xl bg-surface-200 p-2.5 text-surface-700 shadow-card hover:text-white md:hidden"
        aria-label="Open menu">
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          aria-hidden="true" onClick={() => setMobileOpen(false)} />
      )}

      <aside aria-label="Admin sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-surface-400/30 bg-surface-100 transition-transform duration-300 md:static md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        {nav}
      </aside>
    </>
  );
}

function NavGroup({ group, pathname, onNavigate }: {
  group: typeof NAV_GROUPS[number]; pathname: string; onNavigate: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="mb-4">
      <button onClick={() => setCollapsed(!collapsed)}
        className="mb-1 flex w-full items-center justify-between px-3 py-1 text-2xs font-semibold uppercase tracking-widest text-surface-600 hover:text-surface-700">
        {group.label}
        <ChevronDown size={12} className={`transition-transform ${collapsed ? '-rotate-90' : ''}`} />
      </button>
      {!collapsed && group.items.map((item) => {
        const active = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
              active
                ? 'bg-brand-600/10 text-brand-400 shadow-sm ring-1 ring-brand-600/20'
                : 'text-surface-700 hover:bg-surface-300/50 hover:text-surface-900'
            }`}>
            <Icon size={18} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
