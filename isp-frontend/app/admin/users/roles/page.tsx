'use client';
import { useEffect, useState } from 'react';
import { api, Role, Paginated } from '@/lib/api';
import { LayoutGrid, Shield, MoreHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react';

function fmtDateShort(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const ALL_PERMISSIONS = ['all', 'hotspot', 'sales', 'pos', 'vouchers', 'support', 'analytics', 'settings'];

export default function RolesPage() {
  const [data, setData] = useState<Paginated<Role> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const result = await api.users.roles({ page, per_page: perPage });
      setData(result);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [page, perPage]);

  const totalPages = data ? Math.ceil(data.total / perPage) : 1;

  function togglePermission(p: string) {
    setPermissions(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  }

  async function handleCreate() {
    if (!roleName.trim()) { setCreateError('Role name is required'); return; }
    setCreating(true); setCreateError('');
    try {
      await api.users.createRole({ name: roleName.trim(), permissions });
      setCreateOpen(false);
      setRoleName('');
      setPermissions([]);
      load();
    } catch (e: any) { setCreateError(e.message); }
    finally { setCreating(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this role?')) return;
    try {
      await api.users.deleteRole(id);
      load();
    } catch (e: any) { alert(e.message); }
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Role Management</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-white"
            style={{ background: '#1D9E75' }}>
            + Create Role
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-[#888]" style={{ background: '#1a1a1a', border: '1px solid #222' }}>
            <LayoutGrid size={13} /> Columns
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
                {['', 'Name', 'Created At', 'Permissions', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider" style={{ color: '#555' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.data ?? []).map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #1e1e1e' }} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="accent-[#1D9E75] w-3.5 h-3.5" />
                  </td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-white">{r.name}</td>
                  <td className="px-4 py-3 text-[11px]" style={{ color: '#666' }}>{fmtDateShort(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Shield size={13} color="#1D9E75" />
                      <span className="text-[11px]" style={{ color: '#888' }}>
                        {r.permissions?.length ?? 0} permission{(r.permissions?.length ?? 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative">
                      <button onClick={() => setOpenMenu(openMenu === r.id ? null : r.id)}
                        className="p-1 rounded hover:bg-white/10 transition-colors text-[#555]">
                        <MoreHorizontal size={15} />
                      </button>
                      {openMenu === r.id && (
                        <div className="absolute right-0 top-7 z-50 rounded-lg overflow-hidden shadow-xl"
                          style={{ background: '#222', border: '1px solid #333', minWidth: 120 }}>
                          <button onClick={() => setOpenMenu(null)}
                            className="block w-full text-left px-3 py-2 text-[12px] hover:bg-white/10 transition-colors text-[#ccc]">
                            Edit
                          </button>
                          <button onClick={() => { setOpenMenu(null); handleDelete(r.id); }}
                            className="block w-full text-left px-3 py-2 text-[12px] hover:bg-white/10 transition-colors text-[#f87171]">
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(data?.data ?? []).length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-[#555] text-sm">No roles found</td></tr>
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
              {[10, 20, 50].map(n => <option key={n} value={n}>{n} rows</option>)}
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

      {/* Create Role Modal */}
      {createOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 16, padding: '24px', width: 400 }}>
            <div className="flex items-center justify-between mb-5">
              <span className="text-base font-bold text-white">Create Role</span>
              <button onClick={() => setCreateOpen(false)} className="p-1 rounded hover:bg-white/10 text-[#666]">
                <X size={16} />
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-[11px] text-[#888] mb-1.5 uppercase tracking-wider">Role Name</label>
              <input
                value={roleName}
                onChange={e => setRoleName(e.target.value)}
                placeholder="e.g. Cashier"
                className="w-full px-3 py-2 rounded-lg text-[13px] text-white outline-none"
                style={{ background: '#111', border: '1px solid #333' }}
              />
            </div>
            <div className="mb-5">
              <label className="block text-[11px] text-[#888] mb-2 uppercase tracking-wider">Permissions</label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_PERMISSIONS.map(p => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions.includes(p)}
                      onChange={() => togglePermission(p)}
                      className="accent-[#1D9E75] w-3.5 h-3.5"
                    />
                    <span className="text-[12px] text-[#aaa] capitalize">{p}</span>
                  </label>
                ))}
              </div>
            </div>
            {createError && <p className="text-[12px] text-[#f87171] mb-3">{createError}</p>}
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setCreateOpen(false)}
                className="px-4 py-2 rounded-lg text-[12px] text-[#888] hover:bg-white/10 transition-colors">
                Cancel
              </button>
              <button onClick={handleCreate} disabled={creating}
                className="px-4 py-2 rounded-lg text-[12px] font-medium text-white disabled:opacity-60"
                style={{ background: '#1D9E75' }}>
                {creating ? 'Creating...' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
