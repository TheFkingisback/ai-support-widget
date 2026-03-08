'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Rocket, Shield, Puzzle, Server,
  Code2, AlertTriangle, Map, BookOpen,
} from 'lucide-react';

const sections = [
  { href: '/developers', label: 'Overview', icon: BookOpen, exact: true },
  { href: '/developers/quick-start', label: 'Quick Start', icon: Rocket },
  { href: '/developers/authentication', label: 'Authentication', icon: Shield },
  { href: '/developers/widget-sdk', label: 'Widget SDK', icon: Puzzle },
  { href: '/developers/api-reference', label: 'API Reference', icon: Server },
  { href: '/developers/types', label: 'Type Definitions', icon: Code2 },
  { href: '/developers/error-reference', label: 'Error Reference', icon: AlertTriangle },
  { href: '/developers/integration', label: 'Integration Guide', icon: Map },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Developer documentation" className="space-y-1">
      <div className="mb-6 px-3">
        <Link href="/developers" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <Code2 className="h-4 w-4 text-white" aria-hidden="true" />
          </div>
          <span className="text-sm font-bold text-white">Dev Portal</span>
        </Link>
      </div>

      <div className="space-y-0.5">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          Documentation
        </p>
        {sections.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all ${
                isActive
                  ? 'bg-blue-600/10 font-medium text-blue-400'
                  : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="mx-3 my-4 border-t border-gray-800/50" />

      <div className="space-y-0.5">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          Resources
        </p>
        <Link
          href="/demo"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400
            transition-all hover:bg-gray-800/50 hover:text-gray-200"
        >
          <Puzzle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Live Demo
        </Link>
        <Link
          href="/admin"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400
            transition-all hover:bg-gray-800/50 hover:text-gray-200"
        >
          <Server className="h-4 w-4 shrink-0" aria-hidden="true" />
          Admin Dashboard
        </Link>
      </div>
    </nav>
  );
}
