'use client';
import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, Users, Percent, Download } from 'lucide-react';

/* ── design tokens ── */
const BG   = '#050d1f';
const CARD = '#0a1628';
const BD   = '1px solid #1a2540';
const TXT  = '#f1f5f9';
const DIM  = '#475569';
const ROW  = '#111e36';

function fmtUGX(n: number) {
  if (!n) return 'UGX 0';
  if (n >= 1_000_000) return `UGX ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `UGX ${(n / 1_000).toFixed(0)}K`;
  return `UGX ${Number(n).toLocaleString()}`;
}

const TT = {
  contentStyle: { background: '#0f1f38', border: '1px solid #1a2540', borderRadius: 8, fontSize: 11, color: '#e2e8f0' },
  labelStyle:   { color: '#64748b' },
  cursor:       { fill: 'rgba(14,165,233,0.04)' },
};

function KPI({ label, value, sub, color = '#0ea5e9', icon: Icon }: any) {
  return (
    <div style={{ background: CARD, border: BD, borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 10, color: DIM, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={13} style={{ color }} />
        </div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: TXT, letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#334155', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export default function SuperadminRevenuePage() {
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range,   setRange]   = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    setLoading(true);
    const token = localStorage.getItem('sa_token');
    const days  = { '7d': 7, '30d': 30, '90d': 90 }[range];
    const from  = new Date(Date.now() - days * 86_400_000).toISOString();
    fetch(`/api/superadmin/revenue?from=${from}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [range]);

  const summary  = data?.summary  || {};
  const byTenant = data?.byTenant || [];
  const daily    = data?.daily    || [];

  return (
    <div style={{ background: BG, minHeight: '100vh', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif', padding: '24px 28px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: TXT, margin: '0 0 4px', letterSpacing: '-0.3px' }}>Revenue</h1>
          <p style={{ fontSize: 12, color: DIM, margin: 0 }}>Platform-wide financial overview</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', gap: 2, background: CARD, border: BD, borderRadius: 8, padding: 3 }}>
            {(['7d', '30d', '90d'] as const).map(r => (
              <button key={r} onClick={() => setRange(r)} style={{
                padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                background: range === r ? '#0ea5e9' : 'none',
                color:      range === r ? '#fff'    : DIM,
              }}>{r}</button>
            ))}
          </div>
          <button style={{ background: 'none', border: BD, color: DIM, borderRadius: 8, padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
        <KPI label="Total Revenue"  value={fmtUGX(parseFloat(summary.total_fees   || 0))} icon={DollarSign} color="#0ea5e9" sub={`Last ${range}`} />
        <KPI label="Platform Fees"  value={fmtUGX(parseFloat(summary.platform_fees || 0))} icon={Percent}    color="#8b5cf6" sub="iCube share" />
        <KPI label="Tenant Payouts" value={fmtUGX(parseFloat(summary.tenant_payouts || 0))} icon={TrendingUp} color="#22c55e" sub="To tenants" />
        <KPI label="Active Tenants" value={summary.active_tenants ?? '—'}                   icon={Users}      color="#f59e0b" sub="With transactions" />
      </div>

      {/* Revenue area chart */}
      <div style={{ background: CARD, border: BD, borderRadius: 12, padding: '18px 20px', marginBottom: 14 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: TXT, margin: '0 0 16px' }}>Daily Revenue Trend</p>
        {loading ? (
          <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 20, height: 20, border: '2px solid #0ea5e9', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : daily.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={daily} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#0ea5e9" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={ROW} />
              <XAxis dataKey="date" tick={{ fill: '#334155', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#334155', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip {...TT} formatter={(v: any) => [fmtUGX(Number(v)), 'Revenue']} />
              <Area type="monotone" dataKey="amount" stroke="#0ea5e9" fill="url(#gRev)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: 13 }}>
            No revenue data for this range yet
          </div>
        )}
      </div>

      {/* Top tenants */}
      <div style={{ background: CARD, border: BD, borderRadius: 12, padding: '18px 20px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: TXT, margin: '0 0 16px' }}>Top Tenants by Revenue</p>
        {byTenant.length === 0 ? (
          <p style={{ color: '#334155', fontSize: 13 }}>No data yet</p>
        ) : byTenant.slice(0, 8).map((t: any, i: number) => {
          const max = parseFloat(byTenant[0]?.total_fees || 1);
          const val = parseFloat(t.total_fees || 0);
          const pct = max > 0 ? (val / max) * 100 : 0;
          return (
            <div key={t.tenant_id} style={{ marginBottom: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: '#334155', fontWeight: 700, minWidth: 16 }}>{i + 1}</span>
                  <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>{t.tenant_name || `Tenant ${i + 1}`}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: TXT }}>{fmtUGX(val)}</span>
              </div>
              <div style={{ height: 4, background: ROW, borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: `hsl(${200 + i * 16},75%,52%)`, borderRadius: 99, transition: 'width 0.6s' }} />
              </div>
            </div>
          );
        })}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
