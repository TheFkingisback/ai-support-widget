'use client';
import type { Message } from '@/lib/types';

interface Props { messages: Message[] }

const ROLE_STYLES: Record<string, string> = {
  user: 'border-brand-600/30 bg-brand-600/5',
  assistant: 'border-emerald-600/30 bg-emerald-600/5',
  system: 'border-surface-400/30 bg-surface-200/50',
};

const ROLE_LABELS: Record<string, string> = {
  user: 'User',
  assistant: 'AI Assistant',
  system: 'System',
};

export function ConversationPanel({ messages }: Props) {
  if (messages.length === 0) {
    return <p className="py-8 text-center text-sm text-surface-600">No messages in this session.</p>;
  }

  return (
    <div className="space-y-3">
      {messages.map((m) => (
        <div key={m.id} className={`rounded-2xl border p-5 transition-all ${ROLE_STYLES[m.role] ?? ''}`}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-surface-600">
              {ROLE_LABELS[m.role] ?? m.role}
            </span>
            <span className="text-xs text-surface-500">
              {new Date(m.createdAt).toLocaleTimeString()}
            </span>
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-surface-900">{m.content}</div>

          {m.evidence.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {m.evidence.map((e, i) => (
                <span key={i} className="badge-amber text-2xs">
                  {e.label}: {e.value}
                </span>
              ))}
            </div>
          )}

          {m.actions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {m.actions.map((a, i) => (
                <span key={i} className="badge-blue text-2xs">
                  [{a.type}] {a.label}
                </span>
              ))}
            </div>
          )}

          {m.confidence !== null && (
            <div className="mt-2 text-xs text-surface-600">
              Confidence: {(m.confidence * 100).toFixed(0)}%
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
