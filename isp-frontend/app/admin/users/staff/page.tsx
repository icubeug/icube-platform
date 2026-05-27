'use client';
import { useEffect, useState, useRef } from 'react';
import { api, StaffMember, Paginated } from '@/lib/api';
import { Search, Download, LayoutGrid, MoreHorizontal, CheckCircle, Minus, ChevronLeft, ChevronRight } from 'lucide-react';

function fmtUGX(n: number) {
  return 'UGX ' + new Intl.NumberFormat('en-UG').format(Math.round(n));
}
function fmtDate(d: string) {
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDateShort(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(d: string | null): string {
  if (!d) return 'Never';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDateShort(d);
}

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

type RoleFilter = 'All' | 'Admin' | 'Viewer' | 'Agent';

export default function StaffPage() {
  const [data, setData] = useState<Paginated<StaffMember> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true); setError('');
    try {
      const params: any = { page, per_page: perPage };
      if (search) params.search = search;
      if (roleFilter !== 'All') params.role = roleFilter.toLowerCase();
      const result = await api.users.staff(params);
      setData(result);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [page, perPage, roleFilter]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const totalPages = data ? Math.ceil(data.total / perPage) : 1;
  const roles: RoleFilter[] = ['All', 'Admin', 'Viewer', 'Agent'];

  function roleBadge(role: string) {
    if (role === 'admin') return <span className="px-2 py-0.5 rounded-full text-[11px] bg-[#1D9E75]/15 text-[#34d399]">Admin</span>;
    if (role === 'agent') return <span className="px-2 py-0.5 rounded-full text-[11px] bg-blue-500/15 text-[#60a5fa]">Agent</span>;
    return <span className="px-2 py-0.5 rounded-full text-[11px] bg-[#1e1e1e] text-[#666]">Viewer</span>;
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>
      <h1 className="text-xl font-bold text-white mb-4">Staff</h1>

      {/* Top controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: '#1a1a1a', border: '1px solid #222' }}>
            <Search size={13} color="#555" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search staff..."
              className="bg-transparent text-[12px] text-white outline-none w-48 placeholder:text-[#444]"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="text-[11px] text-[#888] bg-[#1a1a1a] border border-[#222] rounded-lg px-2 py-1.5 outline-none" />
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="text-[11px] text-[#888] bg-[#1a1a1a] border border-[#222] rounded-lg px-2 py-1.5 outline-none" />
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-white"
            style={{ background: '#1D9E75' }}>
            + New User
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-[#888]" style={{ background: '#1a1a1a', border: '1px solid #222' }}>
            <Download size={13} /> Export
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-[#888]" style={{ background: '#1a1a1a', border: '1px solid #222' }}>
            <LayoutGrid size={13} /> View
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-4">
        {roles.map(r => (
          <button key={r} onClick={() => { setRoleFilter(r); setPage(1); }}
            className="px-3 py-1 rounded-full text-[12px] font-medium transition-colors"
            style={roleFilter === r
              ? { background: 'rgba(29,158,117,0.2)', color: '#1D9E75' }
              : { background: '#1a1a1a', color: '#666' }}>
            {r}
          </button>
        ))}
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
                {['', 'Name / Email', 'Phone', 'Hotspot', 'Role', 'Last Login', 'Join On', 'Printer', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider" style={{ color: '#555' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.data ?? []).map((s, i) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #1e1e1e' }} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="accent-[#1D9E75] w-3.5 h-3.5" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #1D9E75, #0d7a59)' }}>
                        {getInitials(s.name || '?')}
                      </div>
                      <div>
                        <div className="text-[12px] font-semibold text-white">{s.name}</div>
                        <div className="text-[10px]" style={{ color: '#666' }}>{s.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: '#aaa' }}>{s.phone || '—'}</td>
                  <td className="px-4 py-3 text-[11px]" style={{ color: '#888' }}>{s.site_id || '—'}</td>
                  <td className="px-4 py-3">{roleBadge(s.role)}</td>
                  <td className="px-4 py-3 text-[11px]" style={{ color: '#666' }}>{timeAgo(s.last_login_at)}</td>
                  <td className="px-4 py-3 text-[11px]" style={{ color: '#666' }}>{fmtDateShort(s.created_at)}</td>
                  <td className="px-4 py-3">
                    {s.requires_printer
                      ? <CheckCircle size={15} color="#1D9E75" />
                      : <span className="text-[#444]">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative" ref={openMenu === s.id ? menuRef : null}>
                      <button onClick={() => setOpenMenu(openMenu === s.id ? null : s.id)}
                        className="p-1 rounded hover:bg-white/10 transition-colors text-[#555]">
                        <MoreHorizontal size={15} />
                      </button>
                      {openMenu === s.id && (
                        <div className="absolute right-0 top-7 z-50 rounded-lg overflow-hidden shadow-xl"
                          style={{ background: '#222', border: '1px solid #333', minWidth: 120 }}>
                          {['Edit', 'Suspend', 'Delete'].map(action => (
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
                <tr><td colSpan={9} className="px-4 py-12 text-center text-[#555] text-sm">No staff found</td></tr>
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
    </div>
  );
}
