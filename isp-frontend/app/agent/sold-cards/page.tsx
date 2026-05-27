'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, Payment } from '@/lib/api';
import { Receipt, Loader2, AlertCircle, Search } from 'lucide-react';

function fmtUGX(n: number) {
  return 'UGX ' + new Intl.NumberFormat('en-UG').format(Math.round(n));
}
function fmtDate(d: string) {
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: string }) {
  const s = status?.toUpperCase();
  const style: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
    display: 'inline-block', letterSpacing: 0.5,
  };
  if (s === 'SUCCESS' || s === 'COMPLETED' || s === 'PAID')
    return <span style={{ ...style, background: '#0d2e1e', border: '1px solid #1a4a30', color: '#1D9E75' }}>{s}</span>;
  if (s === 'FAILED')
    return <span style={{ ...style, background: '#2a1515', border: '1px solid #4a2020', color: '#f87171' }}>{s}</span>;
  return <span style={{ ...style, background: '#222', border: '1px solid #333', color: '#888' }}>{s || 'PENDING'}</span>;
}

export default function SoldCardsPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('agent_token');
    if (!t) { router.replace('/agent'); return; }

    async function load() {
      try {
        const data = await api.payments.list(100);
        setPayments(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const filtered = payments.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (p.voucher_code || '').toLowerCase().includes(q) ||
      (p.customer_phone || '').includes(q) ||
      (p.customer_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Receipt size={18} color="#1D9E75" />
        <span style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>Sold Cards</span>
        <span style={{ fontSize: 12, color: '#555' }}>({payments.length} total)</span>
        <div style={{ flex: 1 }} />

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{
            position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)', color: '#555',
          }} />
          <input
            placeholder="Search code, phone, name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8,
              padding: '7px 12px 7px 30px', color: '#aaa', fontSize: 12, outline: 'none', width: 240,
            }}
          />
        </div>
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
            <Receipt size={36} color="#333" style={{ margin: '0 auto 12px' }} />
            <div style={{ color: '#555', fontSize: 13 }}>No sold cards found</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #222' }}>
                  {['Voucher Code', 'Package', 'Amount', 'Customer Phone', 'Date', 'Status'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left', fontSize: 10,
                      fontWeight: 700, color: '#555', textTransform: 'uppercase',
                      letterSpacing: 0.8, whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #1e1e1e' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1e1e1e')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        color: '#1D9E75', fontFamily: 'monospace', fontSize: 12,
                      }}>
                        {p.voucher_code || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#aaa' }}>
                      {p.site_name || '—'}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#fff', fontWeight: 600 }}>
                      {fmtUGX(Number(p.amount_ugx))}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#aaa' }}>
                      {p.customer_phone || p.customer_name || '—'}
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 11, color: '#666', whiteSpace: 'nowrap' }}>
                      {fmtDate(p.created_at)}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
