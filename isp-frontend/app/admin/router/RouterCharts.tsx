'use client';
import {
  ComposedChart, Area, Line, LineChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface SeriesPoint {
  time_label: string;
  cpu_load: number;
  memory_usage: number;
  active_users: number;
  bytes_in: number;
  bytes_out: number;
}

function fmtBytes(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)}MB`;
  if (bytes >= 1_000)     return `${(bytes / 1_000).toFixed(1)}KB`;
  return `${bytes}B`;
}

const tooltipStyle = {
  contentStyle: { background: '#1e1e1e', border: '1px solid #333', borderRadius: 8, fontSize: 11, color: '#aaa' },
  labelStyle: { color: '#888' },
};

export function CpuMemoryChart({ data }: { data: SeriesPoint[] }) {
  return (
    <>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="#1e1e1e" vertical={false} />
          <XAxis dataKey="time_label" tick={{ fontSize: 10, fill: '#555' }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#555' }} axisLine={false} tickLine={false} />
          <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [`${v}%`, name]} />
          <Area dataKey="cpu_load" fill="rgba(29,158,117,0.1)" stroke="#1D9E75" strokeWidth={2} dot={false} name="CPU" />
          <Area dataKey="memory_usage" fill="rgba(96,165,250,0.1)" stroke="#60a5fa" strokeWidth={2} dot={false} name="Memory" />
        </ComposedChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-2" style={{ justifyContent: 'flex-end' }}>
        <span className="flex items-center gap-1 text-[10px]" style={{ color: '#888' }}>
          <span style={{ width: 10, height: 10, background: '#1D9E75', display: 'inline-block', borderRadius: 2 }} />
          CPU
        </span>
        <span className="flex items-center gap-1 text-[10px]" style={{ color: '#888' }}>
          <span style={{ width: 10, height: 10, background: '#60a5fa', display: 'inline-block', borderRadius: 2 }} />
          Memory
        </span>
      </div>
    </>
  );
}

export function NetworkTrafficChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
        <CartesianGrid stroke="#1e1e1e" vertical={false} />
        <XAxis dataKey="time_label" tick={{ fontSize: 10, fill: '#555' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#555' }} axisLine={false} tickLine={false} tickFormatter={fmtBytes} />
        <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [fmtBytes(v), name]} />
        <Line dataKey="bytes_in" stroke="#1D9E75" strokeWidth={2} dot={false} name="Download" />
        <Line dataKey="bytes_out" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 4" name="Upload" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ActiveUsersChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid stroke="#1e1e1e" vertical={false} />
        <XAxis dataKey="time_label" tick={{ fontSize: 10, fill: '#555' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#555' }} axisLine={false} tickLine={false} />
        <Tooltip {...tooltipStyle} />
        <Line dataKey="active_users" stroke="#f87171" strokeWidth={2} dot={false} name="Active Users" />
      </LineChart>
    </ResponsiveContainer>
  );
}
