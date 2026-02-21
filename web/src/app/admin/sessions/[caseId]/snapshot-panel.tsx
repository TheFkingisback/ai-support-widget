'use client';
import { useState } from 'react';
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
      <p className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-gray-500">
        No context was received from the host app for this session.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="mb-3 text-xs text-gray-500">
        Snapshot <strong className="text-gray-400">{snapshot.meta.snapshotId}</strong>
        {' '}created at {new Date(snapshot.meta.createdAt).toLocaleString()}
      </p>

      {SECTIONS.map(({ key, label, desc }) => {
        const isOpen = open === key;
        const data = snapshot[key];
        return (
          <div key={key} className="rounded-lg border border-gray-800 bg-gray-900">
            <button
              onClick={() => setOpen(isOpen ? null : key)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
              aria-expanded={isOpen}
            >
              <div>
                <span className="font-medium text-gray-200">{label}</span>
                <span className="ml-2 text-xs text-gray-500">{desc}</span>
              </div>
              <span className="text-gray-500">{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && (
              <div className="border-t border-gray-800 p-4">
                <pre className="max-h-80 overflow-auto rounded bg-gray-950 p-3 text-xs text-gray-300">
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
