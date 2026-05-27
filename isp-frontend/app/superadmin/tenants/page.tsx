'use client';
import { useEffect, useState, useCallback } from 'react';
import { Search, Filter, Users, ChevronRight, Circle } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  active: '#1D9E75', trial: '#f59e0b', suspended: '#ef4444', cancelled: '#555',
};

function fmtUGX(n: number) {
  if (n >= 1_000_000) return `${(n/1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n/1_000).toFixed(0)}K`;
  return `${n}`;
}

export default function SuperadminTenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [q, setQ]             = useState('');
  const [status, setStatus]   = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('sa_token');
    const params = new URLSearchParams({ page: String(page), per_page: '25' });
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    const res = await fetch(`/api/superadmin/tenants?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const d = await res.json();
    setTenants(d.data || []);
    setTotal(d.total || 0);
    setLoading(false);
  }, [page, q, status]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ minHeight: '100vh', background: '#080808', padding: '24px 28px', color: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Tenants</h1>
          <p style={{ fontSize: 12, color: '#444', margin: 0 }}>{total} ISPs on iCube</p>
        </div>
        <a href="/superadmin/tenants/new"
          style={{ background: '#6366f1', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          + Onboard Tenant
        </a>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#444' }} />
          <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }}
            placeholder="Search by name or subdomain…"
            style={{ width: '100%', background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: '9px 12px 9px 34px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: '9px 14px', fontSize: 13, color: status ? '#fff' : '#555', outline: 'none' }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspended</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#0d0d0d' }}>
              {['Tenant', 'Plan', 'Status', 'Admins', 'Routers', 'Fees Paid', 'Trial Ends', ''].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, color: '#444', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ width: 18, height: 18, border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
              </td></tr>
            ) : tenants.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#333', fontSize: 13 }}>No tenants found</td></tr>
            ) : tenants.map(t => (
              <tr key={t.id} style={{ borderTop: '1px solid #1a1a1a', cursor: 'pointer' }}
                className="hover:bg-[#141414]"
                onClick={() => window.location.href = `/superadmin/tenants/${t.id}`}>
                <td style={{ padding: '13px 16px' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0 }}>{t.name}</p>
                  <p style={{ fontSize: 10, color: '#444', margin: '2px 0 0' }}>{t.subdomain}.icube.co.ug</p>
                </td>
                <td style={{ padding: '13px 16px', fontSize: 12, color: '#888', textTransform: 'capitalize' }}>{t.plan}</td>
                <td style={{ padding: '13px 16px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: STATUS_COLORS[t.status] || '#555', background: `${STATUS_COLORS[t.status] || '#555'}18`, borderRadius: 99, padding: '3px 9px' }}>
                    <Circle size={6} style={{ fill: STATUS_COLORS[t.status] || '#555', color: STATUS_COLORS[t.status] || '#555' }} />
                    {t.status}
                  </span>
                </td>
                <td style={{ padding: '13px 16px', fontSize: 12, color: '#888' }}>{t.admin_count}</td>
                <td style={{ padding: '13px 16px', fontSize: 12, color: '#888' }}>{t.router_count}</td>
                <td style={{ padding: '13px 16px', fontSize: 12, color: '#aaa' }}>
                  UGX {fmtUGX(parseFloat(t.total_fees || 0))}
                </td>
                <td style={{ padding: '13px 16px', fontSize: 11, color: t.trial_ends_at && new Date(t.trial_ends_at) < new Date() ? '#ef4444' : '#555' }}>
                  {t.trial_ends_at ? new Date(t.trial_ends_at).toLocaleDateString() : '—'}
                </td>
                <td style={{ padding: '13px 16px' }}>
                  <ChevronRight size={14} style={{ color: '#333' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {total > 25 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#444' }}>
              Showing {(page-1)*25+1}–{Math.min(page*25, total)} of {total}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>
                ← Prev
              </button>
              <button onClick={() => setPage(p => p+1)} disabled={page*25 >= total}
                style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: page*25 >= total ? 'not-allowed' : 'pointer', opacity: page*25 >= total ? 0.4 : 1 }}>
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
