'use client';
import { useEffect, useState } from 'react';
import { api, Disbursement, Paginated } from '@/lib/api';
import { Search, Download, LayoutGrid, X, ChevronLeft, ChevronRight } from 'lucide-react';

function fmtUGX(n: number) {
  return 'UGX ' + new Intl.NumberFormat('en-UG').format(Math.round(n));
}
function fmtDate(d: string) {
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDateShort(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DisbursementsPage() {
  const [data, setData] = useState<(Paginated<Disbursement> & { total_disbursed: number }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [disburseOpen, setDisburseOpen] = useState(false);
  const [disbursing, setDisbursing] = useState(false);
  const [disburseError, setDisburseError] = useState('');
  const [form, setForm] = useState({ phone: '', payee: '', amount_ugx: '', reason: '' });

  async function load() {
    setLoading(true); setError('');
    try {
      const params: any = { page, per_page: perPage };
      if (search) params.search = search;
      if (dateFilter) params.from = dateFilter;
      const result = await api.disbursements.list(params);
      setData(result);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [page, perPage, dateFilter]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const totalPages = data ? Math.ceil(data.total / perPage) : 1;

  async function handleDisburse() {
    if (!form.phone || !form.amount_ugx) { setDisburseError('Phone and amount are required'); return; }
    setDisbursing(true); setDisburseError('');
    try {
      await api.disbursements.create({
        phone: form.phone,
        payee: form.payee || undefined,
        amount_ugx: Number(form.amount_ugx),
        reason: form.reason || undefined,
      });
      setDisburseOpen(false);
      setForm({ phone: '', payee: '', amount_ugx: '', reason: '' });
      load();
    } catch (e: any) { setDisburseError(e.message); }
    finally { setDisbursing(false); }
  }

  function statusBadge(status: string) {
    if (status === 'success') return <span className="px-2 py-0.5 rounded-full text-[11px] bg-[#1D9E75]/15 text-[#34d399]">Success</span>;
    if (status === 'pending') return <span className="px-2 py-0.5 rounded-full text-[11px] bg-amber-500/15 text-[#fbbf24]">Pending</span>;
    return <span className="px-2 py-0.5 rounded-full text-[11px] bg-red-500/15 text-[#f87171]">Failed</span>;
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-white">Disbursements</h1>
          {data && (
            <span className="px-3 py-1 rounded-full text-[12px] font-semibold bg-[#1D9E75]/15 text-[#34d399]">
              Balance: {fmtUGX(data.total_disbursed)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            placeholder="Pick date made"
            className="text-[11px] text-[#888] bg-[#1a1a1a] border border-[#222] rounded-lg px-2 py-1.5 outline-none" />
          <button onClick={() => setDisburseOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-white"
            style={{ background: '#1D9E75' }}>
            Disburse
          </button>
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
          placeholder="Search by reason, memo, request..."
          className="bg-transparent text-[12px] text-white outline-none flex-1 placeholder:text-[#444]"
        />
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
                {['', 'Created On', 'Phone', 'Payee', 'Amount', 'Transaction ID', 'Charges', 'Reason', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider" style={{ color: '#555' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.data ?? []).map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid #1e1e1e' }} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="accent-[#1D9E75] w-3.5 h-3.5" />
                  </td>
                  <td className="px-4 py-3 text-[11px]" style={{ color: '#666' }}>{fmtDate(d.created_at)}</td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: '#aaa' }}>{d.phone}</td>
                  <td className="px-4 py-3 text-[12px] font-medium text-white">{d.payee || '—'}</td>
                  <td className="px-4 py-3 text-[13px] font-bold" style={{ color: '#1D9E75' }}>{fmtUGX(d.amount_ugx)}</td>
                  <td className="px-4 py-3 font-mono text-[11px]" style={{ color: '#888' }}>{d.transaction_id || '—'}</td>
                  <td className="px-4 py-3 text-[11px]" style={{ color: '#666' }}>{fmtUGX(d.charges)}</td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: '#aaa' }}>{d.reason || '—'}</td>
                  <td className="px-4 py-3">{statusBadge(d.status)}</td>
                </tr>
              ))}
              {(data?.data ?? []).length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-[#555] text-sm">No disbursements found</td></tr>
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

      {/* Disburse Modal */}
      {disburseOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 16, padding: '24px', width: 420 }}>
            <div className="flex items-center justify-between mb-5">
              <span className="text-base font-bold text-white">Disburse Funds</span>
              <button onClick={() => setDisburseOpen(false)} className="p-1 rounded hover:bg-white/10 text-[#666]">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-[#888] mb-1 uppercase tracking-wider">Phone (+256...)</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+256700000000"
                  className="w-full px-3 py-2 rounded-lg text-[13px] text-white outline-none"
                  style={{ background: '#111', border: '1px solid #333' }}
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#888] mb-1 uppercase tracking-wider">Payee (Full name)</label>
                <input
                  value={form.payee}
                  onChange={e => setForm(prev => ({ ...prev, payee: e.target.value }))}
                  placeholder="John Doe"
                  className="w-full px-3 py-2 rounded-lg text-[13px] text-white outline-none"
                  style={{ background: '#111', border: '1px solid #333' }}
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#888] mb-1 uppercase tracking-wider">Amount (UGX)</label>
                <input
                  type="number"
                  value={form.amount_ugx}
                  onChange={e => setForm(prev => ({ ...prev, amount_ugx: e.target.value }))}
                  placeholder="50000"
                  className="w-full px-3 py-2 rounded-lg text-[13px] text-white outline-none"
                  style={{ background: '#111', border: '1px solid #333' }}
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#888] mb-1 uppercase tracking-wider">Reason</label>
                <textarea
                  value={form.reason}
                  onChange={e => setForm(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Reason for disbursement..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-[13px] text-white outline-none resize-none"
                  style={{ background: '#111', border: '1px solid #333' }}
                />
              </div>
            </div>
            {disburseError && <p className="text-[12px] text-[#f87171] mt-3">{disburseError}</p>}
            <div className="flex items-center justify-end gap-2 mt-5">
              <button onClick={() => setDisburseOpen(false)}
                className="px-4 py-2 rounded-lg text-[12px] text-[#888] hover:bg-white/10 transition-colors">
                Cancel
              </button>
              <button onClick={handleDisburse} disabled={disbursing}
                className="px-4 py-2 rounded-lg text-[12px] font-medium text-white disabled:opacity-60"
                style={{ background: '#1D9E75' }}>
                {disbursing ? 'Processing...' : 'Disburse'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
