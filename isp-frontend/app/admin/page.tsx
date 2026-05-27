'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { api, Payment, Voucher, Site } from '@/lib/api';
import type { ChartPoint } from '@/components/admin/RevenueChart';
import {
  TrendingUp, Download, DollarSign, Users, Cpu, HardDrive,
  ChevronDown, RefreshCw, Ticket, AlertCircle
} from 'lucide-react';

const RevenueChart = dynamic(() => import('@/components/admin/RevenueChart'), { ssr: false });

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtUGX(n: number) {
  return 'UGX ' + new Intl.NumberFormat('en-UG').format(Math.round(n));
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m} minute${m > 1 ? 's' : ''} ago`;
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  return `${d} day${d > 1 ? 's' : ''} ago`;
}

// ── Date range label ──────────────────────────────────────────────────────────
function dateRangeLabel() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const fmt   = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fmt(start)} – ${fmt(now)}`;
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '16px 18px' }}>
      {children}
    </div>
  );
}

// ── Recent Sale row ───────────────────────────────────────────────────────────
function SaleRow({ payment }: { payment: Payment }) {
  const initials = payment.customer_phone
    ? payment.customer_phone.slice(-2).toUpperCase()
    : 'VX';

  return (
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: '1px solid #1e1e1e' }}>
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: '#1D9E75' }}>
        <Ticket size={14} className="text-white" />
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">
          {payment.voucher_code || payment.customer_phone || 'Sale'}
        </p>
        <p className="text-[10px] truncate" style={{ color: '#555' }}>
          {payment.method === 'cash' ? 'Cash Sale' : payment.method?.toUpperCase() + ' MoMo'}
          {' • '}
          {timeAgo(payment.created_at)}
        </p>
      </div>
      {/* Amount */}
      <span className="text-xs font-bold flex-shrink-0" style={{ color: '#1D9E75' }}>
        +{fmtUGX(Number(payment.amount_ugx))}
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [payments, setPayments]     = useState<Payment[]>([]);
  const [vouchers, setVouchers]     = useState<Voucher[]>([]);
  const [sites, setSites]           = useState<Site[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [p, v, s] = await Promise.all([
        api.payments.list(200),
        api.vouchers.list(),
        api.sites.list(),
      ]);
      setPayments(p); setVouchers(v); setSites(s);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Computed stats ──────────────────────────────────────────────────────────
  const completed = useMemo(() =>
    payments.filter(p => p.status === 'completed'), [payments]);

  const netSales     = useMemo(() => completed.reduce((s, p) => s + Number(p.amount_ugx), 0), [completed]);
  const commission   = Math.round(netSales * 0.05);  // 5% agent commission
  const proceeds     = netSales - commission;
  const voucherSales = useMemo(() =>
    completed.filter(p => p.voucher_code).reduce((s, p) => s + Number(p.amount_ugx), 0), [completed]);
  const mmSales      = netSales - voucherSales;
  const balance      = proceeds;                       // ISP net balance

  const activeVouchers = useMemo(() =>
    vouchers.filter(v => v.status === 'active').length, [vouchers]);

  const today = new Date().toISOString().slice(0, 10);
  const todaySales = useMemo(() =>
    completed.filter(p => p.created_at?.slice(0, 10) === today), [completed, today]);

  // ── Chart data: daily for current month ─────────────────────────────────────
  const chartData = useMemo<ChartPoint[]>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthName = now.toLocaleString('en-US', { month: 'short' });

    const days: ChartPoint[] = [];
    for (let d = 1; d <= now.getDate(); d++) {
      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayPayments = completed.filter(p => p.created_at?.slice(0, 10) === dayStr);
      const gross      = dayPayments.reduce((s, p) => s + Number(p.amount_ugx), 0);
      const comm       = Math.round(gross * 0.05);
      const proc       = gross - comm;
      days.push({
        date: String(d),
        fullDate: `${monthName} ${d}, ${year}`,
        proceeds: proc,
        commission: comm,
        gross,
      });
    }
    return days;
  }, [completed]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <div className="flex items-center gap-3">
          <button onClick={load}
            style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '6px 10px' }}
            className="flex items-center gap-1.5 text-[12px] text-[#888] hover:text-white transition-colors">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {/* Date range pill */}
          <button
            style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '6px 14px' }}
            className="flex items-center gap-2 text-[12px] text-[#aaa] hover:text-white transition-colors">
            {dateRangeLabel()}
            <ChevronDown size={13} style={{ color: '#555' }} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 text-sm text-red-400"
          style={{ background: '#2a1515', border: '1px solid #4a2020', borderRadius: 8, padding: '10px 14px' }}>
          <AlertCircle size={15} />{error}
        </div>
      )}

      {/* ── Stats row ── */}
      <div className="grid grid-cols-4 gap-4 mb-6">

        {/* 1. Net Sales */}
        <StatCard>
          <div className="flex items-start justify-between mb-3">
            <p className="text-[11px] font-medium" style={{ color: '#666' }}>Net Sales</p>
            <TrendingUp size={14} style={{ color: '#1D9E75' }} />
          </div>
          <p className="text-2xl font-bold text-white mb-1">
            {loading ? '—' : fmtUGX(netSales)}
          </p>
          <p className="text-[10px]" style={{ color: '#555' }}>
            MM: {fmtUGX(mmSales)} &nbsp;|&nbsp; Vouchers: {fmtUGX(voucherSales)}
          </p>
        </StatCard>

        {/* 2. Voucher Sales */}
        <StatCard>
          <div className="flex items-start justify-between mb-3">
            <p className="text-[11px] font-medium" style={{ color: '#666' }}>Voucher Sales</p>
            <Download size={14} style={{ color: '#555' }} />
          </div>
          <p className="text-2xl font-bold text-white mb-1">
            {loading ? '—' : fmtUGX(voucherSales)}
          </p>
          <p className="text-[10px]" style={{ color: '#555' }}>
            Total sales from physical vouchers
          </p>
        </StatCard>

        {/* 3. Balance */}
        <StatCard>
          <div className="flex items-start justify-between mb-3">
            <p className="text-[11px] font-medium" style={{ color: '#666' }}>Balance</p>
            <DollarSign size={14} style={{ color: '#555' }} />
          </div>
          <p className="text-2xl font-bold text-white mb-1">
            {loading ? '—' : fmtUGX(balance)}
          </p>
          <p className="text-[10px]" style={{ color: '#555' }}>
            Net balance on account
          </p>
        </StatCard>

        {/* 4. System Insights */}
        <StatCard>
          <div className="flex items-start justify-between mb-3">
            <p className="text-[11px] font-medium" style={{ color: '#666' }}>System Insights</p>
            <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: '#1D9E75' }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#1D9E75' }} />
              Online
            </span>
          </div>
          <div className="grid grid-cols-3 gap-0 mt-2">
            {/* Active users */}
            <div className="text-center">
              <div className="flex justify-center mb-1">
                <Users size={13} style={{ color: '#555' }} />
              </div>
              <p className="text-base font-bold text-white">{loading ? '—' : activeVouchers}</p>
              <p className="text-[9px]" style={{ color: '#555' }}>Active</p>
            </div>
            {/* CPU */}
            <div className="text-center">
              <div className="flex justify-center mb-1">
                <Cpu size={13} style={{ color: '#555' }} />
              </div>
              <p className="text-base font-bold text-white">24%</p>
              <p className="text-[9px]" style={{ color: '#555' }}>CPU</p>
            </div>
            {/* Data */}
            <div className="text-center">
              <div className="flex justify-center mb-1">
                <HardDrive size={13} style={{ color: '#555' }} />
              </div>
              <p className="text-base font-bold text-white">1.2<span className="text-xs font-normal" style={{ color: '#666' }}>TB</span></p>
              <p className="text-[9px]" style={{ color: '#555' }}>Data Usage</p>
            </div>
          </div>
        </StatCard>
      </div>

      {/* ── Main two-column area ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '60% 1fr', gap: 20 }}>

        {/* ── LEFT: Overview + Chart ── */}
        <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '20px 22px' }}>
          {/* Section header */}
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-white">Overview</h2>
            {/* Totals / All dropdown */}
            <div className="flex items-center gap-2">
              <button style={{ background: '#1D9E75', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#fff', fontWeight: 600 }}>
                Totals
              </button>
              <button style={{ background: '#222', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#666', border: '1px solid #2a2a2a' }}
                className="flex items-center gap-1">
                All… <ChevronDown size={10} />
              </button>
            </div>
          </div>
          <p className="text-[11px] mb-5" style={{ color: '#555' }}>{dateRangeLabel()}</p>

          {/* Chart */}
          {loading
            ? <div className="h-60 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full border-2 border-[#1D9E75] border-t-transparent animate-spin" />
              </div>
            : chartData.length === 0
              ? <div className="h-60 flex items-center justify-center text-[#555] text-xs">No data for this period</div>
              : <RevenueChart data={chartData} />
          }
        </div>

        {/* ── RIGHT: Recent Sales ── */}
        <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '20px 18px', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="text-sm font-bold text-white">Recent Sales</h2>
              <p className="text-[11px] mt-0.5" style={{ color: '#555' }}>
                You made {todaySales.length} sale{todaySales.length !== 1 ? 's' : ''} today
              </p>
            </div>
            <button className="text-[10px] hover:text-white transition-colors" style={{ color: '#1D9E75' }}>
              Scroll for more
            </button>
          </div>

          {/* Transactions list */}
          <div className="flex-1 overflow-y-auto mt-2" style={{ maxHeight: 320, scrollbarWidth: 'none' }}>
            {loading
              ? <div className="flex items-center justify-center h-20">
                  <div className="w-4 h-4 rounded-full border-2 border-[#1D9E75] border-t-transparent animate-spin" />
                </div>
              : completed.length === 0
                ? <p className="text-[#555] text-xs text-center py-8">No sales yet</p>
                : completed.slice(0, 20).map(p => (
                    <SaleRow key={p.id} payment={p} />
                  ))
            }
          </div>

          {/* Footer */}
          {!loading && completed.length > 0 && (
            <p className="text-[10px] text-center pt-3 mt-auto" style={{ color: '#444', borderTop: '1px solid #1e1e1e' }}>
              Showing {Math.min(20, completed.length)} recent sales
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
