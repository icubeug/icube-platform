'use client';
import { useState } from 'react';
import { Eye, EyeOff, Wifi, Loader, AlertCircle, CheckCircle } from 'lucide-react';

const PLANS = [
  { id: 'starter', name: 'Starter', price: 'Free trial', desc: 'Up to 5 routers, 500 vouchers/mo' },
  { id: 'growth',  name: 'Growth',  price: 'UGX 150k/mo', desc: 'Up to 20 routers, 5,000 vouchers/mo' },
  { id: 'pro',     name: 'Pro',     price: 'UGX 350k/mo', desc: 'Unlimited routers & vouchers' },
];

export default function RegisterPage() {
  const [step, setStep]   = useState(1);
  const [form, setForm]   = useState({
    business_name: '', subdomain: '', owner_name: '',
    owner_phone: '', email: '', password: '', plan: 'starter',
  });
  const [show, setShow]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  function autoSlug(v: string) {
    return v.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').substring(0, 30);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Registration failed'); return; }
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('tenant_id', data.tenant.id);
      window.location.href = '/admin';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inp = (style?: any) => ({
    width: '100%', background: '#111', border: '1px solid #2a2a2a',
    borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#fff',
    outline: 'none', boxSizing: 'border-box' as const, ...style,
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 480, padding: '0 24px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #1D9E75, #159060)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Wifi size={22} color="#fff" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Start your 14-day free trial</h1>
          <p style={{ fontSize: 12, color: '#555', margin: 0 }}>No credit card required</p>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ flex: 1, height: 3, borderRadius: 99, background: n <= step ? '#1D9E75' : '#222', transition: 'background 0.3s' }} />
          ))}
        </div>

        <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 16, padding: 28 }}>
          <form onSubmit={submit}>
            {/* Step 1: Business */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Business details</h2>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 6 }}>Business name *</label>
                  <input style={inp()} required value={form.business_name}
                    placeholder="Kampala ISP Ltd"
                    onChange={e => { set('business_name', e.target.value); if (!form.subdomain) set('subdomain', autoSlug(e.target.value)); }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 6 }}>Subdomain</label>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, overflow: 'hidden' }}>
                    <input style={{ flex: 1, background: 'transparent', border: 'none', padding: '9px 12px', fontSize: 13, color: '#fff', outline: 'none' }}
                      value={form.subdomain}
                      placeholder="kampala-isp"
                      onChange={e => set('subdomain', autoSlug(e.target.value))} />
                    <span style={{ padding: '9px 12px', fontSize: 12, color: '#444', borderLeft: '1px solid #2a2a2a', whiteSpace: 'nowrap' }}>.icube.co.ug</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 6 }}>Owner name</label>
                    <input style={inp()} value={form.owner_name} placeholder="John Doe" onChange={e => set('owner_name', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 6 }}>Phone</label>
                    <input style={inp()} value={form.owner_phone} placeholder="+256700000000" onChange={e => set('owner_phone', e.target.value)} />
                  </div>
                </div>
                <button type="button" onClick={() => setStep(2)} disabled={!form.business_name}
                  style={{ width: '100%', background: '#1D9E75', border: 'none', color: '#fff', borderRadius: 8, padding: '10px 0', fontSize: 14, fontWeight: 600, cursor: !form.business_name ? 'not-allowed' : 'pointer', opacity: !form.business_name ? 0.5 : 1, marginTop: 4 }}>
                  Next →
                </button>
              </div>
            )}

            {/* Step 2: Plan */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Choose a plan</h2>
                {PLANS.map(plan => (
                  <button key={plan.id} type="button" onClick={() => set('plan', plan.id)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      background: form.plan === plan.id ? 'rgba(29,158,117,0.12)' : '#111',
                      border: `1px solid ${form.plan === plan.id ? '#1D9E75' : '#2a2a2a'}`,
                      borderRadius: 10, padding: '12px 14px', cursor: 'pointer', textAlign: 'left', width: '100%',
                      transition: 'all 0.2s',
                    }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${form.plan === plan.id ? '#1D9E75' : '#444'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      {form.plan === plan.id && <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#1D9E75' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{plan.name}</span>
                        <span style={{ fontSize: 12, color: '#1D9E75', fontWeight: 500 }}>{plan.price}</span>
                      </div>
                      <p style={{ fontSize: 11, color: '#555', margin: '3px 0 0' }}>{plan.desc}</p>
                    </div>
                  </button>
                ))}
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button type="button" onClick={() => setStep(1)}
                    style={{ flex: 1, background: '#111', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: 8, padding: '9px 0', fontSize: 13, cursor: 'pointer' }}>
                    ← Back
                  </button>
                  <button type="button" onClick={() => setStep(3)}
                    style={{ flex: 2, background: '#1D9E75', border: 'none', color: '#fff', borderRadius: 8, padding: '9px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Account */}
            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Create your account</h2>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 6 }}>Email address *</label>
                  <input style={inp()} type="email" required value={form.email}
                    placeholder="you@yourisp.com" onChange={e => set('email', e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 6 }}>Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input style={inp({ paddingRight: 38 })} type={show ? 'text' : 'password'} required
                      value={form.password} placeholder="Min 8 characters" onChange={e => set('password', e.target.value)} minLength={8} />
                    <button type="button" onClick={() => setShow(v => !v)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 2, display: 'flex' }}>
                      {show ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Summary */}
                <div style={{ background: '#111', border: '1px solid #222', borderRadius: 8, padding: '12px 14px' }}>
                  <p style={{ fontSize: 11, color: '#555', margin: '0 0 8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Summary</p>
                  {[
                    ['Business', form.business_name],
                    ['Plan', PLANS.find(p => p.id === form.plan)?.name || ''],
                    ['Trial', '14 days free'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#aaa', marginBottom: 4 }}>
                      <span style={{ color: '#555' }}>{k}</span>
                      <span>{v}</span>
                    </div>
                  ))}
                </div>

                {error && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#f87171' }}>
                    <AlertCircle size={13} /> {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" onClick={() => setStep(2)}
                    style={{ flex: 1, background: '#111', border: '1px solid #2a2a2a', color: '#aaa', borderRadius: 8, padding: '9px 0', fontSize: 13, cursor: 'pointer' }}>
                    ← Back
                  </button>
                  <button type="submit" disabled={loading || !form.email || !form.password}
                    style={{ flex: 2, background: '#1D9E75', border: 'none', color: '#fff', borderRadius: 8, padding: '9px 0', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    {loading ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</> : 'Create account'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#444', marginTop: 16 }}>
          Already have an account?{' '}
          <a href="/login" style={{ color: '#1D9E75', textDecoration: 'none', fontWeight: 500 }}>Sign in</a>
        </p>
      </div>
    </div>
  );
}
