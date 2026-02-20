'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const CHART_THEME = {
  axis: '#6b7280',
  tooltip: { background: '#1f2937', border: '#374151' },
  fontSize: 12,
  radius: 6,
};

interface IntentsProps {
  data: { intent: string; count: number }[];
}

export function IntentsChart({ data }: IntentsProps) {
  const items = data.slice(0, 8);
  if (items.length === 0) return <p className="text-sm text-gray-500">No data</p>;

  return (
    <div data-testid="intents-chart" className="h-64 w-full" role="img"
      aria-label={`Top intents chart: ${items.map((i) => `${i.intent} (${i.count})`).join(', ')}`}>
      <ResponsiveContainer>
        <BarChart data={items} layout="vertical" margin={{ left: 60, right: 20, top: 5, bottom: 5 }}>
          <XAxis type="number" stroke={CHART_THEME.axis} fontSize={CHART_THEME.fontSize} />
          <YAxis type="category" dataKey="intent" stroke={CHART_THEME.axis} fontSize={CHART_THEME.fontSize} width={55} />
          <Tooltip contentStyle={{
            background: CHART_THEME.tooltip.background,
            border: `1px solid ${CHART_THEME.tooltip.border}`,
            borderRadius: CHART_THEME.radius,
          }} />
          <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
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
  if (items.length === 0) return <p className="text-sm text-gray-500">No data</p>;

  return (
    <div data-testid="errors-chart" className="h-64 w-full" role="img"
      aria-label={`Top errors chart: ${items.map((i) => `${i.errorCode} (${i.count})`).join(', ')}`}>
      <ResponsiveContainer>
        <BarChart data={items} layout="vertical" margin={{ left: 80, right: 20, top: 5, bottom: 5 }}>
          <XAxis type="number" stroke={CHART_THEME.axis} fontSize={CHART_THEME.fontSize} />
          <YAxis type="category" dataKey="errorCode" stroke={CHART_THEME.axis} fontSize={CHART_THEME.fontSize} width={75} />
          <Tooltip contentStyle={{
            background: CHART_THEME.tooltip.background,
            border: `1px solid ${CHART_THEME.tooltip.border}`,
            borderRadius: CHART_THEME.radius,
          }} />
          <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
