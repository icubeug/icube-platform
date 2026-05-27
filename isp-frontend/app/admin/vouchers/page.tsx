'use client';
import { useEffect, useState } from 'react';
import { api, Voucher, Package } from '@/lib/api';
import {
  Ticket, Plus, Search, Copy, Check, X, Download,
  ChevronDown, Loader2, AlertCircle,
} from 'lucide-react';

// ── Utilities ─────────────────────────────────────────────────────────────────
function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function isExpired(d: string | null) {
  if (!d) return false;
  return new Date(d).getTime() < Date.now();
}

function useCaseLabel(uc: string | null) {
  if (uc === 'mobile_money_sale') return 'Mobile Money Sale';
  if (uc === 'agent_sale') return 'Agent Sale';
  return 'Admin Sale';
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase();
  const style: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
    display: 'inline-block', letterSpacing: 0.5,
  };
  if (s === 'ACTIVE' || s === 'PROVISIONED')
    return <span style={{ ...style, background: '#0d2e1e', border: '1px solid #1a4a30', color: '#1D9E75' }}>{s}</span>;
  if (s === 'EXPIRED')
    return <span style={{ ...style, background: '#2a1515', border: '1px solid #4a2020', color: '#f87171' }}>{s}</span>;
  if (s === 'USED')
    return <span style={{ ...style, background: '#222', border: '1px solid #333', color: '#666' }}>{s}</span>;
  // UNUSED
  return <span style={{ ...style, background: '#0d1a2e', border: '1px solid #1a3050', color: '#60a5fa' }}>{s}</span>;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} style={{
      background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: '#555',
    }}>
      {copied ? <Check size={11} color="#1D9E75" /> : <Copy size={11} />}
    </button>
  );
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: '#0d2e1e', border: '1px solid #1D9E75', borderRadius: 10,
      padding: '10px 16px', color: '#1D9E75', fontSize: 13, fontWeight: 500,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <Check size={14} />{msg}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
type MainTab = 'admin' | 'system' | 'trash';

export default function VouchersPage() {
  const [tab, setTab] = useState<MainTab>('admin');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [trashVouchers, setTrashVouchers] = useState<Voucher[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [generateOpen, setGenerateOpen] = useState(false);
  const [toast, setToast] = useState('');

  // Generate form state
  const [genPackageId, setGenPackageId] = useState('');
  const [genQuantity, setGenQuantity] = useState(5);
  const [genNote, setGenNote] = useState('');
  const [genChannel, setGenChannel] = useState<'admin' | 'system'>('admin');
  const [generating, setGenerating] = useState(false);
  const [genErr, setGenErr] = useState('');

  async function loadData() {
    setLoading(true); setError('');
    try {
      const [v, pkgsRaw] = await Promise.all([
        api.vouchers.list(),
        api.packages.list({ per_page: 100 }) as Promise<any>,
      ]);
      setVouchers(v);
      const pkgs: Package[] = Array.isArray(pkgsRaw) ? pkgsRaw : (pkgsRaw.data ?? []);
      setPackages(pkgs);
      // Trash = deleted items (filter locally since API doesn't support it directly)
      setTrashVouchers(v.filter(x => x.deleted_at));
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!genPackageId) return setGenErr('Please select a package');
    setGenerating(true); setGenErr('');
    try {
      const pkg = packages.find(p => p.id === genPackageId);
      const res = await api.vouchers.generate({
        package_id: genPackageId,
        site_id: pkg?.site_id ?? '',
        count: genQuantity,
        note: genNote || undefined,
      });
      setToast(`Generated ${res.generated} vouchers`);
      setGenerateOpen(false);
      setGenPackageId(''); setGenQuantity(5); setGenNote('');
      loadData();
    } catch (e: any) { setGenErr(e.message); }
    finally { setGenerating(false); }
  }

  function exportCSV() {
    const rows = filtered;
    const header = ['Code', 'Package', 'Status', 'First Login', 'Expires On', 'Use Case', 'Note', 'Created On'];
    const csv = [
      header.join(','),
      ...rows.map(v => [
        v.code, v.package_name || '', v.status,
        v.first_login_at || '', v.expires_at || '',
        useCaseLabel(v.use_case), v.note || '', v.created_at,
      ].map(s => `"${String(s).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url;
    a.download = 'vouchers.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  // Filter by tab
  const tabFiltered = (() => {
    if (tab === 'trash') return trashVouchers;
    if (tab === 'system') return vouchers.filter(v => v.use_case === 'mobile_money_sale');
    // admin: use_case is 'admin_sale' or null, exclude deleted
    return vouchers.filter(v =>
      !v.deleted_at && (v.use_case === 'admin_sale' || v.use_case === null || v.use_case === 'agent_sale')
    );
  })();

  const filtered = tabFiltered.filter(v => {
    if (search && !v.code.toLowerCase().includes(search.toLowerCase()) &&
        !(v.customer_phone || '').includes(search) &&
        !(v.note || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (fromDate && new Date(v.created_at) < new Date(fromDate)) return false;
    if (toDate && new Date(v.created_at) > new Date(toDate + 'T23:59:59')) return false;
    return true;
  });

  const TABS: { key: MainTab; label: string }[] = [
    { key: 'admin', label: 'Created by Admin' },
    { key: 'system', label: 'System Generated' },
    { key: 'trash', label: 'Trash' },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>
      {toast && <Toast msg={toast} onClose={() => setToast('')} />}

      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Ticket size={18} color="#1D9E75" />
        <span className="text-xl font-bold text-white">Vouchers</span>
        <div style={{ flex: 1 }} />
      </div>

      {/* Top Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 280 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
          <input
            placeholder="Search by username, role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a',
              borderRadius: 8, padding: '7px 12px 7px 30px', color: '#aaa', fontSize: 12,
              outline: 'none',
            }}
          />
        </div>

        <span style={{ fontSize: 11, color: '#555' }}>From</span>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
          style={{
            background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8,
            padding: '6px 10px', color: '#aaa', fontSize: 12, outline: 'none',
          }}
        />
        <span style={{ fontSize: 11, color: '#555' }}>To</span>
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
          style={{
            background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8,
            padding: '6px 10px', color: '#aaa', fontSize: 12, outline: 'none',
          }}
        />

        <button
          onClick={() => setGenerateOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#1D9E75', border: 'none', color: '#fff',
            borderRadius: 8, fontSize: 12, fontWeight: 600, padding: '7px 14px', cursor: 'pointer',
          }}>
          <Plus size={13} /> Generate
        </button>

        <button style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#aaa',
          borderRadius: 8, fontSize: 12, padding: '7px 12px', cursor: 'pointer',
        }}>
          <Download size={12} /> Download by Note
        </button>

        <button onClick={exportCSV} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#aaa',
          borderRadius: 8, fontSize: 12, padding: '7px 12px', cursor: 'pointer',
        }}>
          <Download size={12} /> Export CSV
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #222', marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            fontSize: 12, fontWeight: 500, padding: '8px 16px', background: 'none',
            border: 'none', borderBottom: `2px solid ${tab === t.key ? '#1D9E75' : 'transparent'}`,
            color: tab === t.key ? '#fff' : '#666', cursor: 'pointer', transition: 'all 150ms',
          }}>{t.label}</button>
        ))}
      </div>

      {error && (
        <div style={{
          background: '#2a1515', border: '1px solid #4a2020', borderRadius: 8,
          padding: '10px 14px', color: '#f87171', fontSize: 12, marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertCircle size={14} />{error}
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160 }}>
            <Loader2 size={22} color="#1D9E75" className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <Ticket size={40} color="#333" style={{ margin: '0 auto 12px' }} />
            <div style={{ color: '#555', fontSize: 13 }}>No vouchers found</div>
            {tab === 'admin' && (
              <button onClick={() => setGenerateOpen(true)} style={{
                marginTop: 14, background: '#1D9E75', border: 'none', color: '#fff',
                borderRadius: 8, fontSize: 12, fontWeight: 600, padding: '8px 16px',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                <Plus size={13} /> Generate Vouchers
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #222' }}>
                  {['', 'Username', 'Package', 'Status', 'First Login', 'Expires On', 'Use Case', 'Note', 'Created On', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '10px 12px', textAlign: 'left', fontSize: 10,
                      fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.8,
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #1e1e1e' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1e1e1e')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '9px 12px' }}>
                      <input type="checkbox" style={{ accentColor: '#1D9E75' }} />
                    </td>
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{ color: '#1D9E75', fontFamily: 'monospace', fontSize: 12 }}>
                        {v.code}
                      </span>
                      <CopyBtn text={v.code} />
                    </td>
                    <td style={{ padding: '9px 12px', fontSize: 12, color: '#aaa', whiteSpace: 'nowrap' }}>
                      {v.package_name || '—'}
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <StatusBadge status={v.status} />
                    </td>
                    <td style={{ padding: '9px 12px', fontSize: 11, color: '#666', whiteSpace: 'nowrap' }}>
                      {fmtDate(v.first_login_at)}
                    </td>
                    <td style={{ padding: '9px 12px', fontSize: 11, whiteSpace: 'nowrap',
                      color: isExpired(v.expires_at) ? '#f87171' : '#aaa' }}>
                      {fmtDate(v.expires_at)}
                    </td>
                    <td style={{ padding: '9px 12px', fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}>
                      {useCaseLabel(v.use_case)}
                    </td>
                    <td style={{ padding: '9px 12px', fontSize: 11, color: '#666' }}>
                      {v.note || '—'}
                    </td>
                    <td style={{ padding: '9px 12px', fontSize: 11, color: '#666', whiteSpace: 'nowrap' }}>
                      {fmtDate(v.created_at)}
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <VoucherActions voucher={v} onRefresh={loadData} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Modal */}
      {generateOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000,
        }}>
          <div style={{
            background: '#1a1a1a', border: '1px solid #222', borderRadius: 14,
            padding: '24px 28px', width: 420, maxWidth: '95vw',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Generate Vouchers</span>
              <button onClick={() => setGenerateOpen(false)} style={{
                background: 'none', border: 'none', color: '#555', cursor: 'pointer',
              }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>Package</label>
                <select
                  value={genPackageId} onChange={e => setGenPackageId(e.target.value)}
                  style={{
                    width: '100%', background: '#111', border: '1px solid #2a2a2a',
                    borderRadius: 8, padding: '8px 12px', color: '#aaa', fontSize: 13, outline: 'none',
                  }}>
                  <option value="">— Select package —</option>
                  {packages.map(p => (
                    <option key={p.id} value={p.id}>{p.name} — UGX {Number(p.price_ugx).toLocaleString()}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>Quantity (1–100)</label>
                <input
                  type="number" min={1} max={100} value={genQuantity}
                  onChange={e => setGenQuantity(Number(e.target.value))}
                  style={{
                    width: '100%', background: '#111', border: '1px solid #2a2a2a',
                    borderRadius: 8, padding: '8px 12px', color: '#aaa', fontSize: 13, outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>Note (optional)</label>
                <input
                  type="text" value={genNote} onChange={e => setGenNote(e.target.value)}
                  placeholder="e.g. Batch for hotel guests"
                  style={{
                    width: '100%', background: '#111', border: '1px solid #2a2a2a',
                    borderRadius: 8, padding: '8px 12px', color: '#aaa', fontSize: 13, outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 8 }}>Channel</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {(['admin', 'system'] as const).map(ch => (
                    <label key={ch} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      cursor: 'pointer', fontSize: 12, color: '#aaa',
                    }}>
                      <input
                        type="radio" name="channel" value={ch}
                        checked={genChannel === ch} onChange={() => setGenChannel(ch)}
                        style={{ accentColor: '#1D9E75' }}
                      />
                      {ch === 'admin' ? 'Admin Generated' : 'System Generated'}
                    </label>
                  ))}
                </div>
              </div>

              {genErr && <div style={{ fontSize: 12, color: '#f87171' }}>{genErr}</div>}

              <button type="submit" disabled={generating} style={{
                background: '#1D9E75', border: 'none', color: '#fff', borderRadius: 8,
                fontSize: 13, fontWeight: 600, padding: '10px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: generating ? 0.7 : 1,
              }}>
                {generating ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : 'Generate'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Voucher Actions ───────────────────────────────────────────────────────────
function VoucherActions({ voucher, onRefresh }: { voucher: Voucher; onRefresh: () => void }) {
  const [open, setOpen] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(voucher.code);
    setOpen(false);
  }

  async function softDelete() {
    try {
      await api.sales.softDelete(voucher.id);
      onRefresh();
    } catch {}
    setOpen(false);
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888',
          borderRadius: 6, fontSize: 13, padding: '3px 10px', cursor: 'pointer',
        }}>
        …
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', right: 0, top: 28, zIndex: 200,
            background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 8,
            minWidth: 140, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}>
            <button onClick={copyCode} style={{
              width: '100%', padding: '9px 14px', textAlign: 'left',
              background: 'none', border: 'none', color: '#aaa', fontSize: 12,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Copy size={12} /> Copy Code
            </button>
            <button onClick={softDelete} style={{
              width: '100%', padding: '9px 14px', textAlign: 'left',
              background: 'none', border: 'none', color: '#f87171', fontSize: 12,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              borderTop: '1px solid #2a2a2a',
            }}>
              <X size={12} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
