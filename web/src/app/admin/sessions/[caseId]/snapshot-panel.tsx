'use client';
import { useState } from 'react';
import { ChevronDown, Database } from 'lucide-react';
import type { SnapshotData } from '@/lib/types';

interface Props { snapshot: SnapshotData | null }

type Section = 'identity' | 'productState' | 'recentActivity' | 'backend' | 'knowledgePack';

const SECTIONS: { key: Section; label: string; desc: string }[] = [
  { key: 'identity', label: 'Identity', desc: 'User identity, roles, plan, features' },
  { key: 'productState', label: 'Product State', desc: 'Entities, errors, limits' },
  { key: 'recentActivity', label: 'Recent Activity', desc: 'Events and click timeline' },
  { key: 'backend', label: 'Backend Logs', desc: 'API requests, jobs, errors' },
  { key: 'knowledgePack', label: 'Knowledge Pack', desc: 'Docs, runbooks, changelog' },
];

export function SnapshotPanel({ snapshot }: Props) {
  const [open, setOpen] = useState<Section | null>('identity');

  if (!snapshot) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-500 bg-surface-200/30 px-8 py-16 text-center">
        <Database size={32} className="mb-3 text-surface-600" />
        <p className="text-sm text-surface-600">
          No context was received from the host app for this session.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="mb-4 text-xs text-surface-600">
        Snapshot <strong className="text-surface-800 font-mono">{snapshot.meta.snapshotId}</strong>
        {' '}-- {new Date(snapshot.meta.createdAt).toLocaleString()}
      </p>

      {SECTIONS.map(({ key, label, desc }) => {
        const isOpen = open === key;
        const data = snapshot[key];
        return (
          <div key={key} className="rounded-2xl border border-surface-400/50 bg-surface-200/50 overflow-hidden">
            <button type="button" onClick={() => setOpen(isOpen ? null : key)}
              className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-surface-300/30"
              aria-expanded={isOpen ? true : false}>
              <div>
                <span className="font-medium text-surface-900">{label}</span>
                <span className="ml-2 text-xs text-surface-600">{desc}</span>
              </div>
              <ChevronDown size={16} className={`text-surface-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="border-t border-surface-400/30 p-4 animate-fade-in">
                <pre className="max-h-80 overflow-auto rounded-xl bg-surface-100 p-4 text-xs text-surface-800 leading-relaxed">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
