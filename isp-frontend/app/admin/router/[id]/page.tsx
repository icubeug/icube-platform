'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { api, RouterAnalytics } from '@/lib/api';
import { ArrowLeft, Cpu, Users, Activity, Wifi } from 'lucide-react';

const {
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} = require('recharts');

function StatBadge({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10, padding: '14px 18px' }}>
      <p style={{ fontSize: 10, color: '#555', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 700, color, margin: 0 }}>{value}</p>
    </div>
  );
}

const CHART_STYLES = {
  background: '#131313',
  border: '1px solid #1e1e1e',
  borderRadius: 12,
  padding: '20px',
  marginBottom: 16,
};

export default function RouterAnalyticsPage() {
  const { id } = useParams<{ id: string }>();
  const [data,    setData]    = useState<RouterAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!id) return;
    api.routers.analytics(id)
      .then(d => { setData(d); setLoading(false); })
      .catch((e: any) => { setError(e.message); setLoading(false); });
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 20, height: 20, border: '2px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error || !data) return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', padding: '24px 28px', color: '#f87171' }}>
      <a href="/admin/router" style={{ color: '#444', textDecoration: 'none', fontSize: 12 }}>← Back</a>
      <p style={{ marginTop: 16 }}>{error || 'Router not found'}</p>
    </div>
  );

  const { router, series, summary } = data;
  const hasData = series.length > 0;

  const tooltipStyle = {
    backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a',
    borderRadius: 8, fontSize: 11, color: '#ccc',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', padding: '24px 28px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Back */}
      <a href="/admin/router" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#444', fontSize: 12, textDecoration: 'none', marginBottom: 16 }}>
        <ArrowLeft size={13} /> All Routers
      </a>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>{router.name}</h1>
        <p style={{ fontSize: 12, color: '#555', margin: 0 }}>
          {router.model_name || 'MikroTik'} · {router.tier_name} · {router.vpn_address || 'No VPN'} · Last 24 hours
        </p>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatBadge label="Avg CPU"    value={`${summary.avg_cpu}%`}  color="#2563eb" />
        <StatBadge label="Peak Users" value={summary.peak_users}      color="#22c55e" />
        <StatBadge label="Max Users"  value={router.max_users}        color="#f59e0b" />
        <StatBadge label="Data Points" value={summary.total_points}   color="#888"    />
      </div>

      {/* Router config */}
      <div style={{ background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[
          ['Tier',      router.tier_name  || '—'],
          ['Network',   router.network_address ? `${router.network_address}/${router.subnet_prefix}` : '—'],
          ['Gateway',   router.gateway_ip || '—'],
          ['VPN',       router.vpn_address || '—'],
        ].map(([k, v]) => (
          <div key={k}>
            <p style={{ fontSize: 9, color: '#555', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</p>
            <p style={{ fontSize: 12, color: '#aaa', margin: 0, fontFamily: 'monospace' }}>{v}</p>
          </div>
        ))}
      </div>

      {!hasData ? (
        <div style={{ background: '#131313', border: '1px solid #1e1e1e', borderRadius: 12, padding: '64px 24px', textAlign: 'center' }}>
          <Activity size={40} color="#333" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 13, color: '#555' }}>No heartbeat data in the last 24 hours.</p>
          <p style={{ fontSize: 12, color: '#444', marginTop: 4 }}>The router must send heartbeats every 5 minutes for analytics to appear.</p>
        </div>
      ) : (
        <>
          {/* CPU chart */}
          <div style={CHART_STYLES}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Cpu size={14} color="#2563eb" /> CPU Load (%)
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={series} margin={{ left: -10, right: 10, top: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                <XAxis dataKey="time_label" tick={{ fontSize: 10, fill: '#555' }} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#555' }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v}%`, 'CPU']} />
                <Line type="monotone" dataKey="cpu_load" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Memory chart */}
          <div style={CHART_STYLES}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Activity size={14} color="#8b5cf6" /> Memory Usage (%)
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={series} margin={{ left: -10, right: 10, top: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                <XAxis dataKey="time_label" tick={{ fontSize: 10, fill: '#555' }} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#555' }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${v}%`, 'Memory']} />
                <Line type="monotone" dataKey="memory_used" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Active users chart */}
          <div style={CHART_STYLES}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users size={14} color="#22c55e" /> Active Users
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={series} margin={{ left: -10, right: 10, top: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                <XAxis dataKey="time_label" tick={{ fontSize: 10, fill: '#555' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#555' }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [v, 'Users']} />
                <Area type="monotone" dataKey="active_users" stroke="#22c55e" strokeWidth={2} fill="url(#usersGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
