'use client';
import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { api, apiCall, AnalyticsUsage } from '@/lib/api';
import {
  BarChart2, Database, Users, Clock, Activity,
  TrendingUp, TrendingDown, Minus,
} from 'lucide-react';

// Recharts — loaded client-side only
const {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend,
} = require('recharts');

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtData(gb: number): string {
  if (gb >= 1000) return `${(gb / 1000).toFixed(2)} TB`;
  if (gb >= 1)    return `${gb.toFixed(2)} GB`;
  return `${(gb * 1024).toFixed(0)} MB`;
}

function fmtDuration(mins: number): string {
  if (mins < 1)   return '< 1m';
  if (mins < 60)  return `${Math.round(mins)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtSeconds(secs: number): string {
  return fmtDuration(secs / 60);
}

function trendPct(cur: number, prev: number): number {
  if (prev === 0) return cur > 0 ? 100 : 0;
  return ((cur - prev) / prev) * 100;
}

function fmtDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-UG', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ── Tooltip styles ─────────────────────────────────────────────────────────────
const TOOLTIP = {
  contentStyle: { background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12, color: '#ccc' },
  cursor: { fill: 'rgba(255,255,255,0.04)' },
};

// ── Termination cause colours ──────────────────────────────────────────────────
const TERM_COLORS: Record<string, string> = {
  'User-Request': '#22c55e',
  'Session-Timeout': '#ca8a04',
  'NAS-Request': '#2563eb',
  'NAS-Reboot': '#3b82f6',
  'Idle-Timeout': '#f59e0b',
  'Unknown': '#f87171',
  'Lost': '#f87171',
};
const PIE_FALLBACK = ['#2563eb', '#22c55e', '#ca8a04', '#f87171', '#8b5cf6', '#ec4899'];
function termColor(reason: string, idx: number): string {
  return TERM_COLORS[reason] || PIE_FALLBACK[idx % PIE_FALLBACK.length];
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon, value, label, trend,
}: { icon: React.ElementType; value: string; label: string; trend: number }) {
  const isPos = trend > 0.5;
  const isNeg = trend < -0.5;
  const pctStr = `${Math.abs(trend).toFixed(1)}%`;

  return (
    <div style={{ background: '#111111', border: '1px solid #1f1f1f', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <Icon size={18} color="#333" />
      </div>
      <p style={{ fontSize: 32, fontWeight: 700, color: '#fff', margin: '0 0 6px', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 12, color: '#888', margin: '0 0 10px' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
        {isPos ? <TrendingUp size={13} color="#22c55e" /> : isNeg ? <TrendingDown size={13} color="#f87171" /> : <Minus size={13} color="#555" />}
        <span style={{ color: isPos ? '#22c55e' : isNeg ? '#f87171' : '#555', fontWeight: 600 }}>
          {isPos ? '+' : isNeg ? '-' : ''}{pctStr}
        </span>
        <span style={{ color: '#555' }}>vs last period</span>
      </div>
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 3px' }}>{title}</p>
      <p style={{ fontSize: 12, color: '#555', margin: 0 }}>{subtitle}</p>
    </div>
  );
}

// ── Date range picker ─────────────────────────────────────────────────────────
type Range = '7d' | '30d' | '90d' | 'custom';
function buildDates(range: Range, customFrom: string, customTo: string): [string, string] {
  const now  = new Date();
  const to   = now.toISOString().slice(0, 10);
  if (range === 'custom') return [customFrom || to, customTo || to];
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const from = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  return [from, to];
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyChart({ height = 200 }: { height?: number }) {
  return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: 12 }}>
      No data yet — RADIUS sessions will appear here once users connect
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [data,       setData]       = useState<AnalyticsUsage | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [range,      setRange]      = useState<Range>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo,   setCustomTo]   = useState('');

  const EMPTY: AnalyticsUsage = {
    total_data_gb: 0, unique_users: 0, avg_session_minutes: 0, total_sessions: 0,
    prev_total_data_gb: 0, prev_unique_users: 0, prev_avg_session_minutes: 0, prev_total_sessions: 0,
    daily_usage: [], termination_reasons: [], top_users: [], package_usage: [], recent_sessions: [],
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [from, to] = buildDates(range, customFrom, customTo);
    try {
      const res = await apiCall(`/analytics/usage?from=${from}&to=${to}`);
      if (!res.ok) {
        console.error('[Analytics] API responded with', res.status);
        setData(EMPTY);
        return;
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        console.error('[Analytics] Non-JSON response (content-type:', ct, ')');
        setData(EMPTY);
        return;
      }
      setData(await res.json());
    } catch (e: any) {
      console.error('[Analytics] fetch error:', e.message);
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, customFrom, customTo]);

  useEffect(() => { load(); }, [load]);

  const d = data;
  const hasData = d && d.total_sessions > 0;

  const RANGES: { key: Range; label: string }[] = [
    { key: '7d',  label: 'Last 7 days'  },
    { key: '30d', label: 'Last 30 days' },
    { key: '90d', label: 'Last 90 days' },
    { key: 'custom', label: 'Custom'    },
  ];

  const inp: React.CSSProperties = {
    background: '#111', border: '1px solid #1f1f1f', borderRadius: 7,
    padding: '6px 10px', fontSize: 12, color: '#aaa', outline: 'none',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080808', padding: '24px 28px', color: '#fff' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(37,99,235,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart2 size={18} color="#2563eb" />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>Usage Analytics</h1>
            <p style={{ fontSize: 12, color: '#555', margin: '2px 0 0' }}>Usage analytics & insights</p>
          </div>
        </div>

        {/* Date range picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {RANGES.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)} style={{
              padding: '6px 12px', borderRadius: 7, fontSize: 12, cursor: 'pointer', fontWeight: range === r.key ? 600 : 400,
              background: range === r.key ? 'rgba(37,99,235,0.15)' : '#111',
              border: `1px solid ${range === r.key ? '#2563eb' : '#1f1f1f'}`,
              color: range === r.key ? '#60a5fa' : '#888',
            }}>{r.label}</button>
          ))}
          {range === 'custom' && (
            <>
              <input type="date" style={inp} value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
              <span style={{ fontSize: 12, color: '#555' }}>–</span>
              <input type="date" style={inp} value={customTo} onChange={e => setCustomTo(e.target.value)} />
            </>
          )}
        </div>
      </div>

      {/* Errors are caught and handled silently — empty state is shown instead */}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
          <div style={{ width: 24, height: 24, border: '2px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <>
          {/* ── SECTION 1: Stat cards ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
            <StatCard icon={Database}  value={fmtData(d?.total_data_gb || 0)}         label="Data consumed in period"       trend={trendPct(d?.total_data_gb || 0, d?.prev_total_data_gb || 0)} />
            <StatCard icon={Users}     value={(d?.unique_users || 0).toLocaleString()} label="Unique users in period"        trend={trendPct(d?.unique_users || 0, d?.prev_unique_users || 0)} />
            <StatCard icon={Clock}     value={fmtDuration(d?.avg_session_minutes || 0)} label="Average time per session"    trend={trendPct(d?.avg_session_minutes || 0, d?.prev_avg_session_minutes || 0)} />
            <StatCard icon={Activity}  value={(d?.total_sessions || 0).toLocaleString()} label="Total connections in period" trend={trendPct(d?.total_sessions || 0, d?.prev_total_sessions || 0)} />
          </div>

          {/* ── SECTION 2: Charts ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: 16, marginBottom: 24 }}>

            {/* Data usage over time — area chart */}
            <div style={{ background: '#111111', border: '1px solid #1f1f1f', borderRadius: 12, padding: '20px 20px 12px' }}>
              <SectionHeader title="Data Usage Over Time" subtitle="Daily data consumption across all hotspots" />
              {(!d?.daily_usage?.length) ? <EmptyChart height={220} /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={d.daily_usage} margin={{ left: -10, right: 8, top: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dataGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                    <XAxis dataKey="date" tick={{ fill: '#444', fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: '#444', fontSize: 10 }} tickFormatter={(v: number) => `${v.toFixed(1)}GB`} />
                    <Tooltip {...TOOLTIP} formatter={(v: unknown) => [`${(v as number).toFixed(3)} GB`, 'Data']} />
                    <Area type="monotone" dataKey="gb" stroke="#2563eb" strokeWidth={2} fill="url(#dataGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Session termination donut */}
            <div style={{ background: '#111111', border: '1px solid #1f1f1f', borderRadius: 12, padding: '20px 20px 12px' }}>
              <SectionHeader title="Session Termination" subtitle="How sessions end — helps identify network issues" />
              {(!d?.termination_reasons?.length) ? <EmptyChart height={220} /> : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={d.termination_reasons}
                        dataKey="count" nameKey="reason"
                        cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                        paddingAngle={2}
                      >
                        {d.termination_reasons.map((t, i) => (
                          <Cell key={t.reason} fill={termColor(t.reason, i)} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP.contentStyle} formatter={(v: unknown, n: unknown) => [v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 4 }}>
                    {d.termination_reasons.map((t, i) => (
                      <div key={t.reason} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: termColor(t.reason, i), flexShrink: 0 }} />
                        <span style={{ fontSize: 10, color: '#888' }}>{t.reason} ({t.pct}%)</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── SECTION 3: User activity ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

            {/* Top users table */}
            <div style={{ background: '#111111', border: '1px solid #1f1f1f', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid #1a1a1a' }}>
                <SectionHeader title="Top Data Users" subtitle="Users consuming the most data in the selected period" />
              </div>
              {(!d?.top_users?.length) ? <EmptyChart height={160} /> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#0d0d0d' }}>
                        {['#', 'Username', 'Data Used', 'Sessions', 'Last Seen'].map(h => (
                          <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, color: '#444', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {d.top_users.map((u, i) => (
                        <tr key={u.username} style={{ borderTop: '1px solid #1a1a1a' }}>
                          <td style={{ padding: '9px 14px', fontSize: 11, color: '#555', fontWeight: 600 }}>{i + 1}</td>
                          <td style={{ padding: '9px 14px', fontSize: 12, color: '#2563eb', fontFamily: 'monospace', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.username}</td>
                          <td style={{ padding: '9px 14px', fontSize: 12, color: '#fff', fontWeight: 600 }}>{fmtData(u.data_gb)}</td>
                          <td style={{ padding: '9px 14px', fontSize: 12, color: '#888' }}>{u.sessions}</td>
                          <td style={{ padding: '9px 14px', fontSize: 11, color: '#555', whiteSpace: 'nowrap' }}>{fmtDate(u.last_seen)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Package usage bar chart */}
            <div style={{ background: '#111111', border: '1px solid #1f1f1f', borderRadius: 12, padding: '18px 20px 12px' }}>
              <SectionHeader title="Data Usage Per Package" subtitle="Bandwidth consumption by package type" />
              {(!d?.package_usage?.length) ? <EmptyChart height={200} /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={d.package_usage} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#444', fontSize: 10 }} tickFormatter={(v: number) => `${v.toFixed(1)}GB`} />
                    <YAxis type="category" dataKey="package_name" tick={{ fill: '#888', fontSize: 11 }} width={90} />
                    <Tooltip {...TOOLTIP} formatter={(v: unknown) => [`${(v as number).toFixed(3)} GB`, 'Data']} />
                    <Bar dataKey="data_gb" radius={[0, 4, 4, 0]}>
                      {d.package_usage.map((_, i) => (
                        <Cell key={i} fill={['#2563eb','#3b82f6','#60a5fa','#93c5fd','#bfdbfe'][i % 5]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── SECTION 4: Recent sessions ── */}
          <div style={{ background: '#111111', border: '1px solid #1f1f1f', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #1a1a1a' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>Recent Sessions</p>
            </div>
            {(!d?.recent_sessions?.length) ? <EmptyChart height={140} /> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#0d0d0d' }}>
                      {['User','MAC Address','IP Address','Duration','Data Used','Package','Started','Ended','Status'].map(h => (
                        <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 10, color: '#444', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {d.recent_sessions.map((s, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #1a1a1a' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#161616')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ padding: '9px 14px', fontSize: 12, color: '#2563eb', fontFamily: 'monospace', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.username}</td>
                        <td style={{ padding: '9px 14px', fontSize: 11, color: '#555', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{s.mac_address || '—'}</td>
                        <td style={{ padding: '9px 14px', fontSize: 11, color: '#555', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{s.ip_address || '—'}</td>
                        <td style={{ padding: '9px 14px', fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>{fmtSeconds(s.duration_seconds)}</td>
                        <td style={{ padding: '9px 14px', fontSize: 12, color: '#fff', fontWeight: 500, whiteSpace: 'nowrap' }}>{fmtData(s.data_mb / 1024)}</td>
                        <td style={{ padding: '9px 14px', fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>{s.package_name}</td>
                        <td style={{ padding: '9px 14px', fontSize: 11, color: '#555', whiteSpace: 'nowrap' }}>{fmtDate(s.started)}</td>
                        <td style={{ padding: '9px 14px', fontSize: 11, color: '#555', whiteSpace: 'nowrap' }}>{fmtDate(s.ended)}</td>
                        <td style={{ padding: '9px 14px' }}>
                          {s.status === 'active'
                            ? <span style={{ fontSize: 10, fontWeight: 600, color: '#22c55e', background: 'rgba(34,197,94,0.1)', borderRadius: 99, padding: '2px 8px' }}>● Active</span>
                            : <span style={{ fontSize: 10, fontWeight: 600, color: '#555', background: '#1a1a1a', borderRadius: 99, padding: '2px 8px' }}>{s.terminate_cause || 'Ended'}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {!hasData && (
            <p style={{ fontSize: 12, color: '#333', textAlign: 'center', marginTop: 16 }}>
              No RADIUS session data for this period. Data appears once users connect through your hotspot.
            </p>
          )}
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
