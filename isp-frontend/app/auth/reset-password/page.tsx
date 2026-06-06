'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Wifi, Loader, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail]   = useState('');
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [newPw, setNewPw]   = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const [done, setDone]     = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const e = sessionStorage.getItem('reset_email');
    if (e) setEmail(e);
    inputRefs.current[0]?.focus();
  }, []);

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
    const next = [...digits]; next[i] = val; setDigits(next);
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputRefs.current[i - 1]?.focus();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const otp = digits.join('');
    if (otp.length !== 6) { setError('Enter all 6 digits'); return; }
    if (newPw !== confirm)  { setError('Passwords do not match'); return; }
    if (newPw.length < 8)   { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, new_password: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed'); return; }
      sessionStorage.removeItem('reset_email');
      setDone(true);
      setTimeout(() => router.replace('/auth/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <CheckCircle size={52} style={{ color: '#1D9E75', margin: '0 auto 16px', display: 'block' }} />
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>Password updated</h2>
          <p style={{ fontSize: 13, color: '#555' }}>Redirecting to login…</p>
        </div>
      </div>
    );
  }

  const inputStyle = { width: '100%', background: '#0d0d0d', border: '1px solid #252525', borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' as const };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #1D9E75, #15b87e)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(29,158,117,0.35)' }}>
            <Wifi size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>New password</h1>
          <p style={{ fontSize: 13, color: '#555', margin: 0 }}>Enter the code we sent and your new password</p>
        </div>

        <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 20, padding: '28px 28px 24px' }}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* OTP */}
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#666', fontWeight: 500, marginBottom: 10 }}>Reset code</label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {digits.map((d, i) => (
                  <input key={i} ref={el => { inputRefs.current[i] = el; }}
                    type="text" inputMode="numeric" maxLength={6} value={d}
                    onChange={e => handleChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    onPaste={e => { e.preventDefault(); handleChange(0, e.clipboardData.getData('text')); }}
                    style={{ width: 44, height: 52, textAlign: 'center', fontSize: 20, fontWeight: 700, background: d ? '#1a2a22' : '#0d0d0d', border: `2px solid ${d ? '#1D9E75' : '#252525'}`, borderRadius: 10, color: '#fff', outline: 'none' }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#666', fontWeight: 500, marginBottom: 7 }}>New password</label>
              <div style={{ position: 'relative' }}>
                <input type={show ? 'text' : 'password'} required value={newPw} onChange={e => setNewPw(e.target.value)}
                  placeholder="At least 8 characters" autoComplete="new-password"
                  style={{ ...inputStyle, paddingRight: 42 }}
                  onFocus={e => e.target.style.borderColor = '#1D9E75'}
                  onBlur={e  => e.target.style.borderColor = '#252525'} />
                <button type="button" onClick={() => setShow(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 2, display: 'flex' }}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#666', fontWeight: 500, marginBottom: 7 }}>Confirm password</label>
              <input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat new password" autoComplete="new-password"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#1D9E75'}
                onBlur={e  => e.target.style.borderColor = '#252525'} />
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171' }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} /> {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ width: '100%', background: '#fff', border: 'none', color: '#0a0a0a', borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: loading ? 0.7 : 1, marginTop: 4 }}>
              {loading ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Updating…</> : 'Update password'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#444', marginTop: 20 }}>
          <a href="/auth/login" style={{ color: '#1D9E75', textDecoration: 'none', fontWeight: 600 }}>← Back to login</a>
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
