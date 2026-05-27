'use client';
import { useEffect, useState } from 'react';
import { api, FloatAgent } from '@/lib/api';
import { AlertCircle, Download, LayoutGrid, MoreHorizontal } from 'lucide-react';

// ── Utility functions ──────────────────────────────────────────────────────────
function fmtUGX(n: number) {
  return 'UGX ' + new Intl.NumberFormat('en-UG').format(Math.round(n));
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

// ── Toggle switch ──────────────────────────────────────────────────────────────
function FloatToggle({ agentId, enabled, onToggle }: { agentId: string; enabled: boolean; onToggle: (id: string, val: boolean) => void }) {
  return (
    <div
      onClick={() => onToggle(agentId, !enabled)}
      style={{
        width: 32, height: 18, borderRadius: 9999,
        background: enabled ? '#1D9E75' : '#333',
        position: 'relative', cursor: 'pointer',
        transition: 'background 200ms',
        display: 'inline-flex', alignItems: 'center',
      }}
    >
      <span style={{
        width: 12, height: 12, borderRadius: '50%', background: '#fff',
        position: 'absolute',
        left: enabled ? 16 : 3,
        transition: 'left 200ms',
      }} />
    </div>
  );
}

// ── Actions dropdown ───────────────────────────────────────────────────────────
function ActionsMenu({ agentId }: { agentId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ background: '#222', border: '1px solid #2a2a2a', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}
      >
        <MoreHorizontal size={14} color="#666" />
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', right: 0, top: '100%', marginTop: 4,
            background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8,
            zIndex: 10, minWidth: 140, overflow: 'hidden',
          }}>
            {['Edit', 'View Transactions'].map(label => (
              <button
                key={label}
                onClick={() => setOpen(false)}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 12, color: '#aaa', background: 'transparent', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#262626')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
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

// ── Agent row ──────────────────────────────────────────────────────────────────
function AgentRow({ agent, onToggle }: { agent: FloatAgent; onToggle: (id: string, val: boolean) => void }) {
  const [hovered, setHovered] = useState(false);
  const initial = agent.name?.charAt(0)?.toUpperCase() ?? '?';
  const MAX_BALANCE = 500_000;
  const pct = Math.min(100, Math.max(0, (agent.balance / MAX_BALANCE) * 100));

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
        <div className="flex items-center gap-2">
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(29,158,117,0.2)', color: '#1D9E75',
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {initial}
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>{agent.name}</p>
            <p style={{ fontSize: 11, color: '#666' }}>{agent.phone}</p>
          </div>
        </div>
      </td>
      <td style={{ padding: '10px 12px' }}>
        <span style={{ background: '#1e1e1e', color: '#666', fontSize: 10, borderRadius: 9999, padding: '2px 8px', fontWeight: 600 }}>
          Agent
        </span>
      </td>
      <td style={{ padding: '10px 12px' }}>
        <FloatToggle agentId={agent.id} enabled={agent.use_float} onToggle={onToggle} />
      </td>
      <td style={{ padding: '10px 12px', minWidth: 120 }}>
        <div style={{ background: '#1e1e1e', borderRadius: 4, height: 6, marginBottom: 4 }}>
          <div style={{ background: '#1D9E75', borderRadius: 4, height: 6, width: `${pct}%`, transition: 'width 300ms' }} />
        </div>
        <p style={{ fontSize: 11, color: '#aaa' }}>{fmtUGX(agent.balance)}</p>
      </td>
      <td style={{ padding: '10px 12px' }}>
        <ActionsMenu agentId={agent.id} />
      </td>
    </tr>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function FloatManagePage() {
  const [data, setData]       = useState<FloatAgent[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate]   = useState('');

  function load(p = page, pp = perPage) {
    setLoading(true); setError('');
    api.float.list({ page: p, per_page: pp })
      .then(res => { setData(res.data); setTotal(res.total); })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(1, perPage); }, []);

  async function handleToggle(agentId: string, val: boolean) {
    setData(prev => prev.map(a => a.id === agentId ? { ...a, use_float: val } : a));
    try {
      await api.float.toggle(agentId, val);
    } catch {
      // Revert on failure
      setData(prev => prev.map(a => a.id === agentId ? { ...a, use_float: !val } : a));
    }
  }

  const inputStyle = {
    background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888',
    borderRadius: 8, padding: '6px 10px', fontSize: 12, outline: 'none',
  };

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>

      {/* Controls row */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-white">Float Manage</h1>
        <div className="flex items-center gap-2">
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={inputStyle} />
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={inputStyle} />
          <button style={{ ...inputStyle, cursor: 'pointer', color: '#1D9E75', borderColor: '#1D9E75', fontWeight: 600 }}>
            Agent Profit
          </button>
          <button style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <Download size={12} /> Export
          </button>
          <button style={{ ...inputStyle, display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <LayoutGrid size={14} color="#666" />
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-4">
        {['All', 'Active', 'Inactive', 'Agent', 'Dealer'].map((label, i) => (
          <button
            key={label}
            style={{
              background: i === 0 ? 'rgba(29,158,117,0.2)' : '#1a1a1a',
              color: i === 0 ? '#1D9E75' : '#666',
              border: `1px solid ${i === 0 ? 'rgba(29,158,117,0.3)' : '#2a2a2a'}`,
              borderRadius: 9999,
              padding: '4px 12px',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
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
                  <TH>Agent</TH>
                  <TH>Role</TH>
                  <TH>Use Float</TH>
                  <TH>Balance</TH>
                  <TH>Actions</TH>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#555', fontSize: 13 }}>No agents found</td></tr>
                ) : (
                  data.map(agent => (
                    <AgentRow key={agent.id} agent={agent} onToggle={handleToggle} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} total={total} perPage={perPage}
          onPage={p => { setPage(p); load(p, perPage); }}
          onPerPage={n => { setPerPage(n); setPage(1); load(1, n); }}
        />
      </div>
    </div>
  );
}
