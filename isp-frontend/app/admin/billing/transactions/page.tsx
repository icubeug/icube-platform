'use client';
import { useState, useEffect } from 'react';
import { Download, LayoutGrid } from 'lucide-react';
import { api, PlatformTransaction, Paginated } from '@/lib/api';

function fmt(n: number) {
  return 'UGX ' + new Intl.NumberFormat('en-UG').format(n);
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-UG', { year: 'numeric', month: 'long', day: 'numeric' });
}

const FILTER_OPTIONS = ['All', 'Debit', 'Credit'];
const PER_PAGE_OPTIONS = [10, 25, 50];

export default function TransactionsPage() {
  const [rows, setRows] = useState<PlatformTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage, setPerPage] = useState(25);

  async function load() {
    setLoading(true);
    try {
      const res = await api.billing.transactions({
        page,
        per_page: perPage,
        operation: filter === 'All' ? undefined : filter.toLowerCase() as 'debit' | 'credit',
        from: from || undefined,
        to: to || undefined,
      }) as Paginated<PlatformTransaction>;
      setRows(res.data);
      setTotal(res.total);
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filter, page, perPage, from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-xl font-bold text-white">Prepaid Balance Transactions</h1>
          <p className="text-xs mt-1" style={{ color: '#666' }}>
            Monitor all historical platform charges, top-ups, and SMS deductions mapped against your prepaid balance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="input"
            style={{ width: 130, fontSize: 12 }}
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          />
          <input
            type="date"
            className="input"
            style={{ width: 130, fontSize: 12 }}
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
          />
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

      {/* Filter pills */}
      <div className="flex items-center gap-2 mt-4 mb-4">
        {FILTER_OPTIONS.map((f) => (
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
              {['Created On', 'Transaction ID', 'Operation', 'Note', 'Amount', 'Balance'].map((col) => (
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
                <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#555', fontSize: 13 }}>
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#555', fontSize: 13 }}>
                  No transactions found
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
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#666' }}>
                    {fmtDate(row.created_at)}
                  </td>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 11, color: '#1D9E75' }}>
                    {row.transaction_id || row.id}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    {row.operation === 'debit' ? (
                      <span className="badge-red">Debit</span>
                    ) : (
                      <span className="badge-green">Credit</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#888' }}>
                    {row.note || '—'}
                  </td>
                  <td
                    style={{
                      padding: '10px 16px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: row.operation === 'debit' ? '#ef4444' : '#1D9E75',
                    }}
                  >
                    {row.operation === 'debit' ? '-' : '+'}{fmt(Number(row.amount))}
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#aaa' }}>
                    {row.balance_after != null ? fmt(Number(row.balance_after)) : '—'}
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
