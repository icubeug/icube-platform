'use client';
import { useEffect, useState } from 'react';
import { api, Router, Site, RouterRequest } from '@/lib/api';
import { Router as RouterIcon, Plus, AlertCircle, RefreshCw, Server, Circle,
         Mail, ChevronRight, Clock, Check, X } from 'lucide-react';

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

// ── Request form for non-superadmin tenants ───────────────────────────────────
function RequestRouterModal({ sites, onClose, onSubmitted }: {
  sites: Site[]; onClose: () => void; onSubmitted: () => void;
}) {
  const [form,    setForm]    = useState({ router_name: '', router_model: '', site_name: '', notes: '' });
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');
  const [done,    setDone]    = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.router_name.trim()) { setErr('Router name is required'); return; }
    setSaving(true); setErr('');
    try {
      await api.routerRequests.create({
        router_name:  form.router_name.trim(),
        router_model: form.router_model || undefined,
        site_name:    form.site_name    || undefined,
        notes:        form.notes        || undefined,
      });
      setDone(true);
      onSubmitted();
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  const inp: React.CSSProperties = {
    width: '100%', background: '#0f0f0f', border: '1px solid #2a2a2a',
    borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#fff',
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000 }}>
      <div style={{ background: '#131313', border: '1px solid #222', borderRadius: 14, padding: '28px 32px', width: 420, maxWidth: '95vw' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>Request Router Setup</p>
            <p style={{ fontSize: 12, color: '#555', margin: '3px 0 0' }}>iCube support will configure your router</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}><X size={16} /></button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Check size={24} color="#22c55e" />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: '0 0 6px' }}>Request submitted!</p>
            <p style={{ fontSize: 12, color: '#555', margin: '0 0 20px' }}>Our team will contact you within 24 hours to set up your router.</p>
            <button onClick={onClose} style={{ background: '#2563eb', border: 'none', color: '#fff', borderRadius: 8, padding: '9px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Close</button>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Router Name *</label>
              <input style={inp} placeholder="e.g. Kireka Main" autoFocus
                value={form.router_name} onChange={e => setForm(f => ({ ...f, router_name: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Router Model</label>
              <input style={inp} placeholder="e.g. RB4011, L009, hAP ac²"
                value={form.router_model} onChange={e => setForm(f => ({ ...f, router_model: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Site / Location</label>
              <select style={{ ...inp, color: form.site_name ? '#fff' : '#555' }}
                value={form.site_name} onChange={e => setForm(f => ({ ...f, site_name: e.target.value }))}>
                <option value="">— Select site —</option>
                {sites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes (optional)</label>
              <textarea style={{ ...inp, minHeight: 72, resize: 'vertical' as const }}
                placeholder="Any special requirements or notes for the setup team…"
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            {err && <p style={{ fontSize: 12, color: '#f87171', margin: 0 }}>{err}</p>}
            <button type="submit" disabled={saving} style={{
              background: '#2563eb', border: 'none', color: '#fff', borderRadius: 8,
              padding: '10px 0', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              opacity: saving ? 0.75 : 1,
            }}>
              {saving ? 'Submitting…' : 'Submit Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RoutersPage() {
  const [routers,      setRouters]      = useState<Router[]>([]);
  const [sites,        setSites]        = useState<Site[]>([]);
  const [requests,     setRequests]     = useState<RouterRequest[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [showRequest,  setShowRequest]  = useState(false);
  const [isImpers,     setIsImpers]     = useState(false);

  useEffect(() => {
    setIsImpers(typeof window !== 'undefined' && localStorage.getItem('icube_impersonating') === 'true');
  }, []);

  async function load() {
    setLoading(true); setError('');
    try {
      const [r, s, rqs] = await Promise.all([
        api.routers.list(),
        api.sites.list(),
        api.routerRequests.list().catch(() => [] as RouterRequest[]),
      ]);
      setRouters(r); setSites(s); setRequests(rqs);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const pendingReqs = requests.filter(r => r.status === 'pending' || r.status === 'in_progress');
  const STATUS_COLOR: Record<string, string> = {
    pending: '#f59e0b', in_progress: '#2563eb', completed: '#22c55e', cancelled: '#555',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', padding: '24px 28px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>Routers</h1>
          <p style={{ fontSize: 13, color: '#555', margin: '4px 0 0' }}>
            {loading ? '…' : `${routers.filter(r => r.vpn_connected).length} online · ${routers.length} total`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: '#131313', border: '1px solid #2a2a2a', color: '#888',
            borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer',
          }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Superadmin impersonating → link to monitoring page ZTP */}
          {isImpers && (
            <a href="/admin/router" style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#2563eb', border: 'none', color: '#fff',
              borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600,
              textDecoration: 'none',
            }}>
              <Plus size={14} /> Add Router
            </a>
          )}
        </div>
      </div>

      {/* Contact support banner — shown to non-impersonating tenants */}
      {!isImpers && (
        <div style={{
          background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.18)',
          borderRadius: 10, padding: '14px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#60a5fa', margin: '0 0 3px' }}>
              Need to add a router?
            </p>
            <p style={{ fontSize: 12, color: '#555', margin: 0 }}>
              Contact iCube support at{' '}
              <a href="mailto:support@icubeug.net" style={{ color: '#2563eb', textDecoration: 'none' }}>support@icubeug.net</a>
              {' '}or WhatsApp{' '}
              <a href="https://wa.me/256700000000" style={{ color: '#2563eb', textDecoration: 'none' }}>+256 700 000 000</a>
            </p>
          </div>
          <button onClick={() => setShowRequest(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#2563eb', border: 'none', color: '#fff',
            borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
          }}>
            <Mail size={13} /> Request Router Setup
          </button>
        </div>
      )}

      {/* Pending requests status — for tenants */}
      {!isImpers && pendingReqs.length > 0 && (
        <div style={{ background: '#131313', border: '1px solid #1e1e1e', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: '0 0 10px' }}>Pending Requests</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendingReqs.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Circle size={8} style={{ color: STATUS_COLOR[r.status], fill: STATUS_COLOR[r.status], flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: '#ccc' }}>{r.router_name}</span>
                <span style={{ fontSize: 11, color: STATUS_COLOR[r.status], fontWeight: 600, textTransform: 'capitalize' as const }}>{r.status.replace('_', ' ')}</span>
                <span style={{ fontSize: 11, color: '#555' }}>{timeAgo(r.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#f87171' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Router table */}
      <div style={{ background: '#131313', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160 }}>
            <div style={{ width: 20, height: 20, border: '2px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : routers.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <Server size={40} color="#333" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: '#555', margin: '0 0 6px' }}>No routers yet</p>
            {isImpers ? (
              <a href="/admin/router" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12,
                background: '#2563eb', color: '#fff', borderRadius: 8, padding: '8px 18px',
                fontSize: 13, fontWeight: 600, textDecoration: 'none',
              }}>
                <Plus size={14} /> Add First Router
              </a>
            ) : (
              <button onClick={() => setShowRequest(true)} style={{
                marginTop: 12, background: '#2563eb', border: 'none', color: '#fff',
                borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                Request Router Setup
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0f0f0f' }}>
                  {['Router', 'VPN Address', 'Status', 'CPU', 'Active Users', 'Tier', 'Last Seen'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#444', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #1e1e1e', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {routers.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #1a1a1a' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1a1a1a')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <RouterIcon size={13} color="#2563eb" />
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0 }}>{r.name}</p>
                          <p style={{ fontSize: 10, color: '#555', margin: '1px 0 0' }}>{r.model_name || r.model || 'MikroTik'}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 11, color: '#60a5fa', fontFamily: 'monospace' }}>
                      {r.vpn_address || '—'}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      {r.vpn_connected ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#22c55e', background: 'rgba(34,197,94,0.1)', borderRadius: 99, padding: '3px 9px' }}>
                          <Circle size={6} style={{ fill: '#22c55e', color: '#22c55e' }} /> Online
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: r.status === 'pending' ? '#f59e0b' : '#f87171', background: r.status === 'pending' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: 99, padding: '3px 9px' }}>
                          <Circle size={6} style={{ fill: 'currentColor', color: 'currentColor' }} />
                          {r.status === 'pending' ? 'Pending' : 'Offline'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: '#888' }}>{r.cpu_load != null ? `${r.cpu_load}%` : '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: '#888' }}>{r.active_users ?? '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: 11, color: '#555' }}>{r.tier_name || '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: 11, color: '#555' }}>{timeAgo(r.last_heartbeat_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Link to monitoring */}
      {routers.length > 0 && (
        <a href="/admin/router" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 12, fontSize: 12, color: '#2563eb', textDecoration: 'none' }}>
          View detailed monitoring & analytics <ChevronRight size={13} />
        </a>
      )}

      {/* Request modal */}
      {showRequest && (
        <RequestRouterModal
          sites={sites}
          onClose={() => setShowRequest(false)}
          onSubmitted={load}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
