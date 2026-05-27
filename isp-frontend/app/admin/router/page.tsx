'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { api, Router, RouterMetrics } from '@/lib/api';
import { Router as RouterIcon, AlertCircle, Info } from 'lucide-react';

const CpuMemoryChart   = dynamic(() => import('./RouterCharts').then(m => ({ default: m.CpuMemoryChart })),   { ssr: false });
const NetworkTrafficChart = dynamic(() => import('./RouterCharts').then(m => ({ default: m.NetworkTrafficChart })), { ssr: false });
const ActiveUsersChart = dynamic(() => import('./RouterCharts').then(m => ({ default: m.ActiveUsersChart })), { ssr: false });

type TimeRange = '1h' | '3h' | '6h' | '24h';

// ── Card wrapper ───────────────────────────────────────────────────────────────
function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={className}
      style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '20px 24px' }}
    >
      {children}
    </div>
  );
}

export default function RouterObservabilityPage() {
  const [routers, setRouters]           = useState<Router[]>([]);
  const [selectedRouterId, setSelectedRouterId] = useState<string>('');
  const [metrics, setMetrics]           = useState<RouterMetrics | null>(null);
  const [timeRange, setTimeRange]       = useState<TimeRange>('1h');
  const [loading, setLoading]           = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [error, setError]               = useState('');

  // Load router list on mount
  useEffect(() => {
    api.routers.list()
      .then(r => {
        setRouters(r);
        if (r.length > 0) setSelectedRouterId(r[0].id);
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Load metrics when router or range changes
  useEffect(() => {
    if (!selectedRouterId) return;
    setMetricsLoading(true);
    setError('');
    api.routers.metrics(selectedRouterId, timeRange)
      .then(setMetrics)
      .catch((e: any) => setError(e.message))
      .finally(() => setMetricsLoading(false));
  }, [selectedRouterId, timeRange]);

  const TIME_RANGES: TimeRange[] = ['1h', '3h', '6h', '24h'];

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>

      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 mb-6">
        <RouterIcon size={20} color="#1D9E75" />
        <h1 className="text-xl font-bold text-white">Router Observability</h1>
        {metrics?.router?.board_name && (
          <span className="text-[11px]" style={{ color: '#555' }}>{metrics.router.board_name}</span>
        )}
        <div className="flex-1" />

        {/* Router selector */}
        {routers.length > 0 && (
          <select
            value={selectedRouterId}
            onChange={e => setSelectedRouterId(e.target.value)}
            style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#aaa', padding: '6px 12px', borderRadius: 8, fontSize: 12, outline: 'none' }}
          >
            {routers.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        )}

        {/* Status badge */}
        {metrics?.router?.status === 'online' ? (
          <span style={{ background: 'rgba(29,158,117,0.15)', color: '#34d399', fontSize: 11, borderRadius: 9999, padding: '3px 10px', fontWeight: 600 }}>
            Online
          </span>
        ) : (
          <span style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: 11, borderRadius: 9999, padding: '3px 10px', fontWeight: 600 }}>
            Offline
          </span>
        )}

        <span className="text-[10px]" style={{ color: '#555' }}>last sync just now</span>

        {/* Time range buttons */}
        <div className="flex gap-1">
          {TIME_RANGES.map(r => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              style={{
                background: timeRange === r ? '#1D9E75' : '#1a1a1a',
                color: timeRange === r ? '#fff' : '#888',
                border: '1px solid #2a2a2a',
                borderRadius: 8,
                padding: '4px 12px',
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 150ms',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 text-sm text-red-400"
          style={{ background: '#2a1515', border: '1px solid #4a2020', borderRadius: 8, padding: '10px 14px' }}>
          <AlertCircle size={14} />{error}
        </div>
      )}

      {loading || (metricsLoading && !metrics) ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 rounded-full border-2 border-[#1D9E75] border-t-transparent animate-spin" />
        </div>
      ) : !metrics ? (
        <p className="text-center py-12 text-sm" style={{ color: '#555' }}>No router data available</p>
      ) : (
        <>
          {/* ── Stats row ── */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Uptime', value: metrics.stats.uptime },
              { label: 'Active Users', value: String(metrics.stats.active_users) },
              { label: 'CPU Load', value: `${metrics.stats.cpu_load}%` },
              { label: 'Memory Usage', value: `${metrics.stats.memory_usage}%` },
            ].map(stat => (
              <Card key={stat.label}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px]" style={{ color: '#555' }}>{stat.label}</p>
                  <Info size={12} color="#444" />
                </div>
                <p className="text-2xl font-bold text-white">{metricsLoading ? '—' : stat.value}</p>
              </Card>
            ))}
          </div>

          {/* ── Charts ── */}
          <div className="space-y-5">

            {/* CPU & Memory */}
            <Card>
              <p className="text-sm font-bold text-white mb-1">CPU &amp; Memory Usage</p>
              <p className="text-[11px] mb-4" style={{ color: '#555' }}>Real-time system resource usage</p>
              {metricsLoading
                ? <div className="flex items-center justify-center h-[200px]"><div className="w-5 h-5 rounded-full border-2 border-[#1D9E75] border-t-transparent animate-spin" /></div>
                : <CpuMemoryChart data={metrics.series} />
              }
            </Card>

            {/* Network Traffic */}
            <Card>
              <p className="text-sm font-bold text-white mb-1">Network Traffic Rate</p>
              <p className="text-[11px] mb-4" style={{ color: '#555' }}>Bytes in / out over time</p>
              {metricsLoading
                ? <div className="flex items-center justify-center h-[200px]"><div className="w-5 h-5 rounded-full border-2 border-[#1D9E75] border-t-transparent animate-spin" /></div>
                : <NetworkTrafficChart data={metrics.series} />
              }
            </Card>

            {/* Active Users Over Time */}
            <Card>
              <p className="text-sm font-bold text-white mb-1">Active Users Over Time</p>
              <p className="text-[11px] mb-4" style={{ color: '#555' }}>Connected sessions over the selected period</p>
              {metricsLoading
                ? <div className="flex items-center justify-center h-[180px]"><div className="w-5 h-5 rounded-full border-2 border-[#1D9E75] border-t-transparent animate-spin" /></div>
                : <ActiveUsersChart data={metrics.series} />
              }
            </Card>

          </div>
        </>
      )}
    </div>
  );
}
