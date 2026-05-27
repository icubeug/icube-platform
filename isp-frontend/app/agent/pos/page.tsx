'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, Package, AgentDashboard, Payment } from '@/lib/api';
import {
  DollarSign, Receipt, Loader2, AlertCircle, Check, X,
  LogOut,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

// ── Utilities ─────────────────────────────────────────────────────────────────
function fmtUGX(n: number) {
  return 'UGX ' + new Intl.NumberFormat('en-UG').format(Math.round(n));
}
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// Build simple daily chart data from payments
function buildChartData(payments: Payment[]) {
  const map: Record<string, number> = {};
  payments.forEach(p => {
    const day = new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    map[day] = (map[day] || 0) + Number(p.amount_ugx);
  });
  return Object.entries(map).slice(-14).map(([date, total]) => ({ date, total }));
}

type ModalState = 'idle' | 'processing' | 'success' | 'error';

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AgentDashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [agentData, setAgentData] = useState<AgentDashboard | null>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sale form
  const [phone, setPhone] = useState('');
  const [selectedPkg, setSelectedPkg] = useState('');
  const [modal, setModal] = useState<ModalState>('idle');
  const [saleResult, setSaleResult] = useState<{
    voucher_code: string; package_name: string; amount_ugx: number; commission_ugx: number;
  } | null>(null);
  const [saleErr, setSaleErr] = useState('');

  // Date range
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('agent_token');
    if (!t) { router.replace('/agent'); return; }
    setToken(t);
  }, [router]);

  const loadData = useCallback(async (t: string) => {
    if (!t) return;
    setLoading(true); setError('');
    try {
      const [dash, pkgs, pmts] = await Promise.all([
        api.agents.dashboard(t),
        api.agents.packages(t),
        api.payments.list(50),
      ]);
      setAgentData(dash); setPackages(pkgs); setPayments(pmts);
    } catch (e: any) {
      if (e.message?.includes('expired') || e.message?.includes('Unauthorized')) {
        localStorage.removeItem('agent_token');
        router.replace('/agent');
        return;
      }
      setError(e.message);
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { if (token) loadData(token); }, [token, loadData]);

  async function handleSell(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPkg || !phone.trim()) return;
    setModal('processing'); setSaleErr('');
    try {
      const res = await api.agents.sale(token, {
        package_id: selectedPkg,
        customer_phone: phone.trim(),
      });
      setSaleResult(res);
      setModal('success');
      loadData(token);
    } catch (e: any) {
      setSaleErr(e.message); setModal('error');
    }
  }

  function closeSale() {
    setModal('idle'); setPhone(''); setSelectedPkg('');
    setSaleResult(null); setSaleErr('');
  }

  function logout() {
    localStorage.removeItem('agent_token');
    localStorage.removeItem('agent_info');
    router.replace('/agent');
  }

  const chartData = buildChartData(payments);

  if (loading && !agentData) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#0f0f0f',
      }}>
        <Loader2 size={28} color="#1D9E75" className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>
            {agentData?.agent.name ?? 'Agent Dashboard'}
          </span>
        </div>

        {/* Date range */}
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

        <button onClick={logout} style={{
          background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888',
          borderRadius: 8, fontSize: 12, padding: '6px 12px',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <LogOut size={13} /> Logout
        </button>
      </div>

      {error && (
        <div style={{
          background: '#2a1515', border: '1px solid #4a2020', borderRadius: 8,
          padding: '10px 14px', color: '#f87171', fontSize: 12, marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertCircle size={14} />{error}
        </div>
      )}

      {/* Top 3 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>

        {/* Card 1: New Sale */}
        <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 12 }}>New Sale</div>
          <form onSubmit={handleSell} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🇺🇬</span>
              <input
                type="tel"
                placeholder="+256 7XX XXX XXX"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={{
                  flex: 1, background: '#111', border: '1px solid #2a2a2a',
                  borderRadius: 8, padding: '8px 12px', color: '#aaa', fontSize: 13, outline: 'none',
                }}
              />
            </div>
            <select
              value={selectedPkg}
              onChange={e => setSelectedPkg(e.target.value)}
              style={{
                width: '100%', background: '#111', border: '1px solid #2a2a2a',
                borderRadius: 8, padding: '8px 12px', color: '#aaa', fontSize: 13, outline: 'none',
              }}>
              <option value="">— Select Package —</option>
              {packages.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — {fmtUGX(Number(p.price_ugx))}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!selectedPkg || !phone.trim()}
              style={{
                background: '#1D9E75', border: 'none', color: '#fff',
                borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', opacity: (!selectedPkg || !phone.trim()) ? 0.5 : 1,
              }}>
              Sell
            </button>
          </form>
        </div>

        {/* Card 2: My Commission */}
        <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '20px 24px', position: 'relative' }}>
          <DollarSign size={18} color="#1D9E75" style={{ position: 'absolute', top: 20, right: 20 }} />
          <div style={{ fontSize: 10, color: '#555', marginBottom: 8 }}>MY COMMISSION</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
            {fmtUGX(agentData?.stats?.total_commission ?? 0)}
          </div>
          <div style={{ fontSize: 10, color: '#555', marginTop: 6 }}>Total commission you've earned</div>
          <div style={{
            marginTop: 16, padding: '10px 12px', background: '#111',
            borderRadius: 8, border: '1px solid #1e1e1e',
            display: 'flex', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1D9E75' }}>
                {agentData?.stats?.sales_today ?? 0}
              </div>
              <div style={{ fontSize: 10, color: '#555' }}>Sales today</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#aaa' }}>
                {fmtUGX(agentData?.stats?.revenue_today ?? 0)}
              </div>
              <div style={{ fontSize: 10, color: '#555' }}>Revenue today</div>
            </div>
          </div>
        </div>

        {/* Card 3: Float */}
        <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '20px 24px', position: 'relative' }}>
          <Receipt size={18} color="#1D9E75" style={{ position: 'absolute', top: 20, right: 20 }} />
          <div style={{ fontSize: 10, color: '#555', marginBottom: 8 }}>FLOAT BALANCE</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1.1 }}>
            {fmtUGX(agentData?.agent?.wallet_balance ?? 0)}
          </div>
          <div style={{ fontSize: 10, color: '#555', marginTop: 6 }}>Total remaining prepaid float</div>
          <div style={{
            marginTop: 16, padding: '10px 12px', background: '#111',
            borderRadius: 8, border: '1px solid #1e1e1e',
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#aaa' }}>
              {agentData?.stats?.total_sales ?? 0}
            </div>
            <div style={{ fontSize: 10, color: '#555' }}>Total sales</div>
          </div>
        </div>
      </div>

      {/* Bottom: Chart + Recent Sales */}
      <div style={{ display: 'grid', gridTemplateColumns: '60% 1fr', gap: 20 }}>

        {/* Overview chart */}
        <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Overview</span>
            <span style={{ fontSize: 11, color: '#555' }}>Daily sales</span>
          </div>
          {chartData.length === 0 ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 12, color: '#444' }}>No sales data</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#555' }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
                  tick={{ fontSize: 10, fill: '#555' }} axisLine={false} tickLine={false} width={42}
                />
                <Tooltip
                  contentStyle={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#888' }}
                  formatter={(v: number) => [fmtUGX(v), 'Sales']}
                />
                <Bar dataKey="total" fill="#1D9E75" radius={[3, 3, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Sales */}
        <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Recent Sales</div>
          {(agentData?.recent_transactions ?? []).length === 0 ? (
            <div style={{ fontSize: 12, color: '#444', textAlign: 'center', paddingTop: 40 }}>
              No recent transactions
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {(agentData?.recent_transactions ?? []).slice(0, 10).map((tx, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 0', borderBottom: '1px solid #1e1e1e',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: '#0d2e1e', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <DollarSign size={12} color="#1D9E75" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#aaa', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.reference}
                    </div>
                    <div style={{ fontSize: 10, color: '#555' }}>{timeAgo(tx.created_at)}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#1D9E75', flexShrink: 0 }}>
                    {fmtUGX(tx.amount_ugx)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sale Modal */}
      {modal !== 'idle' && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000,
        }}>
          <div style={{
            background: '#1a1a1a', border: '1px solid #222', borderRadius: 14,
            padding: '28px 32px', width: 360, maxWidth: '95vw', textAlign: 'center',
          }}>
            {modal === 'processing' && (
              <div style={{ paddingTop: 16, paddingBottom: 16 }}>
                <Loader2 size={36} color="#1D9E75" className="animate-spin" style={{ margin: '0 auto 16px' }} />
                <div style={{ fontSize: 14, color: '#aaa', fontWeight: 500 }}>Processing sale…</div>
                <div style={{ fontSize: 12, color: '#555', marginTop: 6 }}>Generating voucher & sending SMS</div>
              </div>
            )}

            {modal === 'success' && saleResult && (
              <>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', background: '#0d2e1e',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                }}>
                  <Check size={28} color="#1D9E75" />
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Sale Complete!</div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 20 }}>Voucher sent to {phone}</div>
                <div style={{
                  background: '#111', borderRadius: 10, padding: '14px 16px',
                  textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  {[
                    { label: 'Package', value: saleResult.package_name },
                    { label: 'Amount', value: fmtUGX(saleResult.amount_ugx) },
                    { label: 'Commission', value: `+ ${fmtUGX(saleResult.commission_ugx)}`, green: true },
                    { label: 'Voucher Code', value: saleResult.voucher_code, mono: true },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#666' }}>{row.label}</span>
                      <span style={{
                        fontSize: row.mono ? 14 : 12, fontWeight: 600,
                        color: row.green ? '#1D9E75' : '#aaa',
                        fontFamily: row.mono ? 'monospace' : 'inherit',
                      }}>{row.value}</span>
                    </div>
                  ))}
                </div>
                <button onClick={closeSale} style={{
                  marginTop: 16, width: '100%', background: '#1D9E75', border: 'none', color: '#fff',
                  borderRadius: 8, padding: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>New Sale</button>
              </>
            )}

            {modal === 'error' && (
              <>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', background: '#2a1515',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                }}>
                  <X size={28} color="#f87171" />
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Sale Failed</div>
                <div style={{ fontSize: 12, color: '#f87171', marginBottom: 20 }}>{saleErr}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setModal('idle')} style={{
                    flex: 1, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#aaa',
                    borderRadius: 8, padding: 10, fontSize: 12, cursor: 'pointer',
                  }}>Try Again</button>
                  <button onClick={closeSale} style={{
                    flex: 1, background: '#2a1515', border: '1px solid #4a2020', color: '#f87171',
                    borderRadius: 8, padding: 10, fontSize: 12, cursor: 'pointer',
                  }}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
