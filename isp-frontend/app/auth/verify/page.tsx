'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Wifi, Loader, AlertCircle, RefreshCw } from 'lucide-react';

const pageStyle = {
  minHeight: '100vh',
  position: 'relative' as const,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundImage: "url('/auth-bg.jpg')",
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
};

const overlayStyle = {
  position: 'absolute' as const,
  inset: 0,
  background: 'rgba(0, 0, 0, 0.65)',
};

const cardStyle = {
  position: 'relative' as const,
  zIndex: 10,
  background: 'rgba(13, 13, 13, 0.88)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '16px',
  padding: '40px',
  width: '420px',
  maxWidth: 'calc(100vw - 32px)',
  boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
};

function VerifyForm() {
  const router = useRouter();

  const [email, setEmail]         = useState('');
  const [callbackUrl, setCallback] = useState('/admin');
  const [digits, setDigits]       = useState(['', '', '', '', '', '']);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const e  = sessionStorage.getItem('otp_email');
    const cb = sessionStorage.getItem('otp_callback');
    if (!e) { router.replace('/auth/login'); return; }
    setEmail(e);
    if (cb) setCallback(cb);
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (countdown <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function handleChange(i: number, val: string) {
    if (val.length > 1) {
      const nums = val.replace(/\D/g, '').slice(0, 6).split('');
      const next = [...digits];
      nums.forEach((n, idx) => { if (i + idx < 6) next[i + idx] = n; });
      setDigits(next);
      inputRefs.current[Math.min(i + nums.length, 5)]?.focus();
      return;
    }
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputRefs.current[i - 1]?.focus();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const otp = digits.join('');
    if (otp.length !== 6) { setError('Enter all 6 digits'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Verification failed'); return; }
      localStorage.setItem('icube_token',     data.token);
      localStorage.setItem('icube_tenant_id', String(data.tenant?.id || ''));
      localStorage.setItem('icube_user',      JSON.stringify(data.admin || {}));
      document.cookie = `icube_token=${data.token}; path=/; max-age=604800; SameSite=Lax`;
      sessionStorage.removeItem('otp_email');
      sessionStorage.removeItem('otp_callback');
      router.replace(callbackUrl);
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (!canResend) return;
    setResending(true); setError('');
    try {
      const res  = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to resend'); return; }
      setDigits(['', '', '', '', '', '']);
      setCountdown(60);
      setCanResend(false);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setResending(false);
    }
  }

  const otp = digits.join('');

  return (
    <div style={pageStyle}>
      <div style={overlayStyle} />

      <div style={cardStyle}>
        {/* Icon + heading */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #1D9E75, #15b87e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(29,158,117,0.35)',
          }}>
            <Wifi size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', margin: '0 0 6px' }}>Check your phone</h1>
          <p style={{ fontSize: 13, color: '#aaaaaa', margin: 0 }}>
            We sent a 6-digit code to{email
              ? <><br /><span style={{ color: 'rgba(255,255,255,0.6)' }}>{email}</span></>
              : ' your phone'}
          </p>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* 6-digit inputs */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={e => { e.preventDefault(); handleChange(0, e.clipboardData.getData('text')); }}
                style={{
                  width: 48, height: 56,
                  textAlign: 'center', fontSize: 22, fontWeight: 700,
                  background: d ? 'rgba(29,158,117,0.15)' : 'rgba(255,255,255,0.06)',
                  border: `2px solid ${d ? '#1D9E75' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: 12, color: '#ffffff', outline: 'none',
                  transition: 'border-color 0.15s, background 0.15s',
                  caretColor: '#1D9E75',
                }}
                onFocus={e => { e.target.style.borderColor = '#1D9E75'; }}
                onBlur={e  => { e.target.style.borderColor = digits[i] ? '#1D9E75' : 'rgba(255,255,255,0.12)'; }}
              />
            ))}
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171' }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} /> {error}
            </div>
          )}

          <button
            type="submit" disabled={loading || otp.length < 6}
            style={{
              width: '100%',
              background: otp.length === 6 && !loading ? '#ffffff' : 'rgba(255,255,255,0.15)',
              border: 'none',
              color: otp.length === 6 && !loading ? '#0a0a0a' : 'rgba(255,255,255,0.4)',
              borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 700,
              cursor: loading || otp.length < 6 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              transition: 'all 0.15s',
            }}>
            {loading
              ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Verifying…</>
              : 'Verify code'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          {canResend ? (
            <button onClick={resend} disabled={resending} style={{ background: 'none', border: 'none', color: '#1D9E75', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              {resending
                ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> Resending…</>
                : <><RefreshCw size={13} /> Resend code</>}
            </button>
          ) : (
            <p style={{ fontSize: 13, color: '#aaaaaa', margin: 0 }}>
              Resend code in <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{countdown}s</span>
            </p>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#aaaaaa', marginTop: 20, marginBottom: 0 }}>
          Wrong email?{' '}
          <a href="/auth/login" style={{ color: '#1D9E75', textDecoration: 'none', fontWeight: 600 }}
            onClick={() => sessionStorage.removeItem('otp_email')}>
            Go back
          </a>
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
