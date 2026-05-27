'use client';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

export interface ChartPoint {
  date: string;       // "1", "2", … "27"
  fullDate: string;   // "May 1, 2026"
  proceeds: number;
  commission: number;
  gross: number;
}

function fmtK(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}
function fmtFull(v: number) {
  return 'UGX ' + new Intl.NumberFormat('en-UG').format(v);
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as ChartPoint;
  return (
    <div style={{
      background: '#1e1e1e', border: '1px solid #333', borderRadius: 10,
      padding: '10px 14px', fontSize: 12,
    }}>
      <p style={{ color: '#888', marginBottom: 8, fontWeight: 600 }}>{d.fullDate}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'space-between' }}>
          <span style={{ color: '#888' }}>Agent Commission</span>
          <span style={{ color: '#9ca3af', fontWeight: 600 }}>{fmtFull(d.commission)}</span>
        </div>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'space-between' }}>
          <span style={{ color: '#888' }}>Net Proceeds</span>
          <span style={{ color: '#1D9E75', fontWeight: 600 }}>{fmtFull(d.proceeds)}</span>
        </div>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'space-between' }}>
          <span style={{ color: '#888' }}>Total Gross</span>
          <span style={{ color: '#14b8a6', fontWeight: 600 }}>{fmtFull(d.gross)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Custom legend ─────────────────────────────────────────────────────────────
function CustomLegend() {
  return (
    <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginTop: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#888' }}>
        <span style={{ width: 10, height: 10, background: '#1D9E75', borderRadius: 2, display: 'inline-block' }} />
        Proceeds
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#888' }}>
        <span style={{ width: 16, height: 2, background: '#9ca3af', display: 'inline-block' }} />
        Commission
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#888' }}>
        <span style={{ width: 16, height: 2, background: '#14b8a6', display: 'inline-block' }} />
        Gross Revenue
      </div>
    </div>
  );
}

// ── Chart ─────────────────────────────────────────────────────────────────────
export default function RevenueChart({ data }: { data: ChartPoint[] }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#555' }}
            axisLine={false} tickLine={false}
            interval={data.length > 20 ? 2 : 0}
          />
          <YAxis
            tickFormatter={fmtK}
            tick={{ fontSize: 10, fill: '#555' }}
            axisLine={false} tickLine={false}
            width={42}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="proceeds" fill="#1D9E75" radius={[3, 3, 0, 0]} maxBarSize={22} name="Proceeds" />
          <Line dataKey="commission" stroke="#9ca3af" strokeWidth={1.5} dot={false} name="Commission" />
          <Line dataKey="gross"      stroke="#14b8a6" strokeWidth={1.5} dot={false} name="Gross Revenue" />
        </ComposedChart>
      </ResponsiveContainer>
      <CustomLegend />
    </div>
  );
}
