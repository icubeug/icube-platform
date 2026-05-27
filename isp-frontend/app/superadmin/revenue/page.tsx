'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

function fmtUGX(n: number) {
  if (n >= 1_000_000) return `UGX ${(n/1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `UGX ${(n/1_000).toFixed(1)}K`;
  return `UGX ${Number(n).toLocaleString()}`;
}

export default function SuperadminRevenuePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<'7d'|'30d'|'90d'>('30d');

  useEffect(() => {
    const token = localStorage.getItem('sa_token');
    const fromMap = { '7d': 7, '30d': 30, '90d': 90 };
    const days = fromMap[range];
    const from = new Date(Date.now() - days*24*60*60*1000).toISOString();
    fetch(`/api/superadmin/revenue?from=${from}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.json()).then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [range]);

  const summary   = data?.summary || {};
  const byTenant  = data?.byTenant || [];
  const bySource  = data?.bySource || [];
  const daily     = (data?.daily || []).map((d: any) => ({
    day: d.day, fees: parseFloat(d.fees), gross: parseFloat(d.gross),
  }));

  return (
    <div style={{ minHeight: '100vh', background: '#080808', padding: '24px 28px', color: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Revenue</h1>
          <p style={{ fontSize: 12, color: '#444', margin: 0 }}>Platform fee income from all tenants</p>
        </div>
        <div style={{ display: 'flex', gap: 4, background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: 3 }}>
          {(['7d','30d','90d'] as const).map(r => (
            <button key={r} onClick={() => setRange(r)}
              style={{ padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', background: range === r ? '#6366f1' : 'transparent', color: range === r ? '#fff' : '#555' }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}>
          <div style={{ width: 22, height: 22, border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Gross Volume', value: fmtUGX(parseFloat(summary.gross || 0)) },
              { label: 'Platform Fees', value: fmtUGX(parseFloat(summary.fees || 0)), highlight: true },
              { label: 'Net to Tenants', value: fmtUGX(parseFloat(summary.net || 0)) },
              { label: 'Transactions', value: String(summary.transactions || 0) },
            ].map(k => (
              <div key={k.label} style={{ background: '#111', border: `1px solid ${k.highlight ? '#6366f1' : '#1e1e1e'}`, borderRadius: 12, padding: '18px 20px' }}>
                <p style={{ fontSize: 10, color: '#444', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 8px' }}>{k.label}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: k.highlight ? '#a5b4fc' : '#fff', margin: 0 }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 24 }}>
            {/* Daily fees */}
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '20px 20px 12px' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: '0 0 16px' }}>Daily Fees</p>
              {daily.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                    <XAxis dataKey="day" tick={{ fill: '#444', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#444', fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                    <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: any) => [fmtUGX(v), 'Fees']} />
                    <Bar dataKey="fees" fill="#6366f1" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: 12 }}>
                  No revenue data for this period
                </div>
              )}
            </div>

            {/* By source */}
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, padding: '20px' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: '0 0 16px' }}>By Source</p>
              {bySource.map((s: any) => (
                <div key={s.source} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: '#aaa', textTransform: 'capitalize' }}>{s.source}</span>
                    <span style={{ fontSize: 12, color: '#6366f1', fontWeight: 600 }}>{fmtUGX(parseFloat(s.fees))}</span>
                  </div>
                  <div style={{ height: 5, background: '#1e1e1e', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '60%', background: '#6366f1', borderRadius: 99 }} />
                  </div>
                  <p style={{ fontSize: 10, color: '#444', margin: '3px 0 0' }}>{s.count} transactions</p>
                </div>
              ))}
              {bySource.length === 0 && <p style={{ fontSize: 12, color: '#333' }}>No data</p>}
            </div>
          </div>

          {/* Top tenants by revenue */}
          <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a1a1a' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Top Tenants by Revenue</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0d0d0d' }}>
                  {['#', 'Tenant', 'Fees Generated', 'Transactions'].map(h => (
                    <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, color: '#444', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byTenant.slice(0,10).map((t: any, i: number) => (
                  <tr key={t.tenant_id} style={{ borderTop: '1px solid #1a1a1a' }}>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#444' }}>#{i+1}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <a href={`/superadmin/tenants/${t.tenant_id}`} style={{ fontSize: 13, fontWeight: 600, color: '#a5b4fc', textDecoration: 'none' }}>
                        {t.tenant_name}
                      </a>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#1D9E75' }}>
                      {fmtUGX(parseFloat(t.fees))}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#888' }}>{t.tx_count}</td>
                  </tr>
                ))}
                {byTenant.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: '#333', fontSize: 12 }}>No revenue data yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
