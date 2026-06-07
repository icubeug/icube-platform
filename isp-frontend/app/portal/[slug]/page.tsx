'use client';
import { useEffect, useState, useCallback } from 'react';
import { Wifi, Ticket, CreditCard, Check, AlertCircle, Phone, Loader2, ArrowLeft, Gift, CheckCheck } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  support_phone: string | null;
  support_email: string | null;
  portal_template?: string;
  portal_theme?: string;
  free_trial_minutes?: number | null;
  free_trial_speed_mbps?: number | null;
}

interface PkgInfo {
  id: string;
  name: string;
  speed_mbps: number | null;
  download_mbps: number | null;
  upload_mbps: number | null;
  duration_hrs: number;
  duration_label: string | null;
  price_ugx: number;
}

function fmt(n: number) {
  return 'UGX ' + new Intl.NumberFormat('en-UG').format(n);
}

function fmtDuration(hrs: number, label?: string | null) {
  if (label) return label;
  if (hrs < 1) return `${hrs * 60}min`;
  if (hrs < 24) return `${hrs}h`;
  const days = hrs / 24;
  return `${days} day${days > 1 ? 's' : ''}`;
}

function getHotspotParams() {
  if (typeof window === 'undefined') return {};
  const p = new URLSearchParams(window.location.search);
  return {
    mac:       p.get('mac')       || '',
    ip:        p.get('ip')        || '',
    link_orig: p.get('link-orig') || p.get('link_orig') || '',
    nas_ip:    p.get('server')    || '',
    error_msg: p.get('error')     || '',
  };
}

type TabKey = 'trial' | 'voucher' | 'paid' | 'buy';

// ─────────────────────────────────────────────────────────────────────────────
// Free Trial Tab
// ─────────────────────────────────────────────────────────────────────────────

function FreeTrialTab({ slug, primaryColor, tenant }: {
  slug: string; primaryColor: string; tenant: TenantInfo;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [redirect, setRedirect] = useState<string | null>(null);
  const trialMins = tenant.free_trial_minutes ?? 15;
  const trialSpeed = tenant.free_trial_speed_mbps ?? 1;

  async function handleStartTrial() {
    setLoading(true); setError('');
    const { mac, link_orig, nas_ip } = getHotspotParams();
    try {
      const res = await fetch('/api/portal/trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, mac_address: mac, nas_ip, link_orig }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Trial not available'); return; }
      setRedirect(data.redirect_url);
      setDone(true);
      if (data.redirect_url) {
        setTimeout(() => { window.location.href = data.redirect_url; }, 1200);
      }
    } catch {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 20, padding: '24px 0' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check size={36} color="#059669" />
        </div>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>Trial Started!</h2>
          <p style={{ color: '#64748b', marginTop: 6, fontSize: 14 }}>Enjoy your free {trialMins}-minute trial</p>
        </div>
        <Loader2 size={24} color={primaryColor} style={{ animation: 'spin 1s linear infinite' }} />
        {redirect && (
          <p style={{ fontSize: 12, color: '#94a3b8' }}>
            If not redirected,{' '}
            <a href={redirect} style={{ color: primaryColor }}>click here</a>
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <Gift size={28} color="#d97706" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>Free Trial</h2>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Get free internet access, no payment needed</p>
      </div>

      <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 14, padding: '16px 18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 26, fontWeight: 800, color: '#92400e', margin: 0 }}>{trialMins}</p>
            <p style={{ fontSize: 12, color: '#b45309', margin: '2px 0 0' }}>Minutes</p>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid #fde68a' }}>
            <p style={{ fontSize: 26, fontWeight: 800, color: '#92400e', margin: 0 }}>{trialSpeed}</p>
            <p style={{ fontSize: 12, color: '#b45309', margin: '2px 0 0' }}>Mbps</p>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', fontSize: 13 }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          'No registration required',
          `${trialMins} minutes of free internet`,
          `Speed limited to ${trialSpeed} Mbps`,
          'One trial per device per day',
        ].map(item => (
          <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569' }}>
            <Check size={14} color="#22c55e" style={{ flexShrink: 0 }} />
            {item}
          </li>
        ))}
      </ul>

      <button onClick={handleStartTrial} disabled={loading}
        style={{
          background: '#d97706', border: 'none', color: '#fff',
          borderRadius: 12, padding: '14px 0', fontSize: 15, fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
        {loading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Starting…</>
                 : <><Gift size={18} /> Start Free Trial</>}
      </button>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', margin: 0 }}>
        Trial is one-time per device. Buy a package for extended access.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Voucher Tab
// ─────────────────────────────────────────────────────────────────────────────

function VoucherTab({ slug, primaryColor }: { slug: string; primaryColor: string }) {
  const [code, setCode]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [redirect, setRedirect] = useState<string | null>(null);
  const [done, setDone]     = useState(false);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return setError('Enter your voucher code');
    setLoading(true); setError('');

    const { mac, link_orig, nas_ip } = getHotspotParams();

    try {
      const res = await fetch('/api/portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code:        code.trim().toUpperCase(),
          slug,
          mac_address: mac,
          nas_ip,
          link_orig,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid voucher code'); return; }
      setRedirect(data.redirect_url);
      setDone(true);
      if (data.redirect_url) {
        setTimeout(() => { window.location.href = data.redirect_url; }, 1200);
      }
    } catch {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 20, padding: '24px 0' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check size={36} color="#059669" />
        </div>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>Connecting…</h2>
          <p style={{ color: '#64748b', marginTop: 6, fontSize: 14 }}>You will be connected in a moment</p>
        </div>
        <Loader2 size={24} color={primaryColor} style={{ animation: 'spin 1s linear infinite' }} />
        {redirect && (
          <p style={{ fontSize: 12, color: '#94a3b8' }}>
            If not redirected,{' '}
            <a href={redirect} style={{ color: primaryColor }}>click here</a>
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: primaryColor + '1a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
          <Ticket size={24} color={primaryColor} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>Enter Voucher</h2>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Enter the code from your printed voucher or SMS</p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', fontSize: 13 }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <input
        type="text"
        placeholder="e.g. ABC12XYZ"
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
        style={{
          border: '2px solid #e2e8f0', borderRadius: 14, padding: '14px 16px',
          fontSize: 22, fontFamily: 'monospace', fontWeight: 700,
          textAlign: 'center', letterSpacing: '0.15em', color: '#1e293b',
          outline: 'none', width: '100%', boxSizing: 'border-box',
          textTransform: 'uppercase',
        }}
        maxLength={12}
        autoComplete="off"
        autoCapitalize="characters"
      />

      <button type="submit" disabled={loading || !code.trim()}
        style={{
          background: primaryColor, border: 'none', color: '#fff',
          borderRadius: 12, padding: '14px 0', fontSize: 15, fontWeight: 700,
          cursor: loading || !code.trim() ? 'not-allowed' : 'pointer',
          opacity: !code.trim() ? 0.5 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
        {loading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Connecting…</>
                 : <><Wifi size={18} /> Connect Now</>}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// I Paid Tab (check payment by phone number)
// ─────────────────────────────────────────────────────────────────────────────

function IPaidTab({ slug, primaryColor }: { slug: string; primaryColor: string }) {
  const [phone, setPhone]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [redirect, setRedirect] = useState<string | null>(null);
  const [step, setStep]     = useState<'form' | 'found' | 'notfound'>('form');

  const { mac, link_orig, nas_ip } = getHotspotParams();

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return setError('Enter your phone number');
    setLoading(true); setError('');

    try {
      const res = await fetch('/api/portal/check-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, phone: phone.trim(), mac_address: mac, nas_ip, link_orig }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404) { setStep('notfound'); return; }
        setError(data.error || 'Could not verify payment'); return;
      }
      setVoucherCode(data.voucher_code || '');
      setRedirect(data.redirect_url || null);
      setStep('found');
      if (data.redirect_url) {
        setTimeout(() => { window.location.href = data.redirect_url; }, 1500);
      }
    } catch {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'found') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 18, padding: '24px 0' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCheck size={36} color="#059669" />
        </div>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>Payment Confirmed!</h2>
          <p style={{ color: '#64748b', marginTop: 6, fontSize: 14 }}>Your payment has been verified</p>
        </div>
        {voucherCode && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 20px', width: '100%' }}>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 6px' }}>Your voucher code</p>
            <p style={{ fontSize: 26, fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.15em', color: '#065f46', margin: 0 }}>
              {voucherCode}
            </p>
          </div>
        )}
        {redirect
          ? <><Loader2 size={24} color={primaryColor} style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: 12, color: '#94a3b8' }}>Connecting… <a href={redirect} style={{ color: primaryColor }}>click here</a> if not redirected</p></>
          : <p style={{ fontSize: 13, color: '#64748b' }}>Use the code in the <strong>Enter Voucher</strong> tab to connect</p>
        }
      </div>
    );
  }

  if (step === 'notfound') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 18, padding: '24px 0' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertCircle size={36} color="#dc2626" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>No Payment Found</h2>
        <p style={{ color: '#64748b', fontSize: 13, maxWidth: 280 }}>
          We could not find a recent payment for <strong>{phone}</strong>.
          It may still be processing — wait a moment and try again.
        </p>
        <button onClick={() => { setStep('form'); setPhone(''); }}
          style={{ background: primaryColor, border: 'none', color: '#fff', borderRadius: 10, padding: '12px 28px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleCheck} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
          <CheckCheck size={24} color="#22c55e" />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>I Already Paid</h2>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>
          Enter the phone number you paid with to verify and connect
        </p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', fontSize: 13 }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}

      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
          Mobile Money Number
        </label>
        <div style={{ position: 'relative' }}>
          <Phone size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="tel"
            inputMode="numeric"
            placeholder="07XXXXXXXX or +256XXXXXXXXX"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            style={{
              width: '100%', border: '2px solid #e2e8f0', borderRadius: 12,
              padding: '13px 14px 13px 38px', fontSize: 15, outline: 'none',
              boxSizing: 'border-box', color: '#1e293b',
            }}
          />
        </div>
      </div>

      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
        <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
          We check payments made in the last <strong>24 hours</strong>. If your payment just went through, wait 1–2 minutes and try again.
        </p>
      </div>

      <button type="submit" disabled={loading || !phone.trim()}
        style={{
          background: '#22c55e', border: 'none', color: '#fff',
          borderRadius: 12, padding: '14px 0', fontSize: 15, fontWeight: 700,
          cursor: loading || !phone.trim() ? 'not-allowed' : 'pointer',
          opacity: !phone.trim() ? 0.5 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
        {loading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Checking…</>
                 : <><CheckCheck size={18} /> Verify Payment</>}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Buy Now Tab
// ─────────────────────────────────────────────────────────────────────────────

function BuyTab({ slug, packages, primaryColor }: {
  slug: string; packages: PkgInfo[]; primaryColor: string;
}) {
  const [selectedPkg, setSelectedPkg] = useState<PkgInfo | null>(null);
  const [phone, setPhone]   = useState('');
  const [provider, setProvider] = useState<'mtn' | 'airtel'>('mtn');
  const [step, setStep]     = useState<'select' | 'pay' | 'polling' | 'done' | 'failed'>('select');
  const [voucherCode, setVoucherCode] = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const { mac, nas_ip } = getHotspotParams();

  const pollStatus = useCallback(async (ref: string) => {
    let attempts = 0;
    const maxAttempts = 40;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`/api/portal/pay/status/${ref}`);
        const data = await res.json();
        if (data.status === 'completed') {
          clearInterval(interval);
          setVoucherCode(data.voucher_code || '');
          setStep('done');
        } else if (data.status === 'failed' || attempts >= maxAttempts) {
          clearInterval(interval);
          setStep('failed');
        }
      } catch { /* continue polling */ }
    }, 3000);
  }, []);

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPkg || !phone.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/portal/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ package_id: selectedPkg.id, phone, slug, mac_address: mac, nas_ip }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Payment initiation failed'); return; }
      setStep('polling');
      pollStatus(data.reference);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'polling') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 18, padding: '24px 0' }}>
        <Loader2 size={48} color={primaryColor} style={{ animation: 'spin 1s linear infinite' }} />
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>Waiting for payment…</h2>
          <p style={{ color: '#64748b', marginTop: 6, fontSize: 13 }}>
            Check your phone for the {provider === 'mtn' ? 'MTN MoMo' : 'Airtel Money'} prompt
          </p>
        </div>
        <div style={{
          background: provider === 'mtn' ? '#fbbf24' : '#ef4444',
          color: provider === 'mtn' ? '#78350f' : '#fff',
          borderRadius: 12, padding: '14px 24px', fontWeight: 700, fontSize: 15, width: '100%',
        }}>
          Dial *{provider === 'mtn' ? '165#' : '185#'} if no prompt appears
        </div>
        <p style={{ fontSize: 12, color: '#94a3b8' }}>Checking every 3 seconds…</p>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 18, padding: '24px 0' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check size={36} color="#059669" />
        </div>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>Payment Received!</h2>
          <p style={{ color: '#64748b', marginTop: 6, fontSize: 14 }}>Your internet is ready</p>
        </div>
        {voucherCode && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 20px', width: '100%' }}>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 6px' }}>Your voucher code (SMS sent too)</p>
            <p style={{ fontSize: 26, fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.15em', color: '#065f46', margin: 0 }}>
              {voucherCode}
            </p>
          </div>
        )}
        <p style={{ fontSize: 13, color: '#64748b' }}>
          📱 Check SMS · Use code in the <strong>Enter Voucher</strong> tab to connect
        </p>
        <button onClick={() => { setStep('select'); setSelectedPkg(null); setPhone(''); }}
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
          ← Buy another
        </button>
      </div>
    );
  }

  if (step === 'failed') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 18, padding: '24px 0' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertCircle size={36} color="#dc2626" />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>Payment Failed</h2>
        <p style={{ color: '#64748b', fontSize: 13 }}>Please try again or contact support.</p>
        <button onClick={() => setStep('pay')}
          style={{ background: primaryColor, border: 'none', color: '#fff', borderRadius: 10, padding: '12px 28px', fontWeight: 700, cursor: 'pointer' }}>
          Try Again
        </button>
      </div>
    );
  }

  if (step === 'pay' && selectedPkg) {
    return (
      <form onSubmit={handlePay} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" onClick={() => setStep('select')}
            style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '7px 10px', cursor: 'pointer' }}>
            <ArrowLeft size={16} color="#64748b" />
          </button>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1e293b', margin: 0 }}>Complete Payment</h2>
        </div>

        <div style={{ background: primaryColor + '0f', border: `1px solid ${primaryColor}33`, borderRadius: 12, padding: '14px 16px' }}>
          <p style={{ fontWeight: 700, color: primaryColor, margin: 0 }}>{selectedPkg.name}</p>
          <p style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: '4px 0 0' }}>{fmt(selectedPkg.price_ugx)}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {(['mtn', 'airtel'] as const).map(p => (
            <button key={p} type="button" onClick={() => setProvider(p)}
              style={{
                padding: '12px 8px', borderRadius: 10,
                border: `2px solid ${provider === p ? (p === 'mtn' ? '#f59e0b' : '#ef4444') : '#e2e8f0'}`,
                background: provider === p ? (p === 'mtn' ? '#fef3c7' : '#fee2e2') : '#fff',
                cursor: 'pointer', fontWeight: 700, fontSize: 12,
                color: provider === p ? (p === 'mtn' ? '#92400e' : '#991b1b') : '#64748b',
              }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: p === 'mtn' ? '#f59e0b' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 11 }}>{p === 'mtn' ? 'M' : 'A'}</span>
              </div>
              {p === 'mtn' ? 'MTN MoMo' : 'Airtel Money'}
            </button>
          ))}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
            Mobile Money Number
          </label>
          <div style={{ position: 'relative' }}>
            <Phone size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input type="tel" inputMode="numeric" placeholder="07XXXXXXXX or +256XXXXXXXXX"
              value={phone} onChange={e => setPhone(e.target.value)}
              style={{ width: '100%', border: '2px solid #e2e8f0', borderRadius: 10, paddingLeft: 36, paddingRight: 14, paddingTop: 12, paddingBottom: 12, fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <button type="submit" disabled={!phone.trim() || loading}
          style={{
            background: provider === 'mtn' ? '#f59e0b' : '#ef4444',
            border: 'none', color: provider === 'mtn' ? '#78350f' : '#fff',
            borderRadius: 12, padding: '14px 0', fontWeight: 700, fontSize: 15,
            cursor: !phone.trim() || loading ? 'not-allowed' : 'pointer',
            opacity: !phone.trim() ? 0.5 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
          {loading
            ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            : `Pay ${fmt(selectedPkg.price_ugx)} with ${provider === 'mtn' ? 'MTN MoMo' : 'Airtel Money'}`}
        </button>
      </form>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
          <CreditCard size={24} color="#2563eb" />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1e293b', margin: 0 }}>Buy Now</h2>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Pay with mobile money and get instant access</p>
      </div>

      {packages.length === 0 && (
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 13, padding: '20px 0' }}>
          No packages available at this location.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {packages.map(pkg => (
          <button key={pkg.id} onClick={() => { setSelectedPkg(pkg); setStep('pay'); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', borderRadius: 12, border: '2px solid #e2e8f0',
              background: '#fff', cursor: 'pointer', textAlign: 'left',
              transition: 'border-color 0.15s',
            }}>
            <div>
              <p style={{ fontWeight: 700, color: '#1e293b', margin: 0, fontSize: 15 }}>{pkg.name}</p>
              <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                {(pkg.download_mbps || pkg.speed_mbps) && (
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>
                    {pkg.download_mbps || pkg.speed_mbps} Mbps
                  </span>
                )}
                <span style={{ fontSize: 12, color: '#94a3b8' }}>
                  {fmtDuration(pkg.duration_hrs, pkg.duration_label)}
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: 800, color: primaryColor, fontSize: 17, margin: 0 }}>{fmt(pkg.price_ugx)}</p>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>per session</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function TenantPortalPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [tenant, setTenant]   = useState<TenantInfo | null>(null);
  const [packages, setPackages] = useState<PkgInfo[]>([]);
  const [tab, setTab]         = useState<TabKey>('voucher');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetch(`/api/portal/${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setTenant(data.tenant);
        setPackages(data.packages || []);
      })
      .catch(() => setError('Could not load portal'))
      .finally(() => setLoading(false));
  }, [slug]);

  const { error_msg } = getHotspotParams();
  const primary = tenant?.primary_color || '#2563eb';

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={40} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
          <AlertCircle size={48} style={{ marginBottom: 16 }} />
          <p style={{ fontSize: 16 }}>Portal not found</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>{error}</p>
        </div>
      </div>
    );
  }

  const hasTrial = !!(tenant?.free_trial_minutes);
  const tpl = tenant?.portal_template || 'classic';
  const theme = tenant?.portal_theme || 'light';
  const pageBg = tpl === 'compact'
    ? '#eef2ff'
    : tpl === 'hero'
      ? `linear-gradient(145deg, #06111f 0%, ${primary}33 48%, #101827 100%)`
      : `linear-gradient(135deg, ${primary}22 0%, #0f172a 50%, #1e293b 100%)`;

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    ...(hasTrial ? [{ key: 'trial' as TabKey,   label: 'Free Trial',     icon: <Gift size={14} /> }] : []),
    { key: 'voucher', label: 'Enter Voucher', icon: <Ticket size={14} /> },
    { key: 'paid',    label: 'Already Bought Voucher', icon: <CheckCheck size={14} /> },
    { key: 'buy',     label: 'Buy Now',       icon: <CreditCard size={14} /> },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: pageBg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px 12px', fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        @media (max-width: 420px) { .portal-tabs button { font-size: 11px !important; padding: 12px 4px !important; }  }
      `}</style>

      <div style={{ width: '100%', maxWidth: tpl === 'compact' ? 460 : 420 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          {tenant?.logo_url ? (
            <img src={tenant.logo_url} alt={tenant.name} style={{ height: 52, marginBottom: 10, borderRadius: 10, objectFit: 'contain' }} />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: 16, background: primary, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
              <Wifi size={28} color="#fff" />
            </div>
          )}
          <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: 0 }}>
            {tenant?.name || 'WiFi Access'}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 12, marginTop: 3 }}>Connect to the internet</p>
        </div>

        {/* MikroTik error pass-through */}
        {error_msg && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: '#dc2626', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
            <AlertCircle size={15} /> {error_msg}
          </div>
        )}

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: tpl === 'compact' ? 12 : 24, boxShadow: '0 25px 50px rgba(0,0,0,0.4)', overflow: 'hidden' }}>

          {/* Tabs */}
          <div className="portal-tabs" style={{ display: 'flex', borderBottom: '2px solid #f1f5f9', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                style={{
                  flex: 1, minWidth: 0, padding: '13px 6px',
                  fontSize: 12, fontWeight: 600,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                  background: tab === t.key ? primary + '0f' : '#fff',
                  color: tab === t.key ? primary : '#94a3b8',
                  borderBottom: tab === t.key ? `2px solid ${primary}` : '2px solid transparent',
                  marginBottom: -2,
                }}>
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding: 20 }}>
            {tab === 'trial' && tenant && (
              <FreeTrialTab slug={slug} primaryColor={primary} tenant={tenant} />
            )}
            {tab === 'voucher' && (
              <VoucherTab slug={slug} primaryColor={primary} />
            )}
            {tab === 'paid' && (
              <IPaidTab slug={slug} primaryColor={primary} />
            )}
            {tab === 'buy' && (
              <BuyTab slug={slug} packages={packages} primaryColor={primary} />
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 14 }}>
          <span style={{ background: '#facc15', color: '#111827', borderRadius: 999, padding: '5px 12px', fontSize: 11, fontWeight: 800 }}>MTN MoMo</span>
          <span style={{ background: '#ef4444', color: '#fff', borderRadius: 999, padding: '5px 12px', fontSize: 11, fontWeight: 800 }}>Airtel Money</span>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 18, color: '#64748b', fontSize: 12 }}>
          {tenant?.support_phone && (
            <p style={{ margin: '0 0 4px' }}>
              <Phone size={11} style={{ display: 'inline', marginRight: 4 }} />
              Support: <a href={`tel:${tenant.support_phone}`} style={{ color: primary }}>{tenant.support_phone}</a>
            </p>
          )}
          {tenant?.support_email && (
            <p style={{ margin: '0 0 4px' }}>
              <a href={`mailto:${tenant.support_email}`} style={{ color: primary }}>{tenant.support_email}</a>
            </p>
          )}
          <p style={{ margin: 0 }}>
            Powered by{' '}
            <a href="https://www.icubeug.net" style={{ color: primary, fontWeight: 700, textDecoration: 'none' }}>
              iCube Solutions
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
