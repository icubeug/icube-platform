'use client';
import { useEffect, useState } from 'react';
import { api, SaleItem } from '@/lib/api';
import { AlertCircle, LayoutGrid, Download, Trash2 } from 'lucide-react';

// ── Utility functions ──────────────────────────────────────────────────────────
function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Pagination component ───────────────────────────────────────────────────────
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
        <button
          onClick={() => onPage(Math.max(1, page - 1))}
          disabled={page <= 1}
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: page <= 1 ? '#444' : '#888', borderRadius: 6, padding: '3px 8px', fontSize: 14, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
        >
          ‹
        </button>
        <button
          onClick={() => onPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: page >= totalPages ? '#444' : '#888', borderRadius: 6, padding: '3px 8px', fontSize: 14, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
        >
          ›
        </button>
      </div>
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === 'active')  return <span style={{ background: 'rgba(29,158,117,0.15)', color: '#34d399', fontSize: 10, borderRadius: 9999, padding: '2px 8px', fontWeight: 600 }}>Active</span>;
  if (status === 'used')    return <span style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', fontSize: 10, borderRadius: 9999, padding: '2px 8px', fontWeight: 600 }}>Used</span>;
  if (status === 'expired') return <span style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', fontSize: 10, borderRadius: 9999, padding: '2px 8px', fontWeight: 600 }}>Expired</span>;
  return <span style={{ background: '#1e1e1e', color: '#666', fontSize: 10, borderRadius: 9999, padding: '2px 8px', fontWeight: 600 }}>Unused</span>;
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

// ── Row ────────────────────────────────────────────────────────────────────────
function SaleRow({ row, isTrash }: { row: SaleItem; isTrash: boolean }) {
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
      <td style={{ padding: '10px 12px' }}>
        <span style={{ color: '#1D9E75', fontFamily: 'monospace', fontSize: 12 }}>{row.code}</span>
      </td>
      <td style={{ padding: '10px 12px', fontSize: 11, color: '#888' }}>
        {row.channel === 'mobile_money_sale' ? 'momo_gateway' : 'admin_sale'}
      </td>
      <td style={{ padding: '10px 12px', fontSize: 12, color: '#aaa' }}>{row.package_name || '—'}</td>
      <td style={{ padding: '10px 12px', fontSize: 12, color: '#888' }}>{row.customer_phone || '—'}</td>
      <td style={{ padding: '10px 12px', fontSize: 12, color: '#aaa' }}>{row.customer_name || '—'}</td>
      <td style={{ padding: '10px 12px', fontSize: 11, color: '#666' }}>
        {isTrash
          ? (row.deleted_at ? fmtDate(row.deleted_at) : '—')
          : fmtDate(row.created_at)
        }
      </td>
    </tr>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function SalesPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'trash'>('all');

  // All tab state
  const [allData, setAllData]       = useState<SaleItem[]>([]);
  const [allTotal, setAllTotal]     = useState(0);
  const [allPage, setAllPage]       = useState(1);
  const [allPerPage, setAllPerPage] = useState(20);
  const [allLoading, setAllLoading] = useState(true);
  const [allError, setAllError]     = useState('');
  const [fromDate, setFromDate]     = useState('');
  const [toDate, setToDate]         = useState('');

  // Trash tab state
  const [trashData, setTrashData]       = useState<SaleItem[]>([]);
  const [trashTotal, setTrashTotal]     = useState(0);
  const [trashPage, setTrashPage]       = useState(1);
  const [trashPerPage, setTrashPerPage] = useState(20);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashError, setTrashError]     = useState('');
  const [emptyingTrash, setEmptyingTrash] = useState(false);

  // Load all sales
  function loadAll(page = allPage, perPage = allPerPage) {
    setAllLoading(true); setAllError('');
    api.sales.list({ page, per_page: perPage, from: fromDate || undefined, to: toDate || undefined })
      .then(res => { setAllData(res.data); setAllTotal(res.total); })
      .catch((e: any) => setAllError(e.message))
      .finally(() => setAllLoading(false));
  }

  // Load trash
  function loadTrash(page = trashPage, perPage = trashPerPage) {
    setTrashLoading(true); setTrashError('');
    api.sales.trash({ page, per_page: perPage })
      .then(res => { setTrashData(res.data); setTrashTotal(res.total); })
      .catch((e: any) => setTrashError(e.message))
      .finally(() => setTrashLoading(false));
  }

  useEffect(() => { loadAll(1, allPerPage); }, []);
  useEffect(() => {
    if (activeTab === 'trash' && trashData.length === 0) loadTrash(1, trashPerPage);
  }, [activeTab]);

  async function handleEmptyTrash() {
    if (!confirm('Are you sure you want to permanently delete all trash items?')) return;
    setEmptyingTrash(true);
    try {
      await api.sales.emptyTrash();
      loadTrash(1, trashPerPage);
    } catch (e: any) { setTrashError(e.message); }
    finally { setEmptyingTrash(false); }
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1 mb-6">
        {(['all', 'trash'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              background: activeTab === t ? '#1D9E75' : '#1a1a1a',
              color: activeTab === t ? '#fff' : '#666',
              border: '1px solid ' + (activeTab === t ? '#1D9E75' : '#2a2a2a'),
              borderRadius: 8,
              padding: '5px 16px',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {t === 'trash' ? 'Trash' : 'All'}
          </button>
        ))}
      </div>

      {activeTab === 'all' ? (
        <AllTab
          data={allData} total={allTotal} page={allPage} perPage={allPerPage}
          loading={allLoading} error={allError}
          fromDate={fromDate} toDate={toDate}
          onFromDate={setFromDate} onToDate={setToDate}
          onPage={p => { setAllPage(p); loadAll(p, allPerPage); }}
          onPerPage={n => { setAllPerPage(n); setAllPage(1); loadAll(1, n); }}
          onFilter={() => { setAllPage(1); loadAll(1, allPerPage); }}
        />
      ) : (
        <TrashTab
          data={trashData} total={trashTotal} page={trashPage} perPage={trashPerPage}
          loading={trashLoading} error={trashError} emptyingTrash={emptyingTrash}
          onPage={p => { setTrashPage(p); loadTrash(p, trashPerPage); }}
          onPerPage={n => { setTrashPerPage(n); setTrashPage(1); loadTrash(1, n); }}
          onEmptyTrash={handleEmptyTrash}
        />
      )}
    </div>
  );
}

// ── All tab ────────────────────────────────────────────────────────────────────
function AllTab({
  data, total, page, perPage, loading, error,
  fromDate, toDate, onFromDate, onToDate,
  onPage, onPerPage, onFilter,
}: {
  data: SaleItem[]; total: number; page: number; perPage: number;
  loading: boolean; error: string;
  fromDate: string; toDate: string;
  onFromDate: (v: string) => void; onToDate: (v: string) => void;
  onPage: (p: number) => void; onPerPage: (n: number) => void;
  onFilter: () => void;
}) {
  const inputStyle = {
    background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888',
    borderRadius: 8, padding: '6px 10px', fontSize: 12, outline: 'none',
  };

  return (
    <>
      {/* Controls row */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Sales</h1>
        <div className="flex items-center gap-2">
          <input type="date" value={fromDate} onChange={e => onFromDate(e.target.value)} style={inputStyle} />
          <input type="date" value={toDate} onChange={e => onToDate(e.target.value)} style={inputStyle} />
          <button onClick={onFilter}
            style={{ ...inputStyle, background: '#1D9E75', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Download size={12} /> Export
          </button>
          <button style={{ ...inputStyle, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <LayoutGrid size={14} color="#666" />
          </button>
        </div>
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
                  <TH>Voucher Code</TH>
                  <TH>Channel</TH>
                  <TH>Package</TH>
                  <TH>Payer</TH>
                  <TH>Payer Name</TH>
                  <TH>Created On</TH>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#555', fontSize: 13 }}>No sales found</td></tr>
                ) : (
                  data.map(row => <SaleRow key={row.id} row={row} isTrash={false} />)
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={total} perPage={perPage} onPage={onPage} onPerPage={onPerPage} />
      </div>
    </>
  );
}

// ── Trash tab ──────────────────────────────────────────────────────────────────
function TrashTab({
  data, total, page, perPage, loading, error, emptyingTrash,
  onPage, onPerPage, onEmptyTrash,
}: {
  data: SaleItem[]; total: number; page: number; perPage: number;
  loading: boolean; error: string; emptyingTrash: boolean;
  onPage: (p: number) => void; onPerPage: (n: number) => void;
  onEmptyTrash: () => void;
}) {
  const inputStyle = {
    background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888',
    borderRadius: 8, padding: '6px 10px', fontSize: 12, outline: 'none',
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Sales — Trash</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={onEmptyTrash}
            disabled={emptyingTrash}
            style={{
              background: '#2a1515', border: '1px solid #4a2020',
              color: '#f87171', borderRadius: 8, padding: '6px 12px',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              opacity: emptyingTrash ? 0.6 : 1,
            }}
          >
            <Trash2 size={12} /> {emptyingTrash ? 'Emptying…' : 'Empty Trash'}
          </button>
          <button style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <Download size={12} /> Export
          </button>
          <button style={{ ...inputStyle, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <LayoutGrid size={14} color="#666" />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 text-sm text-red-400"
          style={{ background: '#2a1515', border: '1px solid #4a2020', borderRadius: 8, padding: '10px 14px' }}>
          <AlertCircle size={14} />{error}
        </div>
      )}

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
                  <TH>Voucher Code</TH>
                  <TH>Channel</TH>
                  <TH>Package</TH>
                  <TH>Payer</TH>
                  <TH>Payer Name</TH>
                  <TH>Deleted On</TH>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#555', fontSize: 13 }}>Trash is empty</td></tr>
                ) : (
                  data.map(row => <SaleRow key={row.id} row={row} isTrash={true} />)
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={total} perPage={perPage} onPage={onPage} onPerPage={onPerPage} />
      </div>
    </>
  );
}
