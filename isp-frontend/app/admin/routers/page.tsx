'use client';
import { useEffect, useState } from 'react';
import { api, Router, Site } from '@/lib/api';
import { Router as RouterIcon, Plus, AlertCircle, RefreshCw, Server, Wifi, WifiOff, Circle } from 'lucide-react';

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

const BRANDS = ['mikrotik', 'ruijie', 'ubiquiti_unifi', 'tplink_omada', 'cisco', 'huawei', 'dlink', 'openwrt'];

const inp: React.CSSProperties = {
  width: '100%', background: '#111', border: '1px solid #2a2a2a',
  borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#fff',
  outline: 'none', boxSizing: 'border-box',
};
const selInp: React.CSSProperties = { ...inp };

export default function RoutersPage() {
  const [routers,  setRouters]  = useState<Router[]>([]);
  const [sites,    setSites]    = useState<Site[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [formErr,  setFormErr]  = useState('');
  const [form, setForm] = useState({
    name: '', ip_address: '', api_port: '8728',
    api_username: 'admin', api_password: '', brand: 'mikrotik', site_id: '',
  });

  async function load() {
    setLoading(true); setError('');
    try {
      const [r, s] = await Promise.all([api.routers.list(), api.sites.list()]);
      setRouters(r); setSites(s);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.ip_address.trim()) return setFormErr('Name and IP are required');
    setSaving(true); setFormErr('');
    try {
      await api.routers.create({
        name: form.name, ip_address: form.ip_address,
        api_port: Number(form.api_port), brand: form.brand,
        site_id: form.site_id || undefined,
      });
      setShowForm(false);
      setForm({ name: '', ip_address: '', api_port: '8728', api_username: 'admin', api_password: '', brand: 'mikrotik', site_id: '' });
      load();
    } catch (e: any) { setFormErr(e.message); }
    finally { setSaving(false); }
  }

  const onlineCount = routers.filter(r => r.vpn_connected).length;

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', padding: '24px 28px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>Routers</h1>
          <p style={{ fontSize: 13, color: '#555', margin: '4px 0 0' }}>
            {loading ? '…' : `${onlineCount} online · ${routers.length} total`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#131313', border: '1px solid #2a2a2a', color: '#888',
            borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer',
          }}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowForm(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#2563eb', border: 'none', color: '#fff',
            borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <Plus size={14} /> Add Router
          </button>
        </div>
      </div>

      {/* DNS note */}
      <div style={{
        background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.18)',
        borderRadius: 9, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#60a5fa',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Wifi size={13} />
        <span>
          <strong>DNS required:</strong> Add a Cloudflare A record — Type: A, Name: <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4 }}>vpn</code>, Value: <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4 }}>139.84.247.205</code> — to enable <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: 4 }}>vpn.icubeug.net</code>
        </span>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171',
        }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleCreate} style={{
          background: '#131313', border: '1px solid #222', borderRadius: 12,
          padding: '20px 22px', marginBottom: 20,
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: '0 0 16px' }}>Add Router</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }}>
            {[
              { label: 'Name *', key: 'name', placeholder: 'Main Router' },
              { label: 'IP Address *', key: 'ip_address', placeholder: '192.168.1.1' },
              { label: 'API Port', key: 'api_port', placeholder: '8728' },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{label}</label>
                <input style={inp} placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Brand</label>
              <select style={selInp} value={form.brand}
                onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}>
                {BRANDS.map(b => <option key={b} value={b}>{b.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Site</label>
              <select style={selInp} value={form.site_id}
                onChange={e => setForm(f => ({ ...f, site_id: e.target.value }))}>
                <option value="">— No site —</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          {formErr && <p style={{ fontSize: 12, color: '#f87171', margin: '0 0 12px' }}>{formErr}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving} style={{
              background: '#2563eb', border: 'none', color: '#fff', borderRadius: 8,
              padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1,
            }}>{saving ? 'Saving…' : 'Add Router'}</button>
            <button type="button" onClick={() => setShowForm(false)} style={{
              background: '#1c1c1c', border: '1px solid #252525', color: '#888', borderRadius: 8,
              padding: '8px 18px', fontSize: 13, cursor: 'pointer',
            }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Table */}
      <div style={{ background: '#131313', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160 }}>
            <div style={{ width: 20, height: 20, border: '2px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : routers.length === 0 ? (
          <div style={{ padding: '64px 24px', textAlign: 'center' }}>
            <Server size={40} color="#333" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: '#555', margin: '0 0 4px' }}>No routers yet</p>
            <p style={{ fontSize: 12, color: '#444', margin: '0 0 16px' }}>Add a router to start monitoring your network</p>
            <button onClick={() => setShowForm(true)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#2563eb', border: 'none', color: '#fff',
              borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              <Plus size={14} /> Add Router
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0f0f0f' }}>
                  {['Router', 'IP Address', 'VPN Address', 'VPN Status', 'Last Seen', 'CPU', 'Active Users', 'Site', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left', fontSize: 11,
                      fontWeight: 600, color: '#444', textTransform: 'uppercase',
                      letterSpacing: '0.06em', borderBottom: '1px solid #1e1e1e', whiteSpace: 'nowrap',
                    }}>{h}</th>
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
                          <p style={{ fontSize: 10, color: '#555', margin: '1px 0 0', textTransform: 'capitalize' }}>{r.brand?.replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: '#888', fontFamily: 'monospace' }}>
                      {r.ip_address}:{r.api_port}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: '#60a5fa', fontFamily: 'monospace' }}>
                      {r.vpn_address || <span style={{ color: '#333' }}>—</span>}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      {r.vpn_connected ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#22c55e', background: 'rgba(34,197,94,0.1)', borderRadius: 99, padding: '3px 9px' }}>
                          <Circle size={6} style={{ fill: '#22c55e', color: '#22c55e' }} /> Connected
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#f87171', background: 'rgba(239,68,68,0.1)', borderRadius: 99, padding: '3px 9px' }}>
                          <Circle size={6} style={{ fill: '#ef4444', color: '#ef4444' }} /> Offline
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 11, color: '#555' }}>
                      {timeAgo(r.last_heartbeat_at)}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: '#888' }}>
                      {r.cpu_load != null ? `${r.cpu_load}%` : '—'}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: '#888' }}>—</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: '#555' }}>
                      {r.site_name || <span style={{ color: '#333' }}>—</span>}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <a href={`/admin/settings/routers/setup?router_id=${r.id}`} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888',
                        borderRadius: 6, padding: '4px 10px', fontSize: 11, textDecoration: 'none',
                      }}>Setup</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
