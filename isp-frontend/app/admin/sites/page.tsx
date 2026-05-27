'use client';
import { useEffect, useState } from 'react';
import { api, Site } from '@/lib/api';
import { Building2, Plus, MapPin, AlertCircle, RefreshCw, Pencil, CircleDot } from 'lucide-react';

export default function SitesPage() {
  const [sites, setSites]   = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]     = useState({ name: '', location: '' });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');

  async function load() {
    setLoading(true); setError('');
    try { setSites(await api.sites.list()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return setFormErr('Site name is required');
    setSaving(true); setFormErr('');
    try {
      await api.sites.create({ name: form.name.trim(), location: form.location.trim() });
      setForm({ name: '', location: '' }); setShowForm(false);
      load();
    } catch (e: any) { setFormErr(e.message); }
    finally { setSaving(false); }
  }

  async function toggleStatus(site: Site) {
    const next = site.status === 'active' ? 'inactive' : 'active';
    try {
      await api.sites.update(site.id, { status: next });
      load();
    } catch {}
  }

  return (
    <div className="p-8 max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sites</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage your hotspot locations</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowForm(v => !v)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} /> Add Site
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle size={16} />{error}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleCreate} className="card p-6 space-y-4">
          <h2 className="font-semibold text-slate-700">New Site</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Site Name *</label>
              <input className="input" placeholder="e.g. Kampala CBD" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Location</label>
              <input className="input" placeholder="e.g. Kampala, Uganda" value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
          </div>
          {formErr && <p className="text-red-600 text-xs">{formErr}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-sm" disabled={saving}>
              {saving ? <><span className="spinner mr-2" />Saving…</> : 'Create Site'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Sites grid */}
      {loading
        ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="card p-6 animate-pulse space-y-3">
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        : sites.length === 0
          ? (
            <div className="card p-16 flex flex-col items-center text-center">
              <Building2 size={48} className="text-slate-200 mb-4" />
              <p className="font-semibold text-slate-600">No sites yet</p>
              <p className="text-slate-400 text-sm mt-1">Add your first hotspot location to get started</p>
              <button onClick={() => setShowForm(true)} className="btn-primary mt-4 text-sm flex items-center gap-2">
                <Plus size={16} /> Add Site
              </button>
            </div>
          )
          : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sites.map(site => (
                <div key={site.id} className="card p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center">
                      <Building2 size={18} className="text-brand-green" />
                    </div>
                    <button onClick={() => toggleStatus(site)}
                      className={site.status === 'active' ? 'badge-green cursor-pointer' : 'badge-slate cursor-pointer'}>
                      <CircleDot size={9} />
                      {site.status}
                    </button>
                  </div>
                  <h3 className="font-semibold text-slate-800">{site.name}</h3>
                  {site.location && (
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                      <MapPin size={10} />{site.location}
                    </p>
                  )}
                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-center">
                    <div>
                      <p className="text-xl font-bold text-slate-800">{site.router_count ?? 0}</p>
                      <p className="text-xs text-slate-400">Routers</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-emerald-600">{site.active_vouchers ?? 0}</p>
                      <p className="text-xs text-slate-400">Active vouchers</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
      }
    </div>
  );
}
