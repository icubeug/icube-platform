'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Search, RefreshCw, Wifi, WifiOff, AlertTriangle, Activity,
  Cpu, MemoryStick, Globe, Clock, MapPin, Router as RouterIcon,
  ChevronLeft, ChevronRight, Download,
} from 'lucide-react';

const STATUS_COLORS: Record<string, { text: string; bg: string; glow: string }> = {
  online:   { text: '#22c55e', bg: 'rgba(34,197,94,0.12)',    glow: '#22c55e' },
  offline:  { text: '#ef4444', bg: 'rgba(239,68,68,0.12)',    glow: '#ef4444' },
  warning:  { text: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   glow: '#f59e0b' },
  orphaned: { text: '#64748b', bg: 'rgba(100,116,139,0.12)',  glow: '#64748b' },
};

function timeAgo(d: string) {
  if (!d) return 'never';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Bar({ pct, color }: { pct: number; color: string }) {
  const c = pct > 85 ? '#ef4444' : pct > 60 ? '#f59e0b' : color;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ height: 4, width: 56, background: '#111e36', borderRadius: 99, overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: c, borderRadius: 99, transition: 'width 0.5s' }} />
      </div>
      <span style={{ fontSize: 10, color: c, fontWeight: 600, minWidth: 28 }}>{pct}%</span>
    </div>
  );
}

export default function SuperadminRoutersPage() {
  const [routers,  setRouters]  = useState<any[]>([]);
  const [total,    setTotal]    = useState(0);
  const [stats,    setStats]    = useState<any>({});
  const [q,        setQ]        = useState('');
  const [statusF,  setStatusF]  = useState('');
  const [page,     setPage]     = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [tick,     setTick]     = useState(0);

  const PER = 25;

  const load = useCallback(async () => {
    setLoading(true);
    const token  = localStorage.getItem('sa_token');
    const params = new URLSearchParams({ page: String(page), per_page: String(PER) });
    if (q)       params.set('q', q);
    if (statusF) params.set('status', statusF);
    const res = await fetch(`/api/superadmin/routers?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const d = await res.json();
      setRouters(d.data || d.routers || []);
      setTotal(d.total || 0);
      setStats(d.stats || {});
    }
    setLoading(false);
  }, [page, q, statusF, tick]);

  useEffect(() => { load(); }, [load]);

  // Live refresh every 30s
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const totalPages = Math.ceil(total / PER);
  const online  = stats.online  ?? routers.filter(r => r.status === 'online').length;
  const offline = stats.offline ?? routers.filter(r => r.status === 'offline').length;
  const warning = stats.warning ?? routers.filter(r => r.status === 'warning').length;

  return (
    <div style={{ background: '#060c1a', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ padding: '20px 28px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px', letterSpacing: '-0.3px' }}>Router Fleet</h1>
          <p style={{ fontSize: 12, color: '#475569', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
            Live view · auto-refreshes every 30s
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={{ background: 'none', border: '1px solid #1a2540', color: '#64748b', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button style={{ background: 'none', border: '1px solid #1a2540', color: '#64748b', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* Status KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, padding: '16px 28px' }}>
        {[
          { label: 'Total Routers',   val: total || stats.total || 0, icon: RouterIcon,    color: '#0ea5e9', filter: '' },
          { label: 'Online',          val: online,                     icon: Wifi,          color: '#22c55e', filter: 'online' },
          { label: 'Offline',         val: offline,                    icon: WifiOff,       color: '#ef4444', filter: 'offline' },
          { label: 'Warning',         val: warning,                    icon: AlertTriangle, color: '#f59e0b', filter: 'warning' },
        ].map(({ label, val, icon: Icon, color, filter }) => (
          <div key={label} onClick={() => { setStatusF(f => f === filter ? '' : filter); setPage(1); }}
            style={{ background: statusF === filter ? `${color}12` : '#0a1628', border: `1px solid ${statusF === filter ? `${color}40` : '#1a2540'}`, borderRadius: 12, padding: '14px 18px', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={17} style={{ color }} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>{label}</div>
            </div>
            {val > 0 && filter !== '' && (
              <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color }}>
                {total > 0 ? `${Math.round((val / (total || stats.total || 1)) * 100)}%` : ''}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ padding: '0 28px 14px', display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#334155' }} />
          <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }}
            placeholder="Search by name, serial, IP, or tenant…"
            style={{ width: '100%', background: '#0a1628', border: '1px solid #1a2540', borderRadius: 8, padding: '8px 12px 8px 32px', fontSize: 12, color: '#f1f5f9', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={statusF} onChange={e => { setStatusF(e.target.value); setPage(1); }}
          style={{ background: '#0a1628', border: '1px solid #1a2540', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: statusF ? '#f1f5f9' : '#475569', outline: 'none', cursor: 'pointer' }}>
          <option value="">All Statuses</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
          <option value="warning">Warning</option>
          <option value="orphaned">Orphaned</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ margin: '0 28px 28px', background: '#0a1628', border: '1px solid #1a2540', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#070d1e', borderBottom: '1px solid #1a2540' }}>
              {['Router', 'Tenant', 'Status', 'CPU', 'RAM', 'WAN IP', 'Clients', 'Last Seen', 'Site'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ width: 20, height: 20, border: '2px solid #0ea5e9', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
              </td></tr>
            ) : routers.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 48, textAlign: 'center', color: '#334155', fontSize: 13 }}>
                No routers found
              </td></tr>
            ) : routers.map(r => {
              const sc = STATUS_COLORS[r.status] || STATUS_COLORS.offline;
              const cpu = r.cpu_load ?? r.cpu ?? 0;
              const ram = r.memory_percent ?? r.ram ?? 0;
              return (
                <tr key={r.id} style={{ borderTop: '1px solid #111e36' }}>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc.glow, boxShadow: `0 0 6px ${sc.glow}`, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>{r.name || r.router_name || `Router-${r.id?.slice(0,8)}`}</div>
                        <div style={{ fontSize: 10, color: '#334155' }}>{r.model || r.device_type || 'MikroTik'} · {r.mac_address || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 11, color: '#94a3b8' }}>
                    {r.tenant_name || '—'}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, color: sc.text, background: sc.bg, borderRadius: 99, padding: '2px 8px' }}>
                      {r.status || 'offline'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px' }}><Bar pct={parseInt(cpu) || 0} color="#0ea5e9" /></td>
                  <td style={{ padding: '11px 14px' }}><Bar pct={parseInt(ram) || 0} color="#8b5cf6" /></td>
                  <td style={{ padding: '11px 14px', fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                    {r.wan_ip || r.vpn_ip || '—'}
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: '#94a3b8' }}>
                    {r.active_clients ?? r.client_count ?? '—'}
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 11, color: '#475569' }}>
                    {r.last_heartbeat_at || r.last_seen_at ? timeAgo(r.last_heartbeat_at || r.last_seen_at) : 'never'}
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 11, color: '#64748b' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={11} />
                      {r.site_name || '—'}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {total > PER && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #111e36', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#070d1e' }}>
            <span style={{ fontSize: 11, color: '#334155' }}>
              Showing {(page-1)*PER+1}–{Math.min(page*PER, total)} of {total}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#0a1628', border: '1px solid #1a2540', color: '#64748b', borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>
                <ChevronLeft size={12} /> Prev
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages}
                style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#0a1628', border: '1px solid #1a2540', color: '#64748b', borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.4 : 1 }}>
                Next <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>
    </div>
  );
}
