'use client';
import { useEffect, useState } from 'react';
import { api, Payment } from '@/lib/api';
import { CreditCard, AlertCircle, RefreshCw, TrendingUp } from 'lucide-react';

function fmt(n: number) {
  return 'UGX ' + new Intl.NumberFormat('en-UG').format(n);
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') return <span className="badge-green">Completed</span>;
  if (status === 'failed')    return <span className="badge-red">Failed</span>;
  if (status === 'refunded')  return <span className="badge-slate">Refunded</span>;
  return <span className="badge-amber">Pending</span>;
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    mtn: 'bg-yellow-50 text-yellow-700',
    airtel: 'bg-red-50 text-red-700',
    card: 'bg-blue-50 text-blue-700',
    stripe: 'bg-violet-50 text-violet-700',
    cash: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase ${colors[method] ?? 'bg-slate-100 text-slate-600'}`}>
      {method}
    </span>
  );
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  async function load() {
    setLoading(true); setError('');
    try { setPayments(await api.payments.list(200)); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const completed = payments.filter(p => p.status === 'completed');
  const totalRevenue = completed.reduce((a, p) => a + Number(p.amount_ugx), 0);
  const byMethod = completed.reduce((a, p) => {
    a[p.method] = (a[p.method] || 0) + Number(p.amount_ugx); return a;
  }, {} as Record<string, number>);

  return (
    <div className="p-8 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Payments</h1>
          <p className="text-slate-500 text-sm mt-0.5">{payments.length} transactions</p>
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle size={16} />{error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <p className="text-xl font-bold text-slate-800">{fmt(totalRevenue)}</p>
          <p className="text-xs text-slate-400 mt-1">Total Revenue</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xl font-bold text-emerald-600">{completed.length}</p>
          <p className="text-xs text-slate-400 mt-1">Completed</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xl font-bold text-amber-500">{payments.filter(p => p.status === 'pending').length}</p>
          <p className="text-xs text-slate-400 mt-1">Pending</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xl font-bold text-red-500">{payments.filter(p => p.status === 'failed').length}</p>
          <p className="text-xs text-slate-400 mt-1">Failed</p>
        </div>
      </div>

      {/* By method */}
      {Object.keys(byMethod).length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-slate-700 mb-3 text-sm">Revenue by Method</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(byMethod).map(([method, amount]) => (
              <div key={method} className="flex items-center gap-2">
                <MethodBadge method={method} />
                <span className="text-sm font-semibold text-slate-700">{fmt(amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {loading
          ? <div className="h-40 flex items-center justify-center"><div className="spinner spinner-dark" /></div>
          : payments.length === 0
            ? (
              <div className="p-16 flex flex-col items-center text-center">
                <CreditCard size={48} className="text-slate-200 mb-4" />
                <p className="font-semibold text-slate-600">No payments yet</p>
                <p className="text-slate-400 text-sm mt-1">Payments appear here when customers buy vouchers</p>
              </div>
            )
            : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Amount</th>
                    <th className="px-6 py-3">Method</th>
                    <th className="px-6 py-3">Voucher</th>
                    <th className="px-6 py-3">Site</th>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 font-bold text-slate-800">{fmt(Number(p.amount_ugx))}</td>
                      <td className="px-6 py-3"><MethodBadge method={p.method} /></td>
                      <td className="px-6 py-3 font-mono text-xs text-slate-600">{p.voucher_code || '—'}</td>
                      <td className="px-6 py-3 text-slate-500">{p.site_name || '—'}</td>
                      <td className="px-6 py-3 text-slate-500">{p.customer_phone || '—'}</td>
                      <td className="px-6 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-6 py-3 text-xs text-slate-400">
                        {new Date(p.created_at).toLocaleString('en-UG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
        }
      </div>
    </div>
  );
}
