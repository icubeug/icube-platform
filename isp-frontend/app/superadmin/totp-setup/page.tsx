'use client';
import { useEffect, useState } from 'react';
import { Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function TotpSetupPage() {
  const [qr, setQr]           = useState('');
  const [secret, setSecret]   = useState('');
  const [code, setCode]       = useState('');
  const [step, setStep]       = useState<'loading' | 'scan' | 'verify' | 'done' | 'error'>('loading');
  const [err, setErr]         = useState('');
  const [saving, setSaving]   = useState(false);

  function saToken() {
    return typeof window !== 'undefined' ? localStorage.getItem('sa_token') || '' : '';
  }

  useEffect(() => {
    fetch('/api/superadmin/totp/setup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${saToken()}` },
    })
      .then(r => r.json())
      .then(d => {
        if (d.error) { setErr(d.error); setStep('error'); return; }
        setQr(d.qr_code);
        setSecret(d.secret);
        setStep('scan');
      })
      .catch(() => { setErr('Failed to load setup. Try again.'); setStep('error'); });
  }, []);

  async function verifyCode() {
    if (code.length < 6) return;
    setSaving(true); setErr('');
    try {
      const res = await fetch('/api/superadmin/totp/verify-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${saToken()}` },
        body: JSON.stringify({ code }),
      });
      const d = await res.json();
      if (!res.ok) { setErr(d.error || 'Invalid code'); setSaving(false); return; }
      setStep('done');
    } catch { setErr('Network error'); } finally { setSaving(false); }
  }

  if (step === 'loading') return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={24} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 420, padding: '0 24px' }}>
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 16, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid #1e1e1e', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Shield size={22} color="#6366f1" />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Set Up Two-Factor Auth</h2>
            <p style={{ fontSize: 13, color: '#555', margin: 0 }}>Required before deleting tenants</p>
          </div>

          <div style={{ padding: 24 }}>
            {step === 'error' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '12px 14px', color: '#f87171', fontSize: 13 }}>
                <AlertCircle size={15} /> {err}
              </div>
            )}

            {step === 'scan' && (
              <>
                <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
                  Scan this QR code with <strong style={{ color: '#fff' }}>Google Authenticator</strong> or any TOTP app.
                </p>
                {qr && (
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <img src={qr} alt="QR Code" style={{ width: 200, height: 200, borderRadius: 8, border: '4px solid #1e1e1e' }} />
                  </div>
                )}
                <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 8, padding: '10px 12px', marginBottom: 20 }}>
                  <p style={{ fontSize: 10, color: '#555', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase' }}>Manual entry key</p>
                  <p style={{ fontSize: 13, fontFamily: 'monospace', color: '#aaa', margin: 0, wordBreak: 'break-all' }}>{secret}</p>
                </div>
                <button onClick={() => setStep('verify')} style={{
                  width: '100%', background: '#6366f1', border: 'none', color: '#fff',
                  borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>
                  I've scanned it → Enter Code
                </button>
              </>
            )}

            {step === 'verify' && (
              <>
                <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
                  Enter the 6-digit code from your authenticator app to confirm setup.
                </p>
                {err && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 12px', color: '#f87171', fontSize: 13, marginBottom: 14 }}>
                    <AlertCircle size={14} /> {err}
                  </div>
                )}
                <input
                  type="text" inputMode="numeric" maxLength={6} value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g,'').slice(0,6))}
                  placeholder="000000"
                  style={{
                    width: '100%', background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: 10,
                    padding: '14px 0', fontSize: 28, fontFamily: 'monospace', fontWeight: 700,
                    textAlign: 'center', letterSpacing: '0.3em', color: '#fff', outline: 'none',
                    marginBottom: 14, boxSizing: 'border-box',
                  }}
                  onKeyDown={e => e.key === 'Enter' && verifyCode()}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setStep('scan')} style={{
                    flex: 1, background: '#1e1e1e', border: '1px solid #2a2a2a', color: '#aaa',
                    borderRadius: 10, padding: '12px 0', fontSize: 13, cursor: 'pointer',
                  }}>
                    ← Back
                  </button>
                  <button onClick={verifyCode} disabled={saving || code.length < 6} style={{
                    flex: 2, background: saving ? '#555' : '#6366f1', border: 'none', color: '#fff',
                    borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 600,
                    cursor: saving || code.length < 6 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                    {saving ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Verifying…</> : 'Confirm Setup'}
                  </button>
                </div>
              </>
            )}

            {step === 'done' && (
              <div style={{ textAlign: 'center', padding: '8px 0' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <CheckCircle size={28} color="#22c55e" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>2FA Enabled!</h3>
                <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>
                  Your account is now protected. You can delete tenants using your authenticator code.
                </p>
                <a href="/superadmin/tenants" style={{
                  display: 'block', background: '#6366f1', color: '#fff', textDecoration: 'none',
                  borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 600, textAlign: 'center',
                }}>
                  Back to Tenants →
                </a>
              </div>
            )}
          </div>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );
}
