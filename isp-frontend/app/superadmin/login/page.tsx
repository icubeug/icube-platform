'use client';
import { useState } from 'react';
import { Eye, EyeOff, Shield, RefreshCw, AlertCircle } from 'lucide-react';

export default function SuperadminLoginPage() {
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [show,    setShow]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/superadmin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid credentials'); return; }
      localStorage.setItem('sa_token', data.token);
      window.location.href = '/superadmin/dashboard';
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: '#0a1628',
    border: '1px solid #1a2540', borderRadius: 10, padding: '11px 14px',
    fontSize: 14, color: '#f1f5f9', outline: 'none', fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 40%, #0c1f45 0%, #050d1f 55%, #020810 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Subtle grid background */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(14,165,233,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(14,165,233,0.03) 1px,transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 400, padding: '0 24px', position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 32px rgba(14,165,233,0.4)',
          }}>
            <Shield size={26} color="#fff" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
            iCube Staff Portal
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
            Authorized personnel only
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(10,22,40,0.8)',
          border: '1px solid #1a2540',
          borderRadius: 18, padding: '28px 26px',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: 7 }}>
                Staff Email
              </label>
              <input
                type="email" required autoComplete="email"
                value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="you@icubeug.net"
                style={inp}
                onFocus={e => (e.target.style.borderColor = 'rgba(14,165,233,0.7)')}
                onBlur={e  => (e.target.style.borderColor = '#1a2540')}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.55)', marginBottom: 7 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={show ? 'text' : 'password'} required autoComplete="current-password"
                  value={form.password} onChange={e => set('password', e.target.value)}
                  placeholder="••••••••"
                  style={{ ...inp, paddingRight: 44 }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(14,165,233,0.7)')}
                  onBlur={e  => (e.target.style.borderColor = '#1a2540')}
                />
                <button type="button" onClick={() => setShow(v => !v)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
                  cursor: 'pointer', padding: 2, display: 'flex',
                }}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171' }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} /> {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', background: loading ? 'rgba(14,165,233,0.5)' : '#0ea5e9',
              border: 'none', color: '#fff', borderRadius: 10, padding: '12px 0',
              fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginTop: 4, transition: 'background 0.15s',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(14,165,233,0.35)',
            }}>
              {loading
                ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Signing in…</>
                : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 22 }}>
          <a href="/auth/login" style={{ color: 'rgba(255,255,255,0.2)', textDecoration: 'none' }}>
            ← Tenant login
          </a>
        </p>
      </div>

      <style>{`
        input::placeholder { color: rgba(255,255,255,0.2) !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
