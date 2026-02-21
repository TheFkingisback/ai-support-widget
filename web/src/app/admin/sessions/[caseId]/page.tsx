'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getSessionDetail } from '@/lib/api';
import type { SessionDetail } from '@/lib/types';
import { SnapshotPanel } from './snapshot-panel';
import { ConversationPanel } from './conversation-panel';
import { CostsPanel } from './costs-panel';

type Tab = 'conversation' | 'context' | 'costs';

export default function SessionDetailPage() {
  const params = useParams();
  const caseId = params.caseId as string;
  const [data, setData] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('conversation');

  useEffect(() => {
    setLoading(true);
    getSessionDetail(caseId).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [caseId]);

  if (loading) return <p className="text-gray-500" role="status">Loading...</p>;
  if (!data) return <p className="text-red-400">Session not found.</p>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'conversation', label: `Conversation (${data.messages.length})` },
    { key: 'context', label: 'Context Received' },
    { key: 'costs', label: `LLM Calls (${data.costs.length})` },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <Link href="/admin/sessions" aria-label="Back to sessions"
          className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white">
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>
        <h1 className="text-2xl font-bold">Session {caseId}</h1>
        <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
          {data.case.status}
        </span>
      </div>

      <div className="mb-2 flex gap-3 text-sm text-gray-500">
        <span>User: <strong className="text-gray-300">{data.case.userId}</strong></span>
        <span>Tenant: <strong className="text-gray-300">{data.case.tenantId}</strong></span>
        <span>Created: {new Date(data.case.createdAt).toLocaleString()}</span>
      </div>

      <div className="mb-4 flex gap-1 border-b border-gray-800" role="tablist">
        {tabs.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'conversation' && <ConversationPanel messages={data.messages} />}
      {tab === 'context' && <SnapshotPanel snapshot={data.snapshot} />}
      {tab === 'costs' && <CostsPanel costs={data.costs} />}
    </div>
  );
}
