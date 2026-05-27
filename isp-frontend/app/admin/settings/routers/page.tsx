'use client';
import { useEffect, useState, useCallback } from 'react';
import { TENANT_ID } from '@/lib/api';
import {
  Router as RouterIcon, Plus, MoreHorizontal, Wifi, WifiOff,
  X, Loader, AlertCircle, Copy, CheckCircle, Cpu, Clock
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface RouterRow {
  id: string; name: string; ip_address: string; brand: string;
  board_name: string | null; model: string | null; firmware_version: string | null;
  status: 'online' | 'offline' | 'unreachable';
  cpu_load: number; uptime_seconds: number; ssh_port: number;
  api_port: number; api_username: string | null; site_name: string | null;
  created_at: string;
}

const BRANDS = ['mikrotik', 'ruijie', 'ubiquiti_unifi', 'tplink_omada', 'cisco', 'huawei', 'dlink', 'openwrt'];

function fmtUptime(secs: number): string {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: RouterRow['status'] }) {
  const map = {
    online:      { bg: 'rgba(29,158,117,0.15)', color: '#34d399', dot: '#1D9E75', label: 'Online' },
    offline:     { bg: 'rgba(239,68,68,0.15)',  color: '#f87171', dot: '#ef4444', label: 'Offline' },
    unreachable: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', dot: '#f59e0b', label: 'Unreachable' },
  };
  const s = map[status] ?? map.offline;
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 999, padding: '2px 10px', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
      {s.label}
    </span>
  );
}

// ── Add Router Modal ──────────────────────────────────────────────────────────
function AddRouterModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({
    name: '', ip_address: '', brand: 'mikrotik',
    api_username: '', api_password: '', ssh_port: '22',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.ip_address) { setErr('Name and IP address are required'); return; }
    setSaving(true); setErr('');
    try {
      const res = await fetch('/api/v1/settings/routers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': TENANT_ID },
        body: JSON.stringify({
          name: form.name,
          ip_address: form.ip_address,
          brand: form.brand,
          api_username: form.api_username || undefined,
          api_password: form.api_password || undefined,
          ssh_port: parseInt(form.ssh_port) || 22,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setErr(d.error ?? 'Failed to add router');
        return;
      }
      onAdded();
      onClose();
    } catch (e: any) { setErr(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, padding: 28, width: 460, maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(29,158,117,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RouterIcon size={16} style={{ color: '#1D9E75' }} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Add Router</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Name */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#888', marginBottom: 6 }}>Router Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                className="input" placeholder="e.g. Main Office Router" />
            </div>
            {/* IP */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#888', marginBottom: 6 }}>IP Address *</label>
              <input value={form.ip_address} onChange={e => set('ip_address', e.target.value)}
                className="input" placeholder="192.168.1.1" />
            </div>
            {/* Brand */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#888', marginBottom: 6 }}>Brand</label>
              <select value={form.brand} onChange={e => set('brand', e.target.value)} className="input">
                {BRANDS.map(b => (
                  <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1).replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            {/* API creds */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#888', marginBottom: 6 }}>API Username</label>
                <input value={form.api_username} onChange={e => set('api_username', e.target.value)}
                  className="input" placeholder="admin" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#888', marginBottom: 6 }}>API Password</label>
                <input type="password" value={form.api_password} onChange={e => set('api_password', e.target.value)}
                  className="input" placeholder="••••••••" />
              </div>
            </div>
            {/* SSH port */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#888', marginBottom: 6 }}>SSH Port</label>
              <input value={form.ssh_port} onChange={e => set('ssh_port', e.target.value)}
                className="input" placeholder="22" type="number" min={1} max={65535} />
            </div>

            {err && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#2a1515', border: '1px solid #4a2020', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#f87171' }}>
                <AlertCircle size={13} /> {err}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, background: '#111', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: 8, padding: '8px 0', fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 1, background: '#1D9E75', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 0', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {saving ? <><Loader size={13} className="animate-spin" /> Adding…</> : 'Add Router'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Router row ────────────────────────────────────────────────────────────────
function RouterRow({ r, onDelete }: { r: RouterRow; onDelete: (id: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied]     = useState(false);

  function copyIp() {
    navigator.clipboard.writeText(r.ip_address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function del() {
    setMenuOpen(false);
    if (!confirm(`Delete "${r.name}"?`)) return;
    await fetch(`/api/v1/settings/routers/${r.id}`, {
      method: 'DELETE',
      headers: { 'X-Tenant-ID': TENANT_ID },
    });
    onDelete(r.id);
  }

  const brandLabel = r.brand.charAt(0).toUpperCase() + r.brand.slice(1).replace(/_/g, ' ');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 20px', borderBottom: '1px solid #1e1e1e' }}
      className="hover:bg-[#1e1e1e] transition-colors">
      {/* Icon + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '0 0 260px' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: r.status === 'online' ? 'rgba(29,158,117,0.15)' : '#1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {r.status === 'online'
            ? <Wifi size={16} style={{ color: '#1D9E75' }} />
            : <WifiOff size={16} style={{ color: '#555' }} />}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 1 }}>{r.name}</p>
          <p style={{ fontSize: 11, color: '#555' }}>
            {r.board_name ?? brandLabel}
          </p>
        </div>
      </div>

      {/* Model / firmware */}
      <div style={{ flex: '0 0 160px', minWidth: 0 }}>
        <p style={{ fontSize: 12, color: '#aaa' }}>{brandLabel}</p>
        <p style={{ fontSize: 11, color: '#555' }}>{r.firmware_version ?? '—'}</p>
      </div>

      {/* Status */}
      <div style={{ flex: '0 0 110px' }}>
        <StatusBadge status={r.status} />
      </div>

      {/* CPU */}
      <div style={{ flex: '0 0 70px', display: 'flex', alignItems: 'center', gap: 5 }}>
        <Cpu size={12} style={{ color: '#555' }} />
        <span style={{ fontSize: 12, color: '#aaa' }}>{Number(r.cpu_load || 0).toFixed(0)}%</span>
      </div>

      {/* Uptime */}
      <div style={{ flex: '0 0 90px', display: 'flex', alignItems: 'center', gap: 5 }}>
        <Clock size={12} style={{ color: '#555' }} />
        <span style={{ fontSize: 12, color: '#aaa' }}>{fmtUptime(Number(r.uptime_seconds || 0))}</span>
      </div>

      {/* IP (copyable) */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <button onClick={copyIp}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#888' }}>{r.ip_address}:{r.api_port}</span>
          {copied
            ? <CheckCircle size={12} style={{ color: '#1D9E75' }} />
            : <Copy size={11} style={{ color: '#444' }} />}
        </button>
      </div>

      {/* Actions */}
      <div style={{ position: 'relative' }}>
        <button onClick={() => setMenuOpen(v => !v)}
          style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: 6, padding: '4px 8px', color: '#555', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <MoreHorizontal size={14} />
        </button>
        {menuOpen && (
          <div style={{ position: 'absolute', right: 0, top: 32, background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8, minWidth: 140, zIndex: 20, overflow: 'hidden' }}>
            {[
              { label: 'Setup Wizard', href: `/admin/settings/routers/setup?router_id=${r.id}` },
              { label: 'View Observability', href: '/admin/router' },
              { label: 'Copy IP', action: copyIp },
            ].map(item => (
              item.href
                ? <a key={item.label} href={item.href}
                    style={{ display: 'block', padding: '8px 14px', fontSize: 12, color: '#aaa', textDecoration: 'none', cursor: 'pointer' }}
                    className="hover:bg-[#2a2a2a]">{item.label}</a>
                : <button key={item.label} onClick={item.action}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12, color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }}
                    className="hover:bg-[#2a2a2a]">{item.label}</button>
            ))}
            <button onClick={del}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', borderTop: '1px solid #2a2a2a' }}
              className="hover:bg-[#2a2a2a]">
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{ padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: '#1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
        <RouterIcon size={24} style={{ color: '#444' }} />
      </div>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>No routers yet</p>
      <p style={{ fontSize: 12, color: '#555', textAlign: 'center', maxWidth: 300 }}>
        Add your first MikroTik or other router to start managing your network.
      </p>
      <button onClick={onAdd}
        style={{ marginTop: 8, background: '#1D9E75', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Plus size={14} /> Add Router
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SettingsRoutersPage() {
  const [routers, setRouters]   = useState<RouterRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [addOpen, setAddOpen]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/v1/settings/routers', {
        headers: { 'X-Tenant-ID': TENANT_ID },
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const data = await res.json();
      setRouters(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function removeRouter(id: string) {
    setRouters(prev => prev.filter(r => r.id !== id));
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(29,158,117,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RouterIcon size={18} style={{ color: '#1D9E75' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: 0 }}>Routers</h1>
            <p style={{ fontSize: 11, color: '#555', margin: 0, marginTop: 2 }}>
              Manage and monitor your network routers
            </p>
          </div>
        </div>
        <button onClick={() => setAddOpen(true)}
          style={{ background: '#1D9E75', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={14} /> Add Router
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#2a1515', border: '1px solid #4a2020', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#f87171', marginBottom: 16 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Table card */}
      <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
        {/* Table header */}
        {routers.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 20px', background: '#111', borderBottom: '1px solid #1e1e1e' }}>
            <span style={{ flex: '0 0 260px', fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Router</span>
            <span style={{ flex: '0 0 160px', fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Model / Version</span>
            <span style={{ flex: '0 0 110px', fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Status</span>
            <span style={{ flex: '0 0 70px', fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>CPU</span>
            <span style={{ flex: '0 0 90px', fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Uptime</span>
            <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Address</span>
            <span style={{ width: 36 }} />
          </div>
        )}

        {loading ? (
          <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #1D9E75', borderTopColor: 'transparent' }} className="animate-spin" />
          </div>
        ) : routers.length === 0 ? (
          <EmptyState onAdd={() => setAddOpen(true)} />
        ) : (
          routers.map(r => (
            <RouterRow key={r.id} r={r} onDelete={removeRouter} />
          ))
        )}
      </div>

      {/* Info footer */}
      {routers.length > 0 && (
        <p style={{ marginTop: 12, fontSize: 11, color: '#444' }}>
          {routers.length} router{routers.length !== 1 ? 's' : ''} configured · Click a row's "···" menu → View Observability to see live charts
        </p>
      )}

      {/* Modal */}
      {addOpen && (
        <AddRouterModal
          onClose={() => setAddOpen(false)}
          onAdded={load}
        />
      )}
    </div>
  );
}
