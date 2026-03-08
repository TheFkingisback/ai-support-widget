'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getSessionDetail } from '@/lib/api';
import type { SessionDetail } from '@/lib/types';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
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

  if (loading) return <div className="skeleton h-96 w-full rounded-2xl" />;
  if (!data) return <p className="text-red-400">Session not found.</p>;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'conversation', label: `Conversation (${data.messages.length})` },
    { key: 'context', label: 'Context Received' },
    { key: 'costs', label: `LLM Calls (${data.costs.length})` },
  ];

  return (
    <div>
      <PageHeader title={`Session ${caseId}`}
        breadcrumbs={[
          { label: 'Admin', href: '/admin/dashboard' },
          { label: 'Sessions', href: '/admin/sessions' },
          { label: caseId },
        ]}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={data.case.status} />
            <div className="text-xs text-surface-600">
              <span>User: <strong className="text-surface-800">{data.case.userId}</strong></span>
              <span className="mx-2">|</span>
              <span>Tenant: <strong className="text-surface-800">{data.case.tenantId}</strong></span>
            </div>
          </div>
        }
      />

      <div className="mb-6 flex gap-1 rounded-xl bg-surface-200 p-1" role="tablist">
        {tabs.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-surface-300 text-white shadow-sm'
                : 'text-surface-600 hover:text-surface-800'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
        {tab === 'conversation' && <ConversationPanel messages={data.messages} />}
        {tab === 'context' && <SnapshotPanel snapshot={data.snapshot} />}
        {tab === 'costs' && <CostsPanel costs={data.costs} />}
      </div>
    </div>
  );
}
