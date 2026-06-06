'use client';
import { useState } from 'react';
import { Eye, EyeOff, Loader, AlertCircle, CheckCircle } from 'lucide-react';

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
  padding: '24px 16px',
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
  width: '460px',
  maxWidth: '100%',
  boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
};

const inpStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10,
  padding: '11px 14px',
  fontSize: 14,
  color: '#ffffff',
  outline: 'none',
  boxSizing: 'border-box' as const,
  transition: 'border-color 0.15s',
};

const lblStyle = {
  display: 'block' as const,
  fontSize: 12,
  color: '#aaaaaa',
  fontWeight: 500 as const,
  marginBottom: 7,
};

export default function RegisterPage() {
  const [form, setForm] = useState({
    business_name: '',
    owner_name:    '',
    email:         '',
    phone:         '',
    password:      '',
    confirm:       '',
  });
  const [show, setShow]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name:    form.business_name,
          owner_name:       form.owner_name,
          email:            form.email,
          phone:            form.phone,
          confirm_password: form.confirm,
          password:         form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Registration failed'); return; }
      setSuccess(true);
      setTimeout(() => { window.location.href = '/auth/login'; }, 1800);
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={pageStyle}>
        <div style={overlayStyle} />
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(29,158,117,0.15)', border: '2px solid rgba(29,158,117,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={36} color="#1D9E75" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', margin: '0 0 8px' }}>Account created!</h2>
          <p style={{ fontSize: 14, color: '#aaaaaa', margin: 0 }}>Redirecting to login…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={overlayStyle} />

      <div style={cardStyle}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/logo-full.svg" alt="iCube" style={{ height: 40, width: 'auto', display: 'block', margin: '0 auto 10px' }} />
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '0 0 16px', letterSpacing: '0.06em', fontWeight: 500, textTransform: 'uppercase' }}>Redefining IT</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', margin: '0 0 4px' }}>Get started free</h1>
          <p style={{ fontSize: 13, color: '#aaaaaa', margin: 0 }}>No credit card required.</p>
        </div>

        {/* Trust badges */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' as const }}>
          {['Free forever', 'No credit card', 'Ready in minutes'].map(t => (
            <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#1D9E75', background: 'rgba(29,158,117,0.12)', borderRadius: 99, padding: '4px 10px' }}>
              <CheckCircle size={10} /> {t}
            </span>
          ))}
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lblStyle}>Business / ISP name</label>
            <input required value={form.business_name} onChange={e => set('business_name', e.target.value)}
              placeholder="Kampala Wireless Ltd" style={inpStyle}
              onFocus={e => e.target.style.borderColor = 'rgba(37,99,235,0.7)'}
              onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.12)'} />
          </div>

          <div>
            <label style={lblStyle}>Your full name</label>
            <input value={form.owner_name} onChange={e => set('owner_name', e.target.value)}
              placeholder="John Okello" style={inpStyle}
              onFocus={e => e.target.style.borderColor = 'rgba(37,99,235,0.7)'}
              onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.12)'} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lblStyle}>Email</label>
              <input type="email" required value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="you@company.com" autoComplete="email" style={inpStyle}
                onFocus={e => e.target.style.borderColor = 'rgba(37,99,235,0.7)'}
                onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.12)'} />
            </div>
            <div>
              <label style={lblStyle}>Phone (Uganda)</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="0700 000 000" style={inpStyle}
                onFocus={e => e.target.style.borderColor = 'rgba(37,99,235,0.7)'}
                onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.12)'} />
            </div>
          </div>

          <div>
            <label style={lblStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <input type={show ? 'text' : 'password'} required value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="At least 8 characters" autoComplete="new-password"
                style={{ ...inpStyle, paddingRight: 42 }}
                onFocus={e => e.target.style.borderColor = 'rgba(37,99,235,0.7)'}
                onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.12)'} />
              <button type="button" onClick={() => setShow(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#aaaaaa', cursor: 'pointer', padding: 2, display: 'flex' }}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label style={lblStyle}>Confirm password</label>
            <input type="password" required value={form.confirm} onChange={e => set('confirm', e.target.value)}
              placeholder="Repeat password" autoComplete="new-password" style={inpStyle}
              onFocus={e => e.target.style.borderColor = 'rgba(37,99,235,0.7)'}
              onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.12)'} />
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171' }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} /> {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', background: loading ? 'rgba(255,255,255,0.3)' : '#ffffff',
            border: 'none', color: '#0a0a0a', borderRadius: 10, padding: '12px 0',
            fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            marginTop: 4, transition: 'all 0.15s',
          }}>
            {loading ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Creating account…</> : 'Create free account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#aaaaaa', marginTop: 20, marginBottom: 0 }}>
          Already have an account?{' '}
          <a href="/auth/login" style={{ color: '#1D9E75', textDecoration: 'none', fontWeight: 600 }}>Sign in</a>
        </p>
      </div>

      <style>{`
        input::placeholder { color: rgba(255,255,255,0.3) !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
