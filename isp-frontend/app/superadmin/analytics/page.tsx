'use client';
import { useEffect, useState } from 'react';
import {
  TrendingUp, Users, Wifi, DollarSign, Activity,
  BarChart3, Download, Calendar, RefreshCw,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const RANGE_OPTIONS = [
  { label: '7 days',  value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '3 months',value: '90d' },
  { label: '1 year',  value: '1y'  },
];

function fmtUGX(n: number) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function KPI({ label, value, sub, color = '#0ea5e9', icon: Icon }: any) {
  return (
    <div style={{ background: '#0a1628', border: '1px solid #1a2540', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 10, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={13} style={{ color }} />
        </div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#334155', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

const CHART_STYLE = {
  background: '#0a1628', border: '1px solid #1a2540', borderRadius: 12, padding: '18px 20px',
};
const TOOLTIP_STYLE = {
  contentStyle: { background: '#0f1f38', border: '1px solid #1a2540', borderRadius: 8, fontSize: 11 },
  labelStyle: { color: '#94a3b8' },
};

// Generate mock daily data until the API returns real data
function mockDaily(days: number) {
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const base = 2_000_000 + Math.random() * 3_000_000;
    data.push({
      day: d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      revenue: Math.round(base),
      subscribers: Math.floor(200 + Math.random() * 400),
      routers:     Math.floor(10  + Math.random() * 30),
      vouchers:    Math.floor(50  + Math.random() * 200),
    });
  }
  return data;
}

export default function SuperadminAnalyticsPage() {
  const [range,   setRange]   = useState('30d');
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const token = localStorage.getItem('sa_token');
      try {
        const res = await fetch(`/api/superadmin/revenue?range=${range}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) { const d = await res.json(); setData(d); }
      } catch { /* use mock data */ }
      setLoading(false);
    }
    load();
  }, [range]);

  const days   = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
  const daily  = data?.daily || mockDaily(days);
  const stats  = data?.stats || {};
  const top    = data?.top_tenants || [];

  const totalRev  = daily.reduce((s: number, d: any) => s + (parseFloat(d.revenue || d.amount || 0)), 0);
  const totalSubs = daily.reduce((s: number, d: any) => s + (parseInt(d.subscribers || 0)), 0);
  const totalVou  = daily.reduce((s: number, d: any) => s + (parseInt(d.vouchers || 0)), 0);

  return (
    <div style={{ background: '#060c1a', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif', padding: '20px 28px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px', letterSpacing: '-0.3px' }}>Platform Analytics</h1>
          <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>Revenue · Subscribers · Growth · Bandwidth</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Range selector */}
          <div style={{ display: 'flex', gap: 2, background: '#0a1628', border: '1px solid #1a2540', borderRadius: 8, padding: 3 }}>
            {RANGE_OPTIONS.map(r => (
              <button key={r.value} onClick={() => setRange(r.value)}
                style={{ padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', background: range === r.value ? '#0ea5e9' : 'none', color: range === r.value ? '#fff' : '#475569', transition: 'all 0.15s' }}>
                {r.label}
              </button>
            ))}
          </div>
          <button style={{ background: 'none', border: '1px solid #1a2540', color: '#64748b', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <KPI label="Total Revenue"      value={`UGX ${fmtUGX(totalRev)}`}                icon={DollarSign} color="#0ea5e9" sub={`Over last ${days} days`} />
        <KPI label="New Subscribers"    value={stats.new_subscribers ?? totalSubs}        icon={Users}      color="#22c55e" sub="Unique activations" />
        <KPI label="Vouchers Sold"      value={stats.vouchers_sold ?? totalVou}           icon={Activity}   color="#8b5cf6" sub="Across all tenants" />
        <KPI label="Active Tenants"     value={stats.active_tenants ?? '—'}               icon={TrendingUp} color="#f59e0b" sub="With at least 1 router" />
      </div>

      {/* Revenue Area Chart */}
      <div style={{ ...CHART_STYLE, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 7 }}>
            <BarChart3 size={14} style={{ color: '#0ea5e9' }} /> Revenue Trend
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#475569' }}>
            <span style={{ color: '#0ea5e9' }}>● Revenue</span>
            <span style={{ color: '#8b5cf6' }}>● Vouchers</span>
          </div>
        </div>
        {loading ? (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 20, height: 20, border: '2px solid #0ea5e9', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={daily} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#0ea5e9" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gVou" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#8b5cf6" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#111e36" />
              <XAxis dataKey="day" tick={{ fill: '#334155', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#334155', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${fmtUGX(v)}`} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: any, n: string) => [`UGX ${Number(v).toLocaleString()}`, n]} />
              <Area type="monotone" dataKey="revenue"  stroke="#0ea5e9" fill="url(#gRev)" strokeWidth={2} dot={false} name="Revenue" />
              <Area type="monotone" dataKey="vouchers" stroke="#8b5cf6" fill="url(#gVou)" strokeWidth={1.5} dot={false} name="Vouchers" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Row: Subscriber Growth + Top Tenants */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        <div style={CHART_STYLE}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Users size={14} style={{ color: '#22c55e' }} /> Subscriber Growth
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={daily} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#111e36" />
              <XAxis dataKey="day" tick={{ fill: '#334155', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#334155', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="subscribers" stroke="#22c55e" strokeWidth={2} dot={false} name="New Subs" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={CHART_STYLE}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
            <TrendingUp size={14} style={{ color: '#f59e0b' }} /> Top Tenants by Revenue
          </div>
          {top.length > 0 ? top.slice(0, 6).map((t: any, i: number) => {
            const maxFee = parseFloat(top[0]?.fees || top[0]?.revenue || 1);
            const fee    = parseFloat(t.fees || t.revenue || 0);
            const pct    = maxFee > 0 ? (fee / maxFee) * 100 : 0;
            return (
              <div key={t.id} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                  <span style={{ color: '#94a3b8' }}>{i + 1}. {t.name || t.tenant_name}</span>
                  <span style={{ color: '#f1f5f9', fontWeight: 700 }}>UGX {fmtUGX(fee)}</span>
                </div>
                <div style={{ height: 4, background: '#111e36', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: `hsl(${220 + i * 20},80%,60%)`, borderRadius: 99 }} />
                </div>
              </div>
            );
          }) : (
            // Placeholder bars
            ['NetLink Uganda','HotelWifi Pro','SchoolNet','FiberTech','CampusNet'].map((name, i) => {
              const pct = 100 - i * 18;
              return (
                <div key={name} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                    <span style={{ color: '#94a3b8' }}>{i + 1}. {name}</span>
                    <span style={{ color: '#f1f5f9', fontWeight: 700 }}>UGX {fmtUGX((5 - i) * 3_500_000)}</span>
                  </div>
                  <div style={{ height: 4, background: '#111e36', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: `hsl(${200 + i * 20},80%,55%)`, borderRadius: 99 }} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Router Growth bar chart */}
      <div style={CHART_STYLE}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 7 }}>
          <Wifi size={14} style={{ color: '#0ea5e9' }} /> Router Onboarding Activity
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={daily.slice(-14)} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#111e36" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: '#334155', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#334155', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Bar dataKey="routers" fill="#0ea5e9" radius={[3,3,0,0]} name="New Routers" opacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
