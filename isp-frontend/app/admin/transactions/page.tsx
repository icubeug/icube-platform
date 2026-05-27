'use client';
import { useEffect, useState } from 'react';
import { api, PlatformTransaction, Paginated } from '@/lib/api';
import { Search, Download, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';

function fmtUGX(n: number) {
  return 'UGX ' + new Intl.NumberFormat('en-UG').format(Math.round(n));
}
function fmtDate(d: string) {
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDateShort(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type OpFilter = 'All' | 'Debit' | 'Credit';

export default function TransactionsPage() {
  const [data, setData] = useState<Paginated<PlatformTransaction> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [opFilter, setOpFilter] = useState<OpFilter>('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  async function load() {
    setLoading(true); setError('');
    try {
      const params: any = { page, per_page: perPage };
      if (search) params.search = search;
      if (opFilter !== 'All') params.operation = opFilter.toLowerCase();
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const result = await api.transactions.list(params);
      setData(result);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [page, perPage, opFilter, fromDate, toDate]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const totalPages = data ? Math.ceil(data.total / perPage) : 1;
  const filters: OpFilter[] = ['All', 'Debit', 'Credit'];

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold text-white">Transactions</h1>
        <div className="flex items-center gap-2">
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="text-[11px] text-[#888] bg-[#1a1a1a] border border-[#222] rounded-lg px-2 py-1.5 outline-none" />
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="text-[11px] text-[#888] bg-[#1a1a1a] border border-[#222] rounded-lg px-2 py-1.5 outline-none" />
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-[#888]" style={{ background: '#1a1a1a', border: '1px solid #222' }}>
            <Download size={13} /> Export
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-[#888]" style={{ background: '#1a1a1a', border: '1px solid #222' }}>
            <LayoutGrid size={13} /> View
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg mb-4 w-full" style={{ background: '#1a1a1a', border: '1px solid #222' }}>
        <Search size={13} color="#555" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by memo, request ID..."
          className="bg-transparent text-[12px] text-white outline-none flex-1 placeholder:text-[#444]"
        />
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-4">
        {filters.map(f => (
          <button key={f} onClick={() => { setOpFilter(f); setPage(1); }}
            className="px-3 py-1 rounded-full text-[12px] font-medium transition-colors"
            style={opFilter === f
              ? { background: 'rgba(29,158,117,0.2)', color: '#1D9E75' }
              : { background: '#1a1a1a', color: '#666' }}>
            {f}
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
                {['Created On', 'Transaction ID', 'Request ID', 'Operation', 'Note', 'Amount', 'Balance'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider" style={{ color: '#555' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.data ?? []).map(tx => (
                <tr key={tx.id} style={{ borderBottom: '1px solid #1e1e1e' }} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-[11px]" style={{ color: '#666' }}>{fmtDate(tx.created_at)}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-[11px]" style={{ color: '#1D9E75' }}>
                      {tx.transaction_id || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-[11px]" style={{ color: '#888' }}>
                      {tx.request_id || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {tx.operation === 'debit'
                      ? <span className="px-2 py-0.5 rounded-full text-[11px] bg-red-500/15 text-[#f87171]">Debit</span>
                      : <span className="px-2 py-0.5 rounded-full text-[11px] bg-[#1D9E75]/15 text-[#34d399]">Credit</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: '#aaa' }}>{tx.note || '—'}</td>
                  <td className="px-4 py-3">
                    {tx.operation === 'debit' ? (
                      <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-red-500/10 text-[#f87171]">
                        - {fmtUGX(tx.amount)}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-[#1D9E75]/10 text-[#34d399]">
                        + {fmtUGX(tx.amount)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px]" style={{ color: '#aaa' }}>
                    {tx.balance_after != null ? fmtUGX(tx.balance_after) : '—'}
                  </td>
                </tr>
              ))}
              {(data?.data ?? []).length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-[#555] text-sm">No transactions found</td></tr>
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
