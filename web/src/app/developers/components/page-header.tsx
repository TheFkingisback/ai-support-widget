interface PageHeaderProps {
  title: string;
  description: string;
  badge?: string;
  badgeColor?: 'blue' | 'green' | 'yellow' | 'purple' | 'red';
}

const badgeColors = {
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  green: 'bg-green-500/10 text-green-400 border-green-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export function PageHeader({ title, description, badge, badgeColor = 'blue' }: PageHeaderProps) {
  return (
    <div className="mb-10 border-b border-gray-800/50 pb-8">
      {badge && (
        <span className={`mb-3 inline-block rounded-full border px-3 py-1 text-xs font-medium ${badgeColors[badgeColor]}`}>
          {badge}
        </span>
      )}
      <h1 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
        {title}
      </h1>
      <p className="max-w-2xl text-lg leading-relaxed text-gray-400">
        {description}
      </p>
    </div>
  );
}
