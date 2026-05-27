'use client';
import { useEffect, useState } from 'react';
import { Users, TrendingUp, Wifi, Server, ArrowUpRight, Circle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function StatCard({ label, value, sub, color = '#1D9E75', icon: Icon }: any) {
  return (
    <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: '#555', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <p style={{ fontSize: 26, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: '#555', margin: 0 }}>{sub}</p>}
    </div>
  );
}

function fmtUGX(n: number) {
  if (n >= 1_000_000) return `UGX ${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `UGX ${(n/1_000).toFixed(0)}K`;
  return `UGX ${n}`;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#1D9E75', trial: '#f59e0b', suspended: '#ef4444', cancelled: '#555',
};

export default function SuperadminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sa_token');
    fetch('/api/superadmin/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 22, height: 22, border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const stats = data?.stats || {};
  const rev   = data?.revenue || {};
  const tenants = data?.tenants || [];
  const daily = (data?.dailyFees || []).map((d: any) => ({ day: d.day, amount: parseFloat(d.amount) }));

  return (
    <div style={{ minHeight: '100vh', background: '#080808', padding: '24px 28px', color: '#fff' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Platform Overview</h1>
        <p style={{ fontSize: 12, color: '#444', margin: 0 }}>iCube SaaS — live metrics</p>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Tenants" value={stats.total_tenants || 0} icon={Users}
          sub={`${stats.active_tenants || 0} active · ${stats.trial_tenants || 0} trial`} />
        <StatCard label="Revenue (All-time)" value={fmtUGX(parseFloat(rev.total_fees_all_time || 0))} icon={TrendingUp}
          sub={`${fmtUGX(parseFloat(rev.fees_this_month || 0))} this month`} color="#6366f1" />
        <StatCard label="VPN Routers Online" value={stats.vpn_online || 0} icon={Wifi}
          sub={`of ${stats.total_routers || 0} total routers`} color="#f59e0b" />
        <StatCard label="This Week" value={fmtUGX(parseFloat(rev.fees_this_week || 0))} icon={ArrowUpRight}
          sub="Platform fees collected" color="#1D9E75" />
      </div>

      {/* Revenue chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '20px 20px 12px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: '0 0 16px' }}>Daily Platform Fees (30 days)</p>
          {daily.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={daily}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis dataKey="day" tick={{ fill: '#444', fontSize: 10 }} />
                <YAxis tick={{ fill: '#444', fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [`UGX ${Number(v).toLocaleString()}`, 'Fees']}
                />
                <Area type="monotone" dataKey="amount" stroke="#6366f1" fill="url(#g1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: 12 }}>
              No fee data yet — fees appear when tenants make sales
            </div>
          )}
        </div>

        {/* Tenant status breakdown */}
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '20px' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: '0 0 16px' }}>Tenant Status</p>
          {[
            { key: 'active_tenants',    label: 'Active',    status: 'active' },
            { key: 'trial_tenants',     label: 'Trial',     status: 'trial' },
            { key: 'suspended_tenants', label: 'Suspended', status: 'suspended' },
          ].map(({ key, label, status }) => {
            const count = parseInt(stats[key] || 0);
            const total = parseInt(stats.total_tenants || 1);
            const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={key} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#aaa' }}>
                    <Circle size={8} style={{ color: STATUS_COLORS[status], fill: STATUS_COLORS[status] }} />
                    {label}
                  </span>
                  <span style={{ color: '#555' }}>{count} ({pct}%)</span>
                </div>
                <div style={{ height: 5, background: '#1e1e1e', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: STATUS_COLORS[status], borderRadius: 99, transition: 'width 0.5s' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent tenants */}
      <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0 }}>Recent Tenants</p>
          <a href="/superadmin/tenants" style={{ fontSize: 12, color: '#6366f1', textDecoration: 'none' }}>View all →</a>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0d0d0d' }}>
              {['Tenant', 'Plan', 'Status', 'Routers', 'Fees', 'Joined'].map(h => (
                <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, color: '#444', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tenants.map((t: any) => (
              <tr key={t.id} style={{ borderTop: '1px solid #1a1a1a' }}
                className="hover:bg-[#141414] cursor-pointer"
                onClick={() => window.location.href = `/superadmin/tenants/${t.id}`}>
                <td style={{ padding: '12px 16px' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', margin: 0 }}>{t.name}</p>
                  <p style={{ fontSize: 10, color: '#444', margin: 0 }}>{t.subdomain}</p>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: '#888', textTransform: 'capitalize' }}>{t.plan}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLORS[t.status] || '#555', background: `${STATUS_COLORS[t.status] || '#555'}18`, borderRadius: 99, padding: '2px 8px' }}>
                    {t.status}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: '#888' }}>{t.router_count}</td>
                <td style={{ padding: '12px 16px', fontSize: 12, color: '#aaa' }}>
                  {fmtUGX(parseFloat(t.fees_generated || 0))}
                </td>
                <td style={{ padding: '12px 16px', fontSize: 11, color: '#444' }}>
                  {new Date(t.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#333', fontSize: 12 }}>No tenants yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
