'use client';
import { useEffect, useState } from 'react';
import { api, Site } from '@/lib/api';
import { Building2, Plus, MapPin, AlertCircle, RefreshCw, CircleDot, Router } from 'lucide-react';

export default function SitesPage() {
  const [sites,    setSites]    = useState<Site[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ name: '', location: '' });
  const [saving,   setSaving]   = useState(false);
  const [formErr,  setFormErr]  = useState('');

  async function load() {
    setLoading(true); setError('');
    try { setSites(await api.sites.list()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setFormErr('Site name is required'); return; }
    setSaving(true); setFormErr('');
    try {
      await api.sites.create({ name: form.name.trim(), location: form.location.trim() });
      setForm({ name: '', location: '' });
      setShowForm(false);
      load();
    } catch (e: any) { setFormErr(e.message); }
    finally { setSaving(false); }
  }

  async function toggleStatus(site: Site) {
    try {
      await api.sites.update(site.id, { status: site.status === 'active' ? 'inactive' : 'active' });
      load();
    } catch {}
  }

  const inp: React.CSSProperties = {
    width: '100%', background: '#111', border: '1px solid #2a2a2a',
    borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#fff',
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', padding: '24px 28px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>Sites</h1>
          <p style={{ fontSize: 13, color: '#555', margin: '4px 0 0' }}>Manage your hotspot locations</p>
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
            <Plus size={14} /> Add Site
          </button>
        </div>
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

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} style={{
          background: '#131313', border: '1px solid #222', borderRadius: 12,
          padding: '20px 22px', marginBottom: 20,
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: '0 0 16px' }}>New Site</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                Site Name *
              </label>
              <input style={inp} placeholder="e.g. Kampala CBD" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                Location
              </label>
              <input style={inp} placeholder="e.g. Kampala, Uganda" value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
          </div>
          {formErr && <p style={{ fontSize: 12, color: '#f87171', margin: '0 0 12px' }}>{formErr}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={saving} style={{
              background: '#2563eb', border: 'none', color: '#fff', borderRadius: 8,
              padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              opacity: saving ? 0.7 : 1,
            }}>
              {saving ? 'Saving…' : 'Create Site'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{
              background: '#1c1c1c', border: '1px solid #252525', color: '#888', borderRadius: 8,
              padding: '8px 18px', fontSize: 13, cursor: 'pointer',
            }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Sites grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: '#131313', border: '1px solid #1e1e1e', borderRadius: 12, padding: '20px', height: 160 }}>
              <div style={{ height: 14, background: '#1a1a1a', borderRadius: 4, width: '60%', marginBottom: 10 }} />
              <div style={{ height: 11, background: '#1a1a1a', borderRadius: 4, width: '40%' }} />
            </div>
          ))}
        </div>
      ) : sites.length === 0 ? (
        <div style={{
          background: '#131313', border: '1px solid #1e1e1e', borderRadius: 12,
          padding: '64px 24px', textAlign: 'center',
        }}>
          <Building2 size={40} color="#333" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: '#555', margin: '0 0 4px' }}>No sites yet</p>
          <p style={{ fontSize: 12, color: '#444', margin: '0 0 16px' }}>Add your first hotspot location to get started</p>
          <button onClick={() => setShowForm(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#2563eb', border: 'none', color: '#fff',
            borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>
            <Plus size={14} /> Add Site
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {sites.map(site => (
            <div key={site.id} style={{
              background: '#131313', border: '1px solid #1e1e1e', borderRadius: 12,
              padding: '18px 20px', transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e1e1e')}>

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: 'rgba(37,99,235,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Building2 size={17} color="#2563eb" />
                </div>
                <button onClick={() => toggleStatus(site)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none',
                  background: site.status === 'active' ? 'rgba(34,197,94,0.12)' : '#1c1c1c',
                  color: site.status === 'active' ? '#22c55e' : '#555',
                }}>
                  <CircleDot size={8} />
                  {site.status}
                </button>
              </div>

              <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>{site.name}</p>
              {site.location && (
                <p style={{ fontSize: 12, color: '#555', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={10} /> {site.location}
                </p>
              )}

              <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, textAlign: 'center' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 2 }}>
                    <Router size={11} color="#555" />
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>{site.router_count ?? 0}</p>
                  </div>
                  <p style={{ fontSize: 11, color: '#555', margin: 0 }}>Routers</p>
                </div>
                <div>
                  <p style={{ fontSize: 18, fontWeight: 700, color: '#2563eb', margin: '0 0 2px' }}>{site.active_vouchers ?? 0}</p>
                  <p style={{ fontSize: 11, color: '#555', margin: 0 }}>Active vouchers</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
