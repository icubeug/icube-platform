'use client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartPoint { day: string; avg_minutes: number; }

export default function AreaChartWidget({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="#1e1e1e" vertical={false} />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 10, fill: '#555' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#555' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: 8, fontSize: 11, color: '#aaa' }}
          labelStyle={{ color: '#888' }}
        />
        <Area
          dataKey="avg_minutes"
          fill="rgba(239,68,68,0.15)"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
          name="Avg Minutes"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
