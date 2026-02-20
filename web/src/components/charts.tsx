'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface IntentsProps {
  data: { intent: string; count: number }[];
}

export function IntentsChart({ data }: IntentsProps) {
  const items = data.slice(0, 8);
  if (items.length === 0) return <p className="text-sm text-gray-500">No data</p>;

  return (
    <div data-testid="intents-chart" style={{ width: '100%', height: 250 }}>
      <ResponsiveContainer>
        <BarChart data={items} layout="vertical" margin={{ left: 60, right: 20, top: 5, bottom: 5 }}>
          <XAxis type="number" stroke="#6b7280" fontSize={12} />
          <YAxis type="category" dataKey="intent" stroke="#6b7280" fontSize={12} width={55} />
          <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 6 }} />
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
    <div data-testid="errors-chart" style={{ width: '100%', height: 250 }}>
      <ResponsiveContainer>
        <BarChart data={items} layout="vertical" margin={{ left: 80, right: 20, top: 5, bottom: 5 }}>
          <XAxis type="number" stroke="#6b7280" fontSize={12} />
          <YAxis type="category" dataKey="errorCode" stroke="#6b7280" fontSize={12} width={75} />
          <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 6 }} />
          <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
