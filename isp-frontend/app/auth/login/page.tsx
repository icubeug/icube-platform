'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader, AlertCircle } from 'lucide-react';

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

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get('callbackUrl') || '/admin';

  const [form, setForm]       = useState({ email: '', password: '' });
  const [show, setShow]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    const token = localStorage.getItem('icube_token');
    if (token) router.replace(callbackUrl);
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }

      if (data.status === 'otp_sent') {
        sessionStorage.setItem('otp_email', form.email);
        sessionStorage.setItem('otp_callback', callbackUrl);
        router.push('/auth/verify');
      } else if (data.token) {
        storeSession(data);
        router.replace(callbackUrl);
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  function storeSession(data: any) {
    localStorage.setItem('icube_token',     data.token);
    localStorage.setItem('icube_tenant_id', String(data.tenant?.id || ''));
    localStorage.setItem('icube_user',      JSON.stringify(data.admin || {}));
    document.cookie = `icube_token=${data.token}; path=/; max-age=604800; SameSite=Lax`;
  }

  return (
    <div style={pageStyle}>
      <div style={overlayStyle} />

      <div style={cardStyle}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo-full.svg" alt="iCube" style={{ height: 44, width: 'auto', display: 'block', margin: '0 auto 10px' }} />
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '0 0 20px', letterSpacing: '0.06em', fontWeight: 500, textTransform: 'uppercase' }}>Redefining IT</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', margin: '0 0 6px' }}>Welcome back</h1>
          <p style={{ fontSize: 13, color: '#aaaaaa', margin: 0 }}>Sign in to your iCube dashboard</p>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={lblStyle}>Email address</label>
            <input
              type="email" required
              value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              style={inpStyle}
              onFocus={e => e.target.style.borderColor = 'rgba(37,99,235,0.7)'}
              onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
              <label style={lblStyle}>Password</label>
              <a href="/auth/forgot-password" style={{ fontSize: 12, color: '#1D9E75', textDecoration: 'none' }}>
                Forgot password?
              </a>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={show ? 'text' : 'password'} required
                value={form.password} onChange={e => set('password', e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ ...inpStyle, paddingRight: 42 }}
                onFocus={e => e.target.style.borderColor = 'rgba(37,99,235,0.7)'}
                onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.12)'}
              />
              <button
                type="button" onClick={() => setShow(v => !v)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#aaaaaa', cursor: 'pointer', padding: 2, display: 'flex' }}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#f87171' }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} /> {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', background: loading ? 'rgba(255,255,255,0.3)' : '#ffffff',
              border: 'none', color: '#0a0a0a', borderRadius: 10, padding: '12px 0',
              fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              marginTop: 4, transition: 'all 0.15s',
            }}>
            {loading ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Signing in…</> : 'Continue'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#aaaaaa', marginTop: 20, marginBottom: 0 }}>
          Don&apos;t have an account?{' '}
          <a href="/auth/register" style={{ color: '#1D9E75', textDecoration: 'none', fontWeight: 600 }}>
            Create one free
          </a>
        </p>
        <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.2)', marginTop: 12, marginBottom: 0 }}>
          <a href="/superadmin/login" style={{ color: 'rgba(255,255,255,0.2)', textDecoration: 'none' }}>Staff portal →</a>
        </p>
      </div>

      <style>{`
        input::placeholder { color: rgba(255,255,255,0.3) !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
