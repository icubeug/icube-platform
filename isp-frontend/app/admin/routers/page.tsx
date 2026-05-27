'use client';
import { useEffect, useState } from 'react';
import { api, Router, Site } from '@/lib/api';
import { Router as RouterIcon, Plus, AlertCircle, RefreshCw, Server } from 'lucide-react';

function StatusBadge({ status }: { status: string }) {
  if (status === 'online')  return <span className="badge-green"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Online</span>;
  if (status === 'offline') return <span className="badge-red"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Offline</span>;
  return <span className="badge-amber"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />Unreachable</span>;
}

const BRANDS = ['mikrotik', 'ruijie', 'ubiquiti_unifi', 'tplink_omada', 'cisco', 'huawei', 'dlink', 'openwrt'];

export default function RoutersPage() {
  const [routers, setRouters] = useState<Router[]>([]);
  const [sites, setSites]     = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [formErr, setFormErr] = useState('');
  const [form, setForm]       = useState({
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
      setShowForm(false); load();
    } catch (e: any) { setFormErr(e.message); }
    finally { setSaving(false); }
  }

  const onlineCount = routers.filter(r => r.status === 'online').length;

  return (
    <div className="p-8 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Routers</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {loading ? '…' : `${onlineCount} online · ${routers.length} total`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary text-sm flex items-center gap-1">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setShowForm(v => !v)} className="btn-primary text-sm flex items-center gap-2">
            <Plus size={16} /> Add Router
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle size={16} />{error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="card p-6 space-y-4">
          <h2 className="font-semibold text-slate-700">Add Router</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
              <input className="input" placeholder="Main Router" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">IP Address *</label>
              <input className="input font-mono" placeholder="192.168.1.1" value={form.ip_address}
                onChange={e => setForm(f => ({ ...f, ip_address: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">API Port</label>
              <input className="input font-mono" value={form.api_port}
                onChange={e => setForm(f => ({ ...f, api_port: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Brand</label>
              <select className="input" value={form.brand}
                onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}>
                {BRANDS.map(b => <option key={b} value={b}>{b.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Site</label>
              <select className="input" value={form.site_id}
                onChange={e => setForm(f => ({ ...f, site_id: e.target.value }))}>
                <option value="">— No site —</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          {formErr && <p className="text-red-600 text-xs">{formErr}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary text-sm" disabled={saving}>
              {saving ? <><span className="spinner mr-2" />Saving…</> : 'Add Router'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        {loading
          ? <div className="h-40 flex items-center justify-center"><div className="spinner spinner-dark" /></div>
          : routers.length === 0
            ? (
              <div className="p-16 flex flex-col items-center text-center">
                <Server size={48} className="text-slate-200 mb-4" />
                <p className="font-semibold text-slate-600">No routers yet</p>
                <p className="text-slate-400 text-sm mt-1">Add a router to start monitoring your network</p>
                <button onClick={() => setShowForm(true)} className="btn-primary mt-4 text-sm flex items-center gap-2">
                  <Plus size={16} /> Add Router
                </button>
              </div>
            )
            : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Router</th>
                    <th className="px-6 py-3">IP Address</th>
                    <th className="px-6 py-3">Brand</th>
                    <th className="px-6 py-3">Site</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {routers.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-800">{r.name}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{r.ip_address}:{r.api_port}</td>
                      <td className="px-6 py-4 text-slate-500 capitalize">{r.brand?.replace(/_/g, ' ')}</td>
                      <td className="px-6 py-4 text-slate-500">{r.site_name || <span className="text-slate-300">—</span>}</td>
                      <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(r.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
        }
      </div>
    </div>
  );
}
