'use client';
import { useState } from 'react';
import { Eye, EyeOff, Shield, Loader, AlertCircle } from 'lucide-react';

export default function SuperadminLoginPage() {
  const [form, setForm]       = useState({ email: '', password: '' });
  const [show, setShow]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

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
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      localStorage.setItem('sa_token', data.token);
      window.location.href = '/superadmin/dashboard';
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: '#0f0f0f', border: '1px solid #2a2a2a',
    borderRadius: 10, padding: '11px 14px',
    fontSize: 14, color: '#ffffff', outline: 'none',
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#080808',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 24px' }}>

        {/* Badge */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(99,102,241,0.35)',
          }}>
            <Shield size={26} color="#fff" />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', margin: '0 0 6px' }}>
            iCube Staff Portal
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
            Authorized personnel only
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#111111', border: '1px solid #222222',
          borderRadius: 18, padding: '28px 24px',
          boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
        }}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 7 }}>
                Staff email
              </label>
              <input
                type="email" required
                value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="you@icubeug.net"
                autoComplete="email"
                style={inp}
                onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.7)')}
                onBlur={e  => (e.target.style.borderColor = '#2a2a2a')}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 7 }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={show ? 'text' : 'password'} required
                  value={form.password} onChange={e => set('password', e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ ...inp, paddingRight: 42 }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.7)')}
                  onBlur={e  => (e.target.style.borderColor = '#2a2a2a')}
                />
                <button type="button" onClick={() => setShow(v => !v)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                  cursor: 'pointer', padding: 2, display: 'flex',
                }}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171',
              }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} /> {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', background: loading ? 'rgba(99,102,241,0.5)' : '#6366f1',
              border: 'none', color: '#fff', borderRadius: 10, padding: '12px 0',
              fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              marginTop: 4, transition: 'background 0.15s',
            }}>
              {loading
                ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Signing in…</>
                : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.25)', marginTop: 20 }}>
          <a href="/auth/login" style={{ color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>
            ← Tenant login
          </a>
        </p>
      </div>

      <style>{`
        input::placeholder { color: rgba(255,255,255,0.25) !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
