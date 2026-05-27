'use client';
import { useEffect, useState } from 'react';
import { api, FloatPurchase } from '@/lib/api';
import { AlertCircle, Download, LayoutGrid } from 'lucide-react';

// ── Utility functions ──────────────────────────────────────────────────────────
function fmtUGX(n: number) {
  return 'UGX ' + new Intl.NumberFormat('en-UG').format(Math.round(n));
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Pagination ─────────────────────────────────────────────────────────────────
function Pagination({
  page, total, perPage,
  onPage, onPerPage,
}: {
  page: number; total: number; perPage: number;
  onPage: (p: number) => void; onPerPage: (n: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  return (
    <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid #1e1e1e' }}>
      <span className="text-[11px]" style={{ color: '#555' }}>
        Page {page} of {totalPages} &nbsp;|&nbsp; {total} Rows
      </span>
      <div className="flex items-center gap-2">
        <select
          value={perPage}
          onChange={e => onPerPage(Number(e.target.value))}
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', borderRadius: 6, padding: '3px 8px', fontSize: 11, outline: 'none' }}
        >
          {[10, 20, 50].map(n => <option key={n} value={n}>{n} rows</option>)}
        </select>
        <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page <= 1}
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: page <= 1 ? '#444' : '#888', borderRadius: 6, padding: '3px 8px', fontSize: 14, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>‹</button>
        <button onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: page >= totalPages ? '#444' : '#888', borderRadius: 6, padding: '3px 8px', fontSize: 14, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}>›</button>
      </div>
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === 'completed' || status === 'success')
    return <span style={{ background: 'rgba(29,158,117,0.15)', color: '#34d399', fontSize: 10, borderRadius: 9999, padding: '2px 8px', fontWeight: 600 }}>Success</span>;
  if (status === 'failed')
    return <span style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', fontSize: 10, borderRadius: 9999, padding: '2px 8px', fontWeight: 600 }}>Failed</span>;
  return <span style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', fontSize: 10, borderRadius: 9999, padding: '2px 8px', fontWeight: 600 }}>Pending</span>;
}

// ── TH helper ─────────────────────────────────────────────────────────────────
function TH({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-[11px] font-semibold uppercase tracking-wider"
      style={{ color: '#555', background: '#111', padding: '10px 12px', borderBottom: '1px solid #1e1e1e', textAlign: 'left', whiteSpace: 'nowrap' }}>
      {children}
    </th>
  );
}

// ── Purchase row ───────────────────────────────────────────────────────────────
function PurchaseRow({ row }: { row: FloatPurchase }) {
  const [hovered, setHovered] = useState(false);
  return (
    <tr
      style={{ borderBottom: '1px solid #1e1e1e', background: hovered ? '#1e1e1e' : 'transparent' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td style={{ padding: '10px 12px' }}>
        <input type="checkbox" style={{ accentColor: '#1D9E75' }} />
      </td>
      <td style={{ padding: '10px 12px', fontSize: 11, color: '#666' }}>{fmtDate(row.created_at)}</td>
      <td style={{ padding: '10px 12px', fontSize: 12, color: '#fff', fontWeight: 500 }}>{row.agent_name}</td>
      <td style={{ padding: '10px 12px', fontSize: 12, color: '#aaa' }}>{row.seller_name || '—'}</td>
      <td style={{ padding: '10px 12px' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#1D9E75' }}>{row.id.slice(0, 12)}…</span>
      </td>
      <td style={{ padding: '10px 12px', fontSize: 12, color: '#1D9E75', fontWeight: 600 }}>{fmtUGX(row.amount)}</td>
      <td style={{ padding: '10px 12px', fontSize: 12, color: '#aaa' }}>{fmtUGX(row.created_float)}</td>
      <td style={{ padding: '10px 12px', fontSize: 12, color: '#888' }}>{row.payer || '—'}</td>
      <td style={{ padding: '10px 12px' }}><StatusBadge status={row.status} /></td>
    </tr>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function FloatPurchasesPage() {
  const [data, setData]         = useState<FloatPurchase[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [perPage, setPerPage]   = useState(20);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate]     = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  function load(p = page, pp = perPage) {
    setLoading(true); setError('');
    api.float.purchases({ page: p, per_page: pp, from: fromDate || undefined, to: toDate || undefined })
      .then(res => { setData(res.data); setTotal(res.total); })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(1, perPage); }, []);

  const inputStyle = {
    background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888',
    borderRadius: 8, padding: '6px 10px', fontSize: 12, outline: 'none',
  };

  const filteredData = statusFilter === 'all'
    ? data
    : data.filter(r => r.status === statusFilter || (statusFilter === 'success' && r.status === 'completed'));

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>

      {/* Controls row */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Float Purchases</h1>
        <div className="flex items-center gap-2">
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={inputStyle} />
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={inputStyle} />
          <button onClick={() => { setPage(1); load(1, perPage); }}
            style={{ ...inputStyle, background: '#1D9E75', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Download size={12} /> Export
          </button>
          <button style={{ ...inputStyle, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <LayoutGrid size={14} color="#666" />
          </button>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'all',      label: 'All' },
          { key: 'success',  label: 'Success' },
          { key: 'pending',  label: 'Pending' },
          { key: 'failed',   label: 'Failed' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            style={{
              background: statusFilter === key ? 'rgba(29,158,117,0.2)' : '#1a1a1a',
              color: statusFilter === key ? '#1D9E75' : '#666',
              border: `1px solid ${statusFilter === key ? 'rgba(29,158,117,0.3)' : '#2a2a2a'}`,
              borderRadius: 9999, padding: '4px 12px', fontSize: 11, fontWeight: 500, cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 text-sm text-red-400"
          style={{ background: '#2a1515', border: '1px solid #4a2020', borderRadius: 8, padding: '10px 14px' }}>
          <AlertCircle size={14} />{error}
        </div>
      )}

      {/* Table card */}
      <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-[#1D9E75] border-t-transparent animate-spin" />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <TH><input type="checkbox" style={{ accentColor: '#1D9E75' }} /></TH>
                  <TH>Date</TH>
                  <TH>Agent</TH>
                  <TH>Seller</TH>
                  <TH>ID</TH>
                  <TH>Amount</TH>
                  <TH>Created Float</TH>
                  <TH>Payer</TH>
                  <TH>Status</TH>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: '#555', fontSize: 13 }}>No purchases found</td></tr>
                ) : (
                  filteredData.map(row => <PurchaseRow key={row.id} row={row} />)
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page} total={total} perPage={perPage}
          onPage={p => { setPage(p); load(p, perPage); }}
          onPerPage={n => { setPerPage(n); setPage(1); load(1, n); }}
        />
      </div>
    </div>
  );
}
