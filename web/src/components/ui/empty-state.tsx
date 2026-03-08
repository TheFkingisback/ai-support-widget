import type { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-500 bg-surface-200/30 px-8 py-16 text-center animate-fade-in">
      <div className="mb-4 rounded-2xl bg-surface-300 p-4">
        <Icon size={32} className="text-surface-600" aria-hidden="true" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-surface-900">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-surface-700">{description}</p>
      {action && (
        <button onClick={action.onClick} className="btn-primary">
          {action.label}
        </button>
      )}
    </div>
  );
}
