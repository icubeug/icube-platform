'use client';
import { useState } from 'react';
import { Wifi, Loader, AlertCircle, ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [sent, setSent]       = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed'); return; }
      // Store email for reset page
      sessionStorage.setItem('reset_email', email);
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif', padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #1D9E75, #15b87e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(29,158,117,0.35)',
          }}>
            <Wifi size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>
            {sent ? 'Check your phone' : 'Reset your password'}
          </h1>
          <p style={{ fontSize: 13, color: '#555', margin: 0 }}>
            {sent
              ? `We sent a reset code to ${email}`
              : "Enter your email and we'll send you a reset code"}
          </p>
        </div>

        {sent ? (
          <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 20, padding: '28px 28px 24px', textAlign: 'center' }}>
            <Mail size={40} style={{ color: '#1D9E75', margin: '0 auto 16px', display: 'block' }} />
            <p style={{ color: '#aaa', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
              A 6-digit reset code was sent to your registered phone number.
            </p>
            <a
              href="/auth/reset-password"
              style={{
                display: 'block', width: '100%', background: '#fff', color: '#0a0a0a',
                borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 700,
                textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box',
              }}>
              Enter reset code
            </a>
          </div>
        ) : (
          <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 20, padding: '28px 28px 24px' }}>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#666', fontWeight: 500, marginBottom: 7 }}>Email address</label>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  style={{
                    width: '100%', background: '#0d0d0d', border: '1px solid #252525',
                    borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#fff',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = '#1D9E75'}
                  onBlur={e  => e.target.style.borderColor = '#252525'}
                />
              </div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171' }}>
                  <AlertCircle size={14} style={{ flexShrink: 0 }} /> {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                style={{ width: '100%', background: '#fff', border: 'none', color: '#0a0a0a', borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: loading ? 0.7 : 1 }}>
                {loading ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Sending…</> : 'Send reset code'}
              </button>
            </form>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 13, color: '#444', marginTop: 20 }}>
          <a href="/auth/login" style={{ color: '#1D9E75', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ArrowLeft size={13} /> Back to login
          </a>
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
