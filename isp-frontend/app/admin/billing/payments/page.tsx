'use client';
import { useState, useEffect } from 'react';
import { Download, LayoutGrid } from 'lucide-react';
import { api, BillingInvoice, Paginated } from '@/lib/api';

function fmt(n: number) {
  return 'UGX ' + new Intl.NumberFormat('en-UG').format(n);
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-UG', { year: 'numeric', month: 'long', day: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === 'paid') return <span className="badge-green">Paid</span>;
  if (s === 'pending') return <span className="badge-amber">Pending</span>;
  if (s === 'failed') return <span className="badge-red">Failed</span>;
  return <span className="badge-slate">{status}</span>;
}

const STATUS_FILTERS = ['All', 'Paid', 'Pending', 'Failed'];
const PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function BillingPaymentsPage() {
  const [rows, setRows] = useState<BillingInvoice[]>([]);
  const [credit, setCredit] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    try {
      const res = await api.billing.payments({
        page,
        per_page: perPage,
        status: filter === 'All' ? undefined : filter.toLowerCase(),
      }) as Paginated<BillingInvoice> & { account_credit: number };
      setRows(res.data);
      setTotal(res.total);
      setCredit(res.account_credit ?? 0);
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filter, page, perPage]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === rows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r.id)));
    }
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>
      {/* Top row */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">Billing Payments</h1>
          <span
            style={{
              background: 'rgba(29,158,117,0.15)',
              color: '#1D9E75',
              borderRadius: 8,
              padding: '2px 12px',
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            Account Credit: {fmt(credit)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            style={{
              background: '#1D9E75',
              color: '#fff',
              borderRadius: 8,
              padding: '7px 16px',
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Make Payment
          </button>
          <button
            style={{
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              color: '#aaa',
              borderRadius: 8,
              padding: '7px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Download size={14} />
          </button>
          <button
            style={{
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              color: '#aaa',
              borderRadius: 8,
              padding: '7px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <LayoutGrid size={14} />
          </button>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-2 mb-4">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(1); }}
            style={{
              background: filter === f ? '#1D9E75' : '#1a1a1a',
              color: filter === f ? '#fff' : '#888',
              border: filter === f ? 'none' : '1px solid #2a2a2a',
              borderRadius: 9999,
              padding: '4px 14px',
              fontSize: 12,
              fontWeight: filter === f ? 600 : 400,
              cursor: 'pointer',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: '#111' }}>
              <th style={{ width: 40, padding: '10px 16px' }}>
                <input
                  type="checkbox"
                  checked={rows.length > 0 && selected.size === rows.length}
                  onChange={toggleAll}
                  style={{ accentColor: '#1D9E75' }}
                />
              </th>
              {['Description', 'Date', 'Amount', 'ID', 'Payer', 'Payer Name', 'Status'].map((col) => (
                <th
                  key={col}
                  className="text-left"
                  style={{
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#555',
                    padding: '10px 16px',
                    fontWeight: 600,
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#555', fontSize: 13 }}>
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#555', fontSize: 13 }}>
                  No payments found
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  style={{ borderBottom: '1px solid #1e1e1e' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#1e1e1e')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px 16px' }}>
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleSelect(row.id)}
                      style={{ accentColor: '#1D9E75' }}
                    />
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#fff', fontWeight: 500 }}>
                    {row.description || '—'}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#666' }}>
                    {fmtDate(row.created_at)}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#aaa' }}>
                    {fmt(Number(row.amount))}
                  </td>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 11, color: '#1D9E75' }}>
                    {row.id.slice(0, 12)}...
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#666' }}>
                    {row.payer || '—'}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#666' }}>
                    {row.payer_name || '—'}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div
          className="flex items-center justify-between"
          style={{ padding: '10px 16px', borderTop: '1px solid #1e1e1e' }}
        >
          <div className="flex items-center gap-3">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              style={{
                background: '#111',
                border: '1px solid #2a2a2a',
                color: page <= 1 ? '#444' : '#aaa',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 12,
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              ‹
            </button>
            <span style={{ fontSize: 12, color: '#666' }}>
              Page {page} of {totalPages} | {total} Rows
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={{
                background: '#111',
                border: '1px solid #2a2a2a',
                color: page >= totalPages ? '#444' : '#aaa',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 12,
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              ›
            </button>
          </div>
          <select
            value={perPage}
            onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
            className="input"
            style={{ width: 80, fontSize: 12, padding: '4px 8px' }}
          >
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n} rows</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
