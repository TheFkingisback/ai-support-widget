'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const THEME = {
  axis: '#71717a',
  tooltip: { background: '#18181b', border: '#27272a' },
  fontSize: 11,
  radius: 8,
};

interface IntentsProps {
  data: { intent: string; count: number }[];
}

export function IntentsChart({ data }: IntentsProps) {
  const items = data.slice(0, 8);
  if (items.length === 0) return <p className="py-8 text-center text-sm text-surface-600">No data</p>;

  return (
    <div data-testid="intents-chart" className="h-64 w-full" role="img"
      aria-label={`Top intents: ${items.map((i) => `${i.intent} (${i.count})`).join(', ')}`}>
      <ResponsiveContainer>
        <BarChart data={items} layout="vertical" margin={{ left: 60, right: 20, top: 5, bottom: 5 }}>
          <XAxis type="number" stroke={THEME.axis} fontSize={THEME.fontSize} />
          <YAxis type="category" dataKey="intent" stroke={THEME.axis} fontSize={THEME.fontSize} width={55} />
          <Tooltip contentStyle={{
            background: THEME.tooltip.background, border: `1px solid ${THEME.tooltip.border}`,
            borderRadius: THEME.radius, fontSize: THEME.fontSize,
          }} />
          <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ErrorsProps {
  data: { errorCode: string; count: number }[];
}

export function ErrorsChart({ data }: ErrorsProps) {
  const items = data.slice(0, 8);
  if (items.length === 0) return <p className="py-8 text-center text-sm text-surface-600">No data</p>;

  return (
    <div data-testid="errors-chart" className="h-64 w-full" role="img"
      aria-label={`Top errors: ${items.map((i) => `${i.errorCode} (${i.count})`).join(', ')}`}>
      <ResponsiveContainer>
        <BarChart data={items} layout="vertical" margin={{ left: 80, right: 20, top: 5, bottom: 5 }}>
          <XAxis type="number" stroke={THEME.axis} fontSize={THEME.fontSize} />
          <YAxis type="category" dataKey="errorCode" stroke={THEME.axis} fontSize={THEME.fontSize} width={75} />
          <Tooltip contentStyle={{
            background: THEME.tooltip.background, border: `1px solid ${THEME.tooltip.border}`,
            borderRadius: THEME.radius, fontSize: THEME.fontSize,
          }} />
          <Bar dataKey="count" fill="#f43f5e" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
