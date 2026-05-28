'use client';
import { useEffect, useState, useCallback } from 'react';
import { api, Router, Site } from '@/lib/api';
import {
  Wifi, WifiOff, Circle, AlertTriangle, RefreshCw, Plus, Server,
  Cpu, Users, Activity, Clock, Layers, Copy, Check,
} from 'lucide-react';

function timeAgo(d: string | null): string {
  if (!d) return 'Never';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function pctColor(pct: number): string {
  if (pct >= 85) return '#ef4444';
  if (pct >= 60) return '#f59e0b';
  return '#22c55e';
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: 4, background: '#1e1e1e', borderRadius: 99, overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.3s' }} />
    </div>
  );
}

function RouterCard({ router, onViewAnalytics }: { router: Router; onViewAnalytics: (id: string) => void }) {
  const cpuPct   = router.cpu_load    || 0;
  const memPct   = router.memory_used || 0;
  const maxUsers = router.max_users   || 200;
  const curUsers = router.active_users || 0;
  const userPct  = maxUsers > 0 ? Math.round((curUsers / maxUsers) * 100) : 0;
  const isOnline = router.vpn_connected || router.status === 'online';
  const isPending = router.status === 'pending';

  return (
    <div style={{
      background: '#131313', border: `1px solid ${curUsers / maxUsers >= 0.85 ? '#7f1d1d' : '#1e1e1e'}`,
      borderRadius: 12, padding: '18px 20px', transition: 'border-color 0.2s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
            background: isPending ? '#f59e0b' : isOnline ? '#22c55e' : '#ef4444',
            boxShadow: isOnline ? '0 0 6px rgba(34,197,94,0.5)' : 'none',
          }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>{router.name}</p>
            <p style={{ fontSize: 11, color: '#555', margin: '2px 0 0' }}>
              {router.model_name || router.model || 'MikroTik'}
              {router.tier_name && <span style={{ marginLeft: 6, color: '#2563eb' }}>{router.tier_name}</span>}
            </p>
          </div>
        </div>
        {curUsers / maxUsers >= 0.85 && (
          <AlertTriangle size={14} color="#ef4444" />
        )}
      </div>

      {/* VPN address */}
      {router.vpn_address && (
        <div style={{ fontSize: 11, color: '#60a5fa', fontFamily: 'monospace', marginBottom: 12, background: 'rgba(37,99,235,0.06)', borderRadius: 5, padding: '3px 7px', display: 'inline-block' }}>
          {router.vpn_address}
        </div>
      )}

      {/* Metrics bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Cpu size={11} color="#555" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: '#555', width: 28 }}>CPU</span>
          <MiniBar value={cpuPct} max={100} color={pctColor(cpuPct)} />
          <span style={{ fontSize: 10, color: pctColor(cpuPct), width: 30, textAlign: 'right' }}>{cpuPct}%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={11} color="#555" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: '#555', width: 28 }}>RAM</span>
          <MiniBar value={memPct} max={100} color={pctColor(memPct)} />
          <span style={{ fontSize: 10, color: pctColor(memPct), width: 30, textAlign: 'right' }}>{memPct}%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={11} color="#555" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: '#555', width: 28 }}>Users</span>
          <MiniBar value={curUsers} max={maxUsers} color={pctColor(userPct)} />
          <span style={{ fontSize: 10, color: pctColor(userPct), width: 46, textAlign: 'right' }}>{curUsers}/{maxUsers}</span>
        </div>
      </div>

      {/* Footer meta */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
        {[
          ['Subnet',    router.network_address ? `${router.network_address}/${router.subnet_prefix}` : '—'],
          ['Gateway',   router.gateway_ip || '—'],
          ['WAN IP',    router.wan_ip || '—'],
          ['Last seen', timeAgo(router.last_heartbeat_at)],
        ].map(([k, v]) => (
          <div key={k}>
            <p style={{ fontSize: 9, color: '#444', margin: '0 0 1px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</p>
            <p style={{ fontSize: 11, color: '#888', margin: 0, fontFamily: k === 'Subnet' || k === 'WAN IP' ? 'monospace' : 'inherit' }}>{v}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => onViewAnalytics(router.id)} style={{
          flex: 1, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888',
          borderRadius: 6, padding: '5px 0', fontSize: 11, cursor: 'pointer',
        }}>Analytics</button>
        <a href={`/admin/settings/routers/setup?router_id=${router.id}`} style={{
          flex: 1, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888',
          borderRadius: 6, padding: '5px 0', fontSize: 11, textDecoration: 'none',
          textAlign: 'center', display: 'block',
        }}>Script</a>
      </div>
    </div>
  );
}

function ZeroTouchModal({ sites, onClose, onDone }: { sites: Site[]; onClose: () => void; onDone: () => void }) {
  const [form,     setForm]     = useState({ name: '', model: '', site_id: '' });
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState('');
  const [result,   setResult]   = useState<{ script: string; config: any } | null>(null);
  const [copied,   setCopied]   = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) { setErr('Router name required'); return; }
    setSaving(true); setErr('');
    try {
      const res = await api.routers.zeroTouch({ name: form.name, model: form.model || undefined, site_id: form.site_id || undefined });
      setResult({ script: res.script, config: res.config });
      onDone();
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  function copy() {
    if (result) { navigator.clipboard.writeText(result.script); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  function download() {
    if (!result) return;
    const blob = new Blob([result.script], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url; a.download = `icube-setup-${form.name}.rsc`; a.click();
    URL.revokeObjectURL(url);
  }

  const inp: React.CSSProperties = { width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: 7, padding: '8px 12px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000 }}>
      <div style={{ background: '#131313', border: '1px solid #222', borderRadius: 14, padding: '24px 28px', width: result ? 640 : 420, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
            {result ? '✓ Script Generated — Paste into MikroTik Terminal' : 'Zero-Touch Router Setup'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        {!result ? (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Router Name *</label>
              <input style={inp} placeholder="e.g. Kireka Main" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Model (optional)</label>
              <input style={inp} placeholder="e.g. RB4011" value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
              <p style={{ fontSize: 11, color: '#555', margin: '4px 0 0' }}>Auto-detects tier and assigns subnet size</p>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 5, textTransform: 'uppercase' }}>Site</label>
              <select style={inp} value={form.site_id} onChange={e => setForm(f => ({ ...f, site_id: e.target.value }))}>
                <option value="">— No site —</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {err && <p style={{ fontSize: 12, color: '#f87171' }}>{err}</p>}
            <button type="submit" disabled={saving} style={{ background: '#2563eb', border: 'none', color: '#fff', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Generating…' : 'Generate Setup Script'}
            </button>
          </form>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 5, background: copied ? 'rgba(37,99,235,0.15)' : '#1a1a1a', border: `1px solid ${copied ? '#2563eb' : '#2a2a2a'}`, color: copied ? '#2563eb' : '#888', borderRadius: 7, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
                {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={download} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', borderRadius: 7, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>
                Download .rsc
              </button>
            </div>
            <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 8, padding: '14px 16px', fontFamily: 'monospace', fontSize: 11, color: '#a3e635', lineHeight: 1.65, maxHeight: 400, overflowY: 'auto', whiteSpace: 'pre' }}>
              {result.script}
            </div>
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {Object.entries(result.config).map(([k, v]) => (
                <div key={k} style={{ background: '#111', borderRadius: 7, padding: '8px 12px' }}>
                  <p style={{ fontSize: 9, color: '#555', margin: '0 0 2px', textTransform: 'uppercase' }}>{k.replace(/_/g, ' ')}</p>
                  <p style={{ fontSize: 12, color: '#aaa', margin: 0, fontFamily: 'monospace' }}>{String(v)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RouterMonitoringPage() {
  const [routers,       setRouters]       = useState<Router[]>([]);
  const [sites,         setSites]         = useState<Site[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [showZeroTouch, setShowZeroTouch] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([api.routers.list(), api.sites.list()]);
      setRouters(r); setSites(s);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  function viewAnalytics(id: string) {
    window.location.href = `/admin/router/${id}`;
  }

  const online     = routers.filter(r => r.vpn_connected || r.status === 'online').length;
  const offline    = routers.filter(r => !r.vpn_connected && r.status !== 'pending').length;
  const totalUsers = routers.reduce((s, r) => s + (r.active_users || 0), 0);
  const totalCap   = routers.reduce((s, r) => s + (r.max_users || 200), 0);
  const avgCpu     = routers.length ? Math.round(routers.reduce((s, r) => s + (r.cpu_load || 0), 0) / routers.length) : 0;
  const warnings   = routers.filter(r => (r.active_users || 0) / (r.max_users || 200) >= 0.85);

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', padding: '24px 28px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>Router Monitoring</h1>
          <p style={{ fontSize: 12, color: '#555', margin: '4px 0 0' }}>Auto-refreshes every 30s</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#131313', border: '1px solid #2a2a2a', color: '#888', borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer' }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowZeroTouch(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#2563eb', border: 'none', color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={14} /> Add Router
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total',       value: routers.length,           color: '#aaa'     },
          { label: 'Online',      value: online,                   color: '#22c55e'  },
          { label: 'Offline',     value: offline,                  color: '#f87171'  },
          { label: 'Active Users',value: totalUsers,               color: '#2563eb'  },
          { label: 'Avg CPU',     value: `${avgCpu}%`,             color: pctColor(avgCpu) },
        ].map(s => (
          <div key={s.label} style={{ background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
            <p style={{ fontSize: 11, color: '#555', margin: '3px 0 0' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Capacity warnings */}
      {warnings.map(r => (
        <div key={r.id} style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 9, padding: '10px 14px', fontSize: 12, color: '#f87171',
        }}>
          <AlertTriangle size={14} />
          <span>
            <strong>{r.name}</strong> is at{' '}
            <strong>{Math.round((r.active_users || 0) / (r.max_users || 200) * 100)}% capacity</strong>
            {' '}({r.active_users}/{r.max_users} users). Consider adding another router.
          </span>
        </div>
      ))}

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#f87171', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Cards grid */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <div style={{ width: 20, height: 20, border: '2px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : routers.length === 0 ? (
        <div style={{ background: '#131313', border: '1px solid #1e1e1e', borderRadius: 12, padding: '64px 24px', textAlign: 'center' }}>
          <Server size={40} color="#333" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: '#555', margin: '0 0 16px' }}>No routers yet. Add your first router with zero-touch setup.</p>
          <button onClick={() => setShowZeroTouch(true)} style={{ background: '#2563eb', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Add Router
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {routers.map(r => (
            <RouterCard key={r.id} router={r} onViewAnalytics={viewAnalytics} />
          ))}
        </div>
      )}

      {/* Zero-touch modal */}
      {showZeroTouch && (
        <ZeroTouchModal
          sites={sites}
          onClose={() => setShowZeroTouch(false)}
          onDone={load}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
