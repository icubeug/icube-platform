'use client';
import { useEffect, useState } from 'react';
import { api, PPPoESubscriber, PPPoEPlan, Router, Paginated } from '@/lib/api';
import { Search, Download, Settings, MoreHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react';

function fmtUGX(n: number) {
  return 'UGX ' + new Intl.NumberFormat('en-UG').format(Math.round(n));
}
function fmtDate(d: string) {
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDateShort(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type StatusTab = 'All' | 'Active' | 'Expired';

export default function PPPoEPage() {
  const [data, setData] = useState<Paginated<PPPoESubscriber> | null>(null);
  const [plans, setPlans] = useState<PPPoEPlan[]>([]);
  const [routers, setRouters] = useState<Router[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<StatusTab>('All');
  const [search, setSearch] = useState('');
  const [pkgFilter, setPkgFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [newSubOpen, setNewSubOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [form, setForm] = useState({
    full_name: '', phone: '', email: '', username: '', password: '',
    plan_id: '', router_id: '', ip_address: '',
  });

  async function load() {
    setLoading(true); setError('');
    try {
      const params: any = { page, per_page: perPage };
      if (search) params.search = search;
      if (tab !== 'All') params.status = tab.toLowerCase();
      if (pkgFilter) params.package_id = pkgFilter;
      const [subs, p, r] = await Promise.all([
        api.pppoe.subscribers(params),
        api.pppoe.plans(),
        api.routers.list(),
      ]);
      setData(subs);
      setPlans(p);
      setRouters(r);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [page, perPage, tab, pkgFilter]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const totalPages = data ? Math.ceil(data.total / perPage) : 1;
  const tabs: StatusTab[] = ['All', 'Active', 'Expired'];

  function statusBadge(status: string) {
    const s = status.toLowerCase();
    if (s === 'active') return <span className="px-2 py-0.5 rounded-full text-[11px] bg-[#1D9E75]/15 text-[#34d399]">Active</span>;
    if (s === 'suspended') return <span className="px-2 py-0.5 rounded-full text-[11px] bg-amber-500/15 text-[#fbbf24]">Suspended</span>;
    return <span className="px-2 py-0.5 rounded-full text-[11px] bg-red-500/15 text-[#f87171]">Expired</span>;
  }

  function isExpired(dateStr: string | null): boolean {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  }

  async function handleCreate() {
    if (!form.full_name || !form.username || !form.plan_id || !form.router_id) {
      setCreateError('Name, username, plan and router are required'); return;
    }
    setCreating(true); setCreateError('');
    try {
      const body: any = {
        full_name: form.full_name,
        phone: form.phone,
        username: form.username,
        password: form.password,
        plan_id: form.plan_id,
        router_id: form.router_id,
      };
      if (form.email) body.email = form.email;
      if (form.ip_address) body.ip_address = form.ip_address;
      await api.pppoe.createSubscriber(body);
      setNewSubOpen(false);
      setForm({ full_name: '', phone: '', email: '', username: '', password: '', plan_id: '', router_id: '', ip_address: '' });
      load();
    } catch (e: any) { setCreateError(e.message); }
    finally { setCreating(false); }
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>
      {/* Tabs */}
      <div className="flex items-center gap-0 mb-4" style={{ borderBottom: '1px solid #222' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => { setTab(t); setPage(1); }}
            className="px-4 py-2.5 text-[13px] font-medium transition-colors"
            style={tab === t
              ? { color: '#fff', borderBottom: '2px solid #1D9E75' }
              : { color: '#666', borderBottom: '2px solid transparent' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Top controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: '#1a1a1a', border: '1px solid #222' }}>
            <Search size={13} color="#555" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by account number, name..."
              className="bg-transparent text-[12px] text-white outline-none w-56 placeholder:text-[#444]"
            />
          </div>
          <select value={pkgFilter} onChange={e => { setPkgFilter(e.target.value); setPage(1); }}
            className="text-[11px] text-[#888] bg-[#1a1a1a] border border-[#222] rounded-lg px-2 py-1.5 outline-none">
            <option value="">All Packages</option>
            {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="text-[11px] text-[#888] bg-[#1a1a1a] border border-[#222] rounded-lg px-2 py-1.5 outline-none" />
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="text-[11px] text-[#888] bg-[#1a1a1a] border border-[#222] rounded-lg px-2 py-1.5 outline-none" />
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-[#888]" style={{ background: '#1a1a1a', border: '1px solid #222' }}>
            <Download size={13} /> Export
          </button>
          <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[#888]" style={{ background: '#1a1a1a', border: '1px solid #222' }}>
            <Settings size={13} />
          </button>
          <button onClick={() => setNewSubOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-white"
            style={{ background: '#1D9E75' }}>
            + New Subscriber
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-[#888]" style={{ background: '#1a1a1a', border: '1px solid #222' }}>
            View
          </button>
        </div>
      </div>

      {/* Table card */}
      <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#555] text-sm">Loading...</div>
        ) : error ? (
          <div className="flex items-center justify-center py-16 text-[#f87171] text-sm">{error}</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ background: '#111', borderBottom: '1px solid #222' }}>
                {['', 'Account #', 'Subscriber', 'Plan', 'Status', 'Expiry', 'Note', 'Created', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider" style={{ color: '#555' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.data ?? []).map(sub => (
                <tr key={sub.id} style={{ borderBottom: '1px solid #1e1e1e' }} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="accent-[#1D9E75] w-3.5 h-3.5" />
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-[12px]" style={{ color: '#1D9E75' }}>
                      {sub.account_number || sub.id.slice(0, 8).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[12px] font-semibold text-white">{sub.full_name}</div>
                    <div className="text-[11px]" style={{ color: '#666' }}>{sub.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: '#aaa' }}>{sub.plan_name || '—'}</td>
                  <td className="px-4 py-3">{statusBadge(sub.status)}</td>
                  <td className="px-4 py-3 text-[11px]"
                    style={{ color: isExpired(sub.next_billing_date) ? '#f87171' : '#aaa' }}>
                    {sub.next_billing_date ? fmtDate(sub.next_billing_date) : '—'}
                  </td>
                  <td className="px-4 py-3 text-[11px]" style={{ color: '#666' }}>{sub.note || '—'}</td>
                  <td className="px-4 py-3 text-[11px]" style={{ color: '#666' }}>{fmtDateShort(sub.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <button onClick={() => setOpenMenu(openMenu === sub.id ? null : sub.id)}
                        className="p-1 rounded hover:bg-white/10 transition-colors text-[#555]">
                        <MoreHorizontal size={15} />
                      </button>
                      {openMenu === sub.id && (
                        <div className="absolute right-0 top-7 z-50 rounded-lg overflow-hidden shadow-xl"
                          style={{ background: '#222', border: '1px solid #333', minWidth: 120 }}>
                          {['Edit', 'Renew', 'Suspend', 'Delete'].map(action => (
                            <button key={action} onClick={() => setOpenMenu(null)}
                              className="block w-full text-left px-3 py-2 text-[12px] hover:bg-white/10 transition-colors"
                              style={{ color: action === 'Delete' ? '#f87171' : '#ccc' }}>
                              {action}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(data?.data ?? []).length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-[#555] text-sm">No subscribers found</td></tr>
              )}
            </tbody>
          </table>
        )}

        {/* Pagination footer */}
        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid #222' }}>
          <span className="text-[11px]" style={{ color: '#555' }}>
            Page {page} of {totalPages} | {data?.total ?? 0} Rows
          </span>
          <div className="flex items-center gap-2">
            <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
              className="text-[11px] text-[#888] bg-[#111] border border-[#222] rounded px-2 py-1 outline-none">
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} rows</option>)}
            </select>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="p-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors text-[#888]">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="p-1 rounded hover:bg-white/10 disabled:opacity-30 transition-colors text-[#888]">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* New Subscriber Modal */}
      {newSubOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 16, padding: '24px', width: 460, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between mb-5">
              <span className="text-base font-bold text-white">New Subscriber</span>
              <button onClick={() => setNewSubOpen(false)} className="p-1 rounded hover:bg-white/10 text-[#666]">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Full Name', key: 'full_name', placeholder: 'John Doe', type: 'text' },
                { label: 'Phone', key: 'phone', placeholder: '+256700000000', type: 'text' },
                { label: 'Email', key: 'email', placeholder: 'john@example.com', type: 'email' },
                { label: 'Username', key: 'username', placeholder: 'johndoe', type: 'text' },
                { label: 'Password', key: 'password', placeholder: '••••••••', type: 'password' },
                { label: 'IP Address (optional)', key: 'ip_address', placeholder: '192.168.1.100', type: 'text' },
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
              <div>
                <label className="block text-[11px] text-[#888] mb-1 uppercase tracking-wider">Plan</label>
                <select value={form.plan_id} onChange={e => setForm(prev => ({ ...prev, plan_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-[13px] text-white outline-none"
                  style={{ background: '#111', border: '1px solid #333' }}>
                  <option value="">Select a plan...</option>
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name} — {fmtUGX(p.price_ugx)}/{p.billing_cycle}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-[#888] mb-1 uppercase tracking-wider">Router</label>
                <select value={form.router_id} onChange={e => setForm(prev => ({ ...prev, router_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-[13px] text-white outline-none"
                  style={{ background: '#111', border: '1px solid #333' }}>
                  <option value="">Select a router...</option>
                  {routers.map(r => <option key={r.id} value={r.id}>{r.name} ({r.ip_address})</option>)}
                </select>
              </div>
            </div>
            {createError && <p className="text-[12px] text-[#f87171] mt-3">{createError}</p>}
            <div className="flex items-center justify-end gap-2 mt-5">
              <button onClick={() => setNewSubOpen(false)}
                className="px-4 py-2 rounded-lg text-[12px] text-[#888] hover:bg-white/10 transition-colors">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={creating}
                className="px-4 py-2 rounded-lg text-[12px] font-medium text-white disabled:opacity-60"
                style={{ background: '#1D9E75' }}>
                {creating ? 'Creating...' : 'Create Subscriber'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
