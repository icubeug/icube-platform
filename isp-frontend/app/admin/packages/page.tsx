'use client';
import { useEffect, useState } from 'react';
import { api, Package, PPPoEPlan } from '@/lib/api';
import { Search, LayoutGrid, MoreHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react';

function fmtUGX(n: number) {
  return 'UGX ' + new Intl.NumberFormat('en-UG').format(Math.round(n));
}
function fmtDate(d: string) {
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDateShort(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDuration(hrs: number): string {
  const map: Record<number, string> = {
    0.5: '30M', 1: '1H', 3: '3H', 24: '24H',
    48: '2D', 72: '3D', 96: '4D', 168: '7D', 720: '30D',
  };
  return map[hrs] ?? `${hrs}H`;
}

type Tab = 'hotspot' | 'pppoe';

export default function PackagesPage() {
  const [tab, setTab] = useState<Tab>('hotspot');
  const [packages, setPackages] = useState<Package[]>([]);
  const [pppoePackages, setPppoePackages] = useState<PPPoEPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm] = useState({
    name: '', price_ugx: '', duration_hrs: '', speed_mbps: '',
    upload_mbps: '', agent_commission_ugx: '', data_limit_mb: '',
  });

  async function load() {
    setLoading(true); setError('');
    try {
      const [pkgsRes, pppoe] = await Promise.all([
        api.packages.list({ per_page: 100 }) as Promise<any>,
        api.pppoe.plans(),
      ]);
      // Handle both paginated and plain array responses
      const pkgs: Package[] = Array.isArray(pkgsRes) ? pkgsRes : (pkgsRes.data ?? []);
      setPackages(pkgs);
      setPppoePackages(pppoe);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filteredPackages = packages.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredPppoe = pppoePackages.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleToggleStatus(pkg: Package) {
    try {
      await api.packages.update(pkg.id, { active: !pkg.active });
      setPackages(prev => prev.map(p => p.id === pkg.id ? { ...p, active: !p.active } : p));
    } catch (e: any) { alert(e.message); }
  }

  async function handleCreate() {
    if (!form.name || !form.price_ugx || !form.duration_hrs) {
      setCreateError('Name, price and duration are required'); return;
    }
    setCreating(true); setCreateError('');
    try {
      const body: any = {
        name: form.name,
        price_ugx: Number(form.price_ugx),
        duration_hrs: Number(form.duration_hrs),
        agent_commission_ugx: Number(form.agent_commission_ugx || 0),
      };
      if (form.speed_mbps) body.speed_mbps = Number(form.speed_mbps);
      if (form.upload_mbps) body.upload_mbps = Number(form.upload_mbps);
      if (form.data_limit_mb) body.data_limit_mb = Number(form.data_limit_mb);

      await api.packages.create(body);
      setCreateOpen(false);
      setForm({ name: '', price_ugx: '', duration_hrs: '', speed_mbps: '', upload_mbps: '', agent_commission_ugx: '', data_limit_mb: '' });
      load();
    } catch (e: any) { setCreateError(e.message); }
    finally { setCreating(false); }
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>
      <h1 className="text-xl font-bold text-white">Manage Packages</h1>
      <p className="text-sm mt-1 mb-4" style={{ color: '#666' }}>
        Create and manage your Hotspot packages and PPPoE subscription plans.
      </p>

      {/* Tabs */}
      <div className="flex items-center gap-0 mb-4" style={{ borderBottom: '1px solid #222' }}>
        <button onClick={() => setTab('hotspot')}
          className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-colors"
          style={tab === 'hotspot' ? { color: '#fff', borderBottom: '2px solid #2563eb' } : { color: '#666', borderBottom: '2px solid transparent' }}>
          Hotspot
          <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: '#1e1e1e', color: '#888' }}>
            {packages.length}
          </span>
        </button>
        <button onClick={() => setTab('pppoe')}
          className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-colors"
          style={tab === 'pppoe' ? { color: '#fff', borderBottom: '2px solid #2563eb' } : { color: '#666', borderBottom: '2px solid transparent' }}>
          PPPoE Plans
          <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: '#1e1e1e', color: '#888' }}>
            {pppoePackages.length}
          </span>
        </button>
      </div>

      {/* Top controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: '#131313', border: '1px solid #222' }}>
          <Search size={13} color="#555" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter packages..."
            className="bg-transparent text-[12px] text-white outline-none w-48 placeholder:text-[#444]"
          />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-white"
            style={{ background: '#2563eb' }}>
            + Create Package
          </button>
          <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[#888]" style={{ background: '#131313', border: '1px solid #222' }}>
            <LayoutGrid size={13} />
          </button>
        </div>
      </div>

      {/* Table card */}
      <div style={{ background: '#131313', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#555] text-sm">Loading...</div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-[#f87171] text-sm">{error}</div>
        ) : tab === 'hotspot' ? (
          <table className="w-full">
            <thead>
              <tr style={{ background: '#111', borderBottom: '1px solid #222' }}>
                {['', 'Package Name', 'Price (UGX)', 'Duration', 'Commission', 'Speed Limit', 'Data Limit', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider" style={{ color: '#555' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPackages.map(pkg => (
                <tr key={pkg.id} style={{ borderBottom: '1px solid #1e1e1e' }} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3"><input type="checkbox" className="accent-[#2563eb] w-3.5 h-3.5" /></td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-white">{pkg.name}</td>
                  <td className="px-4 py-3 text-[13px] font-bold" style={{ color: '#2563eb' }}>
                    {fmtUGX(pkg.price_ugx)}
                  </td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: '#aaa' }}>{fmtDuration(pkg.duration_hrs)}</td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: '#aaa' }}>{fmtUGX(pkg.agent_commission_ugx)}</td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: '#aaa' }}>
                    {pkg.speed_mbps || '∞'}M / {pkg.upload_mbps || '∞'}M
                  </td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: '#888' }}>
                    {pkg.data_limit_mb ? `${(pkg.data_limit_mb / 1024).toFixed(0)}GB` : 'Unlimited'}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleStatus(pkg)}
                      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
                      style={{ background: pkg.active ? '#2563eb' : '#333' }}>
                      <span className="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform"
                        style={{ transform: pkg.active ? 'translateX(18px)' : 'translateX(2px)' }} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <button onClick={() => setOpenMenu(openMenu === pkg.id ? null : pkg.id)}
                        className="p-1 rounded hover:bg-white/10 transition-colors text-[#555]">
                        <MoreHorizontal size={15} />
                      </button>
                      {openMenu === pkg.id && (
                        <div className="absolute right-0 top-7 z-50 rounded-lg overflow-hidden shadow-xl"
                          style={{ background: '#222', border: '1px solid #333', minWidth: 110 }}>
                          {['Edit', 'Delete'].map(a => (
                            <button key={a} onClick={() => setOpenMenu(null)}
                              className="block w-full text-left px-3 py-2 text-[12px] hover:bg-white/10 transition-colors"
                              style={{ color: a === 'Delete' ? '#f87171' : '#ccc' }}>{a}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPackages.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-[#555] text-sm">No packages found</td></tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: '#111', borderBottom: '1px solid #222' }}>
                {['', 'Plan Name', 'Download', 'Upload', 'Price', 'Billing Cycle', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider" style={{ color: '#555' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredPppoe.map(plan => (
                <tr key={plan.id} style={{ borderBottom: '1px solid #1e1e1e' }} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3"><input type="checkbox" className="accent-[#2563eb] w-3.5 h-3.5" /></td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-white">{plan.name}</td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: '#aaa' }}>{plan.download_mbps} Mbps</td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: '#aaa' }}>{plan.upload_mbps} Mbps</td>
                  <td className="px-4 py-3 text-[13px] font-bold" style={{ color: '#2563eb' }}>{fmtUGX(plan.price_ugx)}</td>
                  <td className="px-4 py-3 text-[12px] capitalize" style={{ color: '#aaa' }}>{plan.billing_cycle}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] ${plan.active ? 'bg-[#2563eb]/15 text-[#34d399]' : 'bg-[#1e1e1e] text-[#666]'}`}>
                      {plan.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <button onClick={() => setOpenMenu(openMenu === plan.id ? null : plan.id)}
                        className="p-1 rounded hover:bg-white/10 transition-colors text-[#555]">
                        <MoreHorizontal size={15} />
                      </button>
                      {openMenu === plan.id && (
                        <div className="absolute right-0 top-7 z-50 rounded-lg overflow-hidden shadow-xl"
                          style={{ background: '#222', border: '1px solid #333', minWidth: 110 }}>
                          {['Edit', 'Delete'].map(a => (
                            <button key={a} onClick={() => setOpenMenu(null)}
                              className="block w-full text-left px-3 py-2 text-[12px] hover:bg-white/10 transition-colors"
                              style={{ color: a === 'Delete' ? '#f87171' : '#ccc' }}>{a}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPppoe.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-[#555] text-sm">No PPPoE plans found</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Package Modal */}
      {createOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div style={{ background: '#131313', border: '1px solid #222', borderRadius: 16, padding: '24px', width: 440 }}>
            <div className="flex items-center justify-between mb-5">
              <span className="text-base font-bold text-white">Create Package</span>
              <button onClick={() => setCreateOpen(false)} className="p-1 rounded hover:bg-white/10 text-[#666]">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Package Name', key: 'name', placeholder: 'e.g. 1 Hour Pack', type: 'text' },
                { label: 'Price (UGX)', key: 'price_ugx', placeholder: '1000', type: 'number' },
                { label: 'Duration Hours', key: 'duration_hrs', placeholder: '1', type: 'number' },
                { label: 'Speed Download (Mbps)', key: 'speed_mbps', placeholder: '5', type: 'number' },
                { label: 'Speed Upload (Mbps)', key: 'upload_mbps', placeholder: '2', type: 'number' },
                { label: 'Agent Commission (UGX)', key: 'agent_commission_ugx', placeholder: '100', type: 'number' },
                { label: 'Data Limit MB (optional)', key: 'data_limit_mb', placeholder: '', type: 'number' },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-[11px] text-[#888] mb-1 uppercase tracking-wider">{label}</label>
                  <input
                    type={type}
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-lg text-[13px] text-white outline-none"
                    style={{ background: '#111', border: '1px solid #333' }}
                  />
                </div>
              ))}
            </div>
            {createError && <p className="text-[12px] text-[#f87171] mt-3">{createError}</p>}
            <div className="flex items-center justify-end gap-2 mt-5">
              <button onClick={() => setCreateOpen(false)}
                className="px-4 py-2 rounded-lg text-[12px] text-[#888] hover:bg-white/10 transition-colors">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={creating}
                className="px-4 py-2 rounded-lg text-[12px] font-medium text-white disabled:opacity-60"
                style={{ background: '#2563eb' }}>
                {creating ? 'Creating...' : 'Create Package'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
