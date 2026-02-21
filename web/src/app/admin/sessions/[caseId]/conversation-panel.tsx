'use client';
import type { Message } from '@/lib/types';

interface Props { messages: Message[] }

const ROLE_STYLES: Record<string, string> = {
  user: 'border-blue-800 bg-blue-950/30',
  assistant: 'border-green-800 bg-green-950/30',
  system: 'border-gray-700 bg-gray-900',
};

const ROLE_LABELS: Record<string, string> = {
  user: 'User',
  assistant: 'AI (sent to client)',
  system: 'System',
};

export function ConversationPanel({ messages }: Props) {
  if (messages.length === 0) {
    return <p className="text-gray-500">No messages in this session.</p>;
  }

  return (
    <div className="space-y-3">
      {messages.map((m) => (
        <div key={m.id} className={`rounded-lg border p-4 ${ROLE_STYLES[m.role] ?? ''}`}>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-gray-400">
              {ROLE_LABELS[m.role] ?? m.role}
            </span>
            <span className="text-xs text-gray-600">
              {new Date(m.createdAt).toLocaleTimeString()}
            </span>
          </div>
          <div className="whitespace-pre-wrap text-sm text-gray-200">{m.content}</div>

          {m.evidence.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {m.evidence.map((e, i) => (
                <span key={i} className="rounded bg-gray-800 px-2 py-0.5 text-xs text-yellow-400">
                  {e.label}: {e.value}
                </span>
              ))}
            </div>
          )}

          {m.actions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {m.actions.map((a, i) => (
                <span key={i} className="rounded bg-gray-800 px-2 py-0.5 text-xs text-blue-400">
                  [{a.type}] {a.label}
                </span>
              ))}
            </div>
          )}

          {m.confidence !== null && (
            <div className="mt-1 text-xs text-gray-500">
              Confidence: {(m.confidence * 100).toFixed(0)}%
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
