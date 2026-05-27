'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, Package, Site } from '@/lib/api';
import { Wifi, Ticket, CreditCard, Check, AlertCircle, Phone, Loader2, ArrowLeft, X } from 'lucide-react';

function fmt(n: number) { return 'UGX ' + new Intl.NumberFormat('en-UG').format(n); }

// ── Voucher Entry Tab ──────────────────────────────────────────────────────────
function VoucherTab() {
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState<{ message: string; expires_at: string; package: string } | null>(null);

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return setError('Enter your voucher code');
    setLoading(true); setError('');
    try {
      const res = await api.vouchers.redeem(code.trim().toUpperCase());
      setSuccess(res);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  if (success) {
    const exp = new Date(success.expires_at);
    const hours = Math.round((exp.getTime() - Date.now()) / 3_600_000);
    return (
      <div className="flex flex-col items-center text-center space-y-5 py-6">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
          <Check size={40} className="text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">You're Connected!</h2>
          <p className="text-slate-500 mt-1">{success.package}</p>
        </div>
        <div className="bg-slate-50 rounded-2xl p-5 w-full space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Expires</span>
            <span className="font-semibold">{exp.toLocaleString('en-UG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Time remaining</span>
            <span className="font-bold text-emerald-600">{hours}h</span>
          </div>
        </div>
        <div className="bg-brand-green text-white rounded-2xl p-5 w-full text-center">
          <Wifi size={28} className="mx-auto mb-2" />
          <p className="font-bold">Browse freely!</p>
          <p className="text-emerald-100 text-sm">Your session is active</p>
        </div>
        <button onClick={() => { setSuccess(null); setCode(''); }}
          className="text-sm text-slate-400 hover:text-slate-600">
          ← Enter another code
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleRedeem} className="space-y-5">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-green/10 flex items-center justify-center mx-auto mb-3">
          <Ticket size={26} className="text-brand-green" />
        </div>
        <h2 className="font-bold text-xl text-slate-800">Enter Voucher Code</h2>
        <p className="text-slate-500 text-sm mt-1">Enter the code from your printed voucher or SMS</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />{error}
        </div>
      )}

      <div>
        <input
          type="text"
          placeholder="e.g. ABC12XYZ"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          className="w-full border-2 border-slate-200 rounded-2xl px-4 py-4 text-2xl font-mono font-bold text-center tracking-widest text-slate-800 focus:border-brand-green focus:outline-none transition uppercase"
          maxLength={12}
          autoComplete="off"
          autoCapitalize="characters"
        />
        <p className="text-xs text-slate-400 text-center mt-2">Code is not case-sensitive</p>
      </div>

      <button type="submit" disabled={loading || !code.trim()}
        className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2 rounded-2xl">
        {loading ? <><Loader2 size={18} className="animate-spin" />Activating…</> : <><Wifi size={18} />Activate & Connect</>}
      </button>

      <div className="text-center">
        <p className="text-xs text-slate-400">
          Don't have a code?{' '}
          <button type="button" onClick={() => document.querySelector<HTMLButtonElement>('[data-tab="buy"]')?.click()}
            className="text-brand-green font-semibold">
            Buy one →
          </button>
        </p>
      </div>
    </form>
  );
}

// ── Buy Now Tab ────────────────────────────────────────────────────────────────
function BuyTab() {
  const [sites, setSites]       = useState<Site[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedPkg, setSelectedPkg]   = useState<Package | null>(null);
  const [phone, setPhone]       = useState('');
  const [method, setMethod]     = useState<'mtn' | 'airtel'>('mtn');
  const [loading, setLoading]   = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const [error, setError]       = useState('');
  const [step, setStep]         = useState<'select' | 'pay' | 'pending' | 'done'>('select');

  useEffect(() => {
    api.sites.list()
      .then(s => { setSites(s); if (s.length === 1) setSelectedSite(s[0].id); })
      .catch(() => {})
      .finally(() => setInitLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedSite) { setPackages([]); return; }
    // Fetch packages for the site — use vouchers endpoint to get available packages
    fetch(`/api/v1/vouchers?site_id=${selectedSite}&status=unused`, {
      headers: { 'X-Tenant-ID': 'ebdf3b5c-f960-4ba6-bb15-739980f2a0a3' }
    })
      .then(r => r.json())
      .then(() => {
        // Also fetch packages separately
        return fetch(`/api/v1/agents/packages`, {
          headers: { 'X-Tenant-ID': 'ebdf3b5c-f960-4ba6-bb15-739980f2a0a3' }
        });
      })
      .then(r => r.json())
      .then(pkgs => Array.isArray(pkgs) ? setPackages(pkgs.filter((p: Package) => p.active !== false)) : setPackages([]))
      .catch(() => setPackages([]));
  }, [selectedSite]);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPkg || !phone.trim()) return;
    setLoading(true); setError('');
    try {
      // In production: call MTN/Airtel API. For now, simulate the flow.
      setStep('pending');
      await new Promise(r => setTimeout(r, 2500)); // simulate API call
      setStep('done');
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  if (initLoading) {
    return <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-brand-green" /></div>;
  }

  if (step === 'pending') {
    return (
      <div className="flex flex-col items-center text-center py-10 space-y-4">
        <Loader2 size={40} className="animate-spin text-brand-green" />
        <p className="font-bold text-slate-700">Processing Payment…</p>
        <p className="text-slate-400 text-sm">Check your phone for the {method === 'mtn' ? 'MTN MoMo' : 'Airtel Money'} prompt</p>
        <div className={`rounded-2xl p-4 text-white font-bold text-center w-full ${method === 'mtn' ? 'bg-yellow-400' : 'bg-red-500'}`}>
          Dial *{method === 'mtn' ? '165#' : '185#'} to confirm
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center text-center space-y-5 py-6">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
          <Check size={40} className="text-emerald-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Payment Received!</h2>
          <p className="text-slate-500 mt-1">Your voucher code has been sent to {phone}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 w-full text-sm space-y-2">
          <p className="text-slate-700">📱 Check your SMS for the voucher code</p>
          <p className="text-slate-700">💻 Enter the code in the <strong>Voucher</strong> tab to connect</p>
        </div>
        <button onClick={() => setStep('select')} className="text-sm text-slate-400 hover:text-slate-600">
          ← Buy another
        </button>
      </div>
    );
  }

  if (step === 'pay' && selectedPkg) {
    return (
      <form onSubmit={handlePay} className="space-y-5">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setStep('select')} className="p-2 rounded-xl hover:bg-slate-100 transition">
            <ArrowLeft size={18} className="text-slate-500" />
          </button>
          <h2 className="font-bold text-xl text-slate-800">Complete Payment</h2>
        </div>

        {/* Package summary */}
        <div className="bg-brand-green/5 border border-brand-green/20 rounded-2xl p-4">
          <p className="font-bold text-brand-green">{selectedPkg.name}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{fmt(Number(selectedPkg.price_ugx))}</p>
        </div>

        {/* Payment method */}
        <div className="grid grid-cols-2 gap-3">
          {(['mtn', 'airtel'] as const).map(m => (
            <button key={m} type="button" onClick={() => setMethod(m)}
              className={`py-4 rounded-2xl border-2 font-bold text-sm transition ${
                method === m
                  ? m === 'mtn' ? 'border-yellow-400 bg-yellow-50 text-yellow-800' : 'border-red-400 bg-red-50 text-red-800'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 ${m === 'mtn' ? 'bg-yellow-400' : 'bg-red-500'}`}>
                <span className="text-white text-xs font-bold">{m === 'mtn' ? 'M' : 'A'}</span>
              </div>
              {m === 'mtn' ? 'MTN Mobile Money' : 'Airtel Money'}
            </button>
          ))}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Mobile Money Number</label>
          <div className="relative">
            <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="tel" inputMode="numeric" placeholder="0700 000 000"
              value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full border-2 border-slate-200 rounded-xl pl-9 pr-4 py-3 text-base focus:border-brand-green focus:outline-none transition"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle size={16} />{error}
          </div>
        )}

        <button type="submit" disabled={!phone.trim() || loading}
          className={`w-full py-4 text-base font-bold rounded-2xl text-white transition ${
            method === 'mtn'
              ? 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900'
              : 'bg-red-500 hover:bg-red-600'
          }`}>
          {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : `Pay ${fmt(Number(selectedPkg.price_ugx))} with ${method === 'mtn' ? 'MTN MoMo' : 'Airtel Money'}`}
        </button>
      </form>
    );
  }

  // Package selection
  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-blue/10 flex items-center justify-center mx-auto mb-3">
          <CreditCard size={26} className="text-brand-blue" />
        </div>
        <h2 className="font-bold text-xl text-slate-800">Buy Internet</h2>
        <p className="text-slate-500 text-sm mt-1">Pay with mobile money and get instant access</p>
      </div>

      {sites.length > 1 && (
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Location</label>
          <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-brand-green focus:outline-none"
            value={selectedSite} onChange={e => setSelectedSite(e.target.value)}>
            <option value="">— Select location —</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {selectedSite && packages.length === 0 && (
        <div className="text-center py-8">
          <p className="text-slate-400 text-sm">No packages available at this location</p>
        </div>
      )}

      {packages.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-600">Choose a plan</p>
          {packages.map(pkg => (
            <button key={pkg.id}
              onClick={() => { setSelectedPkg(pkg); setStep('pay'); }}
              className="w-full text-left p-4 rounded-2xl border-2 border-slate-100 bg-white hover:border-brand-green/40 hover:shadow-sm transition flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">{pkg.name}</p>
                <div className="flex gap-2 mt-1">
                  {pkg.speed_mbps && <span className="text-xs text-slate-400">{pkg.speed_mbps} Mbps</span>}
                  <span className="text-xs text-slate-400">
                    {pkg.duration_hrs < 24 ? `${pkg.duration_hrs}h` : `${pkg.duration_hrs / 24} day${pkg.duration_hrs / 24 > 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-brand-green text-lg">{fmt(Number(pkg.price_ugx))}</p>
                <p className="text-xs text-slate-400">Per session</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {!selectedSite && sites.length === 0 && (
        <p className="text-center text-slate-400 text-sm py-6">No locations available</p>
      )}
    </div>
  );
}

// ── Main Portal Page ───────────────────────────────────────────────────────────
function PortalContent() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'buy' ? 'buy' : 'voucher';
  const [tab, setTab] = useState<'voucher' | 'buy'>(defaultTab as 'voucher' | 'buy');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-green shadow-lg shadow-brand-green/30 mb-4">
            <Wifi size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">WiFi Access</h1>
          <p className="text-slate-400 text-sm mt-1">Connect to the internet</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-100">
            <button data-tab="voucher" onClick={() => setTab('voucher')}
              className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                tab === 'voucher'
                  ? 'text-brand-green border-b-2 border-brand-green bg-brand-green/5'
                  : 'text-slate-500 hover:text-slate-700'
              }`}>
              <Ticket size={16} />I have a code
            </button>
            <button data-tab="buy" onClick={() => setTab('buy')}
              className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                tab === 'buy'
                  ? 'text-brand-blue border-b-2 border-brand-blue bg-brand-blue/5'
                  : 'text-slate-500 hover:text-slate-700'
              }`}>
              <CreditCard size={16} />Buy now
            </button>
          </div>

          {/* Tab content */}
          <div className="p-6">
            {tab === 'voucher' ? <VoucherTab /> : <BuyTab />}
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          Powered by ISP Platform · Secure connection
        </p>
      </div>
    </div>
  );
}

export default function PortalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-brand-green" />
      </div>
    }>
      <PortalContent />
    </Suspense>
  );
}
