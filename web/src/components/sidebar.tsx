'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, BarChart3, ScrollText, LogOut } from 'lucide-react';

const navItems = [
  { href: '/admin/tenants', label: 'Tenants', icon: Building2 },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/audit', label: 'Audit Log', icon: ScrollText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-800 bg-gray-900">
      <div className="flex h-14 items-center border-b border-gray-800 px-4">
        <span className="text-lg font-semibold text-blue-400">AI Support Admin</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                active
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-800 p-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-200"
        >
          <LogOut size={18} />
          Exit Admin
        </Link>
      </div>
    </aside>
  );
}
