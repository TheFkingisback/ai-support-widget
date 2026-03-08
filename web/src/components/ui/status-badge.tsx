const STATUS_MAP: Record<string, { class: string; dot: string }> = {
  active: { class: 'badge-emerald', dot: 'bg-emerald-400' },
  resolved: { class: 'badge-blue', dot: 'bg-blue-400' },
  unresolved: { class: 'badge-amber', dot: 'bg-amber-400' },
  escalated: { class: 'badge-rose', dot: 'bg-rose-400' },
  starter: { class: 'badge-gray', dot: 'bg-surface-600' },
  pro: { class: 'badge-blue', dot: 'bg-blue-400' },
  enterprise: { class: 'badge-violet', dot: 'bg-violet-400' },
  online: { class: 'badge-emerald', dot: 'bg-emerald-400' },
  offline: { class: 'badge-rose', dot: 'bg-rose-400' },
};

interface Props {
  status: string;
  pulse?: boolean;
}

export function StatusBadge({ status, pulse }: Props) {
  const style = STATUS_MAP[status] ?? { class: 'badge-gray', dot: 'bg-surface-600' };
  return (
    <span className={style.class}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${style.dot} ${pulse ? 'animate-pulse' : ''}`} />
      {status}
    </span>
  );
}
