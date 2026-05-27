'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { api, SupportIntelligence } from '@/lib/api';
import { Info, TrendingUp, AlertCircle } from 'lucide-react';

const AreaChartWidget = dynamic(() => import('./AreaChartWidget'), { ssr: false });

// ── Utility functions ──────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

// ── Status badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === 'active' || status === 'used') {
    return (
      <span style={{ background: 'rgba(29,158,117,0.15)', color: '#34d399', fontSize: 10, borderRadius: 9999, padding: '2px 8px', fontWeight: 600, whiteSpace: 'nowrap' }}>
        Logged In
      </span>
    );
  }
  if (status === 'expired') {
    return (
      <span style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', fontSize: 10, borderRadius: 9999, padding: '2px 8px', fontWeight: 600, whiteSpace: 'nowrap' }}>
        Expired
      </span>
    );
  }
  return (
    <span style={{ background: '#1e1e1e', color: '#666', fontSize: 10, borderRadius: 9999, padding: '2px 8px', fontWeight: 600, whiteSpace: 'nowrap' }}>
      Never Logged In
    </span>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function SupportPage() {
  const [data, setData] = useState<SupportIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.support.intelligence()
      .then(setData)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredFeed = data?.feed?.filter(item => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      item.code?.toLowerCase().includes(q) ||
      item.customer_phone?.toLowerCase().includes(q) ||
      item.package_name?.toLowerCase().includes(q)
    );
  }).slice(0, 30) ?? [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f0f0f' }}>
        <div className="w-6 h-6 rounded-full border-2 border-[#1D9E75] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Support Intelligence Hub</h1>
        <span className="text-xs" style={{ color: '#666' }}>Monitor and manage customer support operations</span>
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 text-sm text-red-400"
          style={{ background: '#2a1515', border: '1px solid #4a2020', borderRadius: 8, padding: '10px 14px' }}>
          <AlertCircle size={14} />{error}
        </div>
      )}

      {/* ── 4 stat cards ── */}
      <div className="grid grid-cols-4 gap-4 mb-6">

        {/* Card 1: Avg Login Time */}
        <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '20px 24px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 16, right: 16 }}>
            <Info size={12} color="#444" />
          </div>
          <p className="text-3xl font-bold text-white">
            {data?.avg_login_minutes ?? '—'}
            <span className="text-xl font-normal" style={{ color: '#666' }}>m</span>
          </p>
          <p className="text-[10px] mt-2" style={{ color: '#555' }}>Avg time from purchase to first login (30 d)</p>
        </div>

        {/* Card 2: Login Rate */}
        <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '20px 24px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 16, right: 16 }}>
            <TrendingUp size={12} color="#1D9E75" />
          </div>
          <p className="text-3xl font-bold text-white">{data?.login_rate ?? '—'}%</p>
          <p className="text-[10px] mt-2" style={{ color: '#555' }}>Provisional vouchers utilised in the last 30 days</p>
        </div>

        {/* Card 3: Never Logged In */}
        <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '20px 24px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 16, right: 16 }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#ef4444' }} />
          </div>
          <p className="text-3xl font-bold text-white">{data?.never_logged_in ?? '—'}</p>
          <p className="text-[10px] mt-2" style={{ color: '#555' }}>System vouchers created last 7 days, never used</p>
        </div>

        {/* Card 4: Expired Today */}
        <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '20px 24px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 16, right: 16 }}>
            <AlertCircle size={12} color="#f59e0b" />
          </div>
          <p className="text-3xl font-bold text-white">{data?.expired_today ?? '—'}</p>
          <p className="text-[10px] mt-2" style={{ color: '#555' }}>Vouchers that expired or were cleaned up today</p>
        </div>
      </div>

      {/* ── Main 2-column area ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '55% 1fr', gap: 20 }}>

        {/* LEFT: Activity Feed */}
        <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '20px 24px' }}>
          <input
            type="text"
            placeholder="Phone / Code / Name / TxD..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs mb-3"
            style={{
              background: '#111',
              border: '1px solid #2a2a2a',
              borderRadius: 8,
              padding: '8px 12px',
              color: '#aaa',
              outline: 'none',
            }}
          />
          <div style={{ overflowY: 'auto', maxHeight: 400, scrollbarWidth: 'none' }}>
            {filteredFeed.length === 0 ? (
              <p className="text-xs text-center py-8" style={{ color: '#555' }}>No data</p>
            ) : (
              filteredFeed.map((item, i) => (
                <FeedRow key={`${item.code}-${i}`} item={item} />
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Paid, Never Connected */}
        <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '20px 24px' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-bold text-white">Paid, Never Connected</span>
            <span style={{ background: '#1e1e1e', color: '#888', fontSize: 10, borderRadius: 9999, padding: '2px 8px' }}>
              {data?.paid_never_connected?.length ?? 0} total
            </span>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 400, scrollbarWidth: 'none' }}>
            {(data?.paid_never_connected ?? []).length === 0 ? (
              <p className="text-xs text-center py-8" style={{ color: '#555' }}>No data</p>
            ) : (
              (data?.paid_never_connected ?? []).map((item, i) => (
                <PaidNeverRow key={i} item={item} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom: Avg Time to First Login Chart ── */}
      <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '20px 24px', marginTop: 20 }}>
        <p className="text-sm font-bold text-white mb-1">Avg. Time to First Login</p>
        <p className="text-[11px] mb-4" style={{ color: '#555' }}>Last 7 days, in minutes</p>
        {data?.chart && <AreaChartWidget data={data.chart} />}
      </div>
    </div>
  );
}

// ── Feed row ───────────────────────────────────────────────────────────────────
function FeedRow({ item }: { item: SupportIntelligence['feed'][number] }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="flex items-center gap-3 py-2"
      style={{ borderBottom: '1px solid #1e1e1e', background: hovered ? '#1e1e1e' : 'transparent', transition: 'background 150ms' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Code + package */}
      <div style={{ minWidth: 80 }}>
        <p style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#1D9E75' }}>{item.code}</p>
        <p style={{ fontSize: 10, color: '#666' }}>{item.package_name || '—'}</p>
      </div>
      {/* Phone + use_case */}
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 11, color: '#fff' }}>{item.customer_phone || '—'}</p>
        <p style={{ fontSize: 10, color: '#555' }}>{item.use_case || '—'}</p>
      </div>
      {/* Time */}
      <p style={{ fontSize: 10, color: '#555', flexShrink: 0 }}>{timeAgo(item.created_at)}</p>
      {/* Status */}
      <div style={{ flexShrink: 0 }}>
        <StatusBadge status={item.status} />
      </div>
    </div>
  );
}

// ── Paid never connected row ───────────────────────────────────────────────────
function PaidNeverRow({ item }: { item: SupportIntelligence['paid_never_connected'][number] }) {
  const daysAgo = Math.floor((Date.now() - new Date(item.created_at).getTime()) / 86_400_000);
  return (
    <div className="py-2" style={{ borderBottom: '1px solid #1e1e1e' }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>
        {item.customer_name || item.customer_phone || '—'}
      </p>
      <p style={{ fontSize: 10, color: '#666' }}>
        {item.package_name || '—'} {item.method ? `· ${item.method}` : ''}
      </p>
      <p style={{ fontSize: 10, color: '#555' }}>Purchased {daysAgo}d ago</p>
    </div>
  );
}
