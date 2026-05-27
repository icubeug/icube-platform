'use client';
import { useState } from 'react';
import { Eye, EyeOff, Shield, Loader, AlertCircle } from 'lucide-react';

export default function SuperadminLoginPage() {
  const [form, setForm]   = useState({ email: '', password: '' });
  const [show, setShow]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/superadmin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      localStorage.setItem('sa_token', data.token);
      window.location.href = '/superadmin/dashboard';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 380, padding: '0 24px' }}>
        {/* Badge */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Shield size={24} color="#fff" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>iCube Staff Portal</h1>
          <p style={{ fontSize: 12, color: '#444', margin: 0 }}>Authorized personnel only</p>
        </div>

        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 16, padding: 24 }}>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 6 }}>Staff email</label>
              <input
                type="email" required value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="admin@icube.co.ug"
                style={{ width: '100%', background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#666', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={show ? 'text' : 'password'} required value={form.password} onChange={e => set('password', e.target.value)}
                  placeholder="••••••••"
                  style={{ width: '100%', background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 8, padding: '9px 38px 9px 12px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' }}
                />
                <button type="button" onClick={() => setShow(v => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 2, display: 'flex' }}>
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#f87171' }}>
                <AlertCircle size={13} /> {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ width: '100%', background: '#6366f1', border: 'none', color: '#fff', borderRadius: 8, padding: '10px 0', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
              {loading ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Signing in…</> : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#333', marginTop: 16 }}>
          <a href="/login" style={{ color: '#333', textDecoration: 'none' }}>← ISP tenant login</a>
        </p>
      </div>
    </div>
  );
}
