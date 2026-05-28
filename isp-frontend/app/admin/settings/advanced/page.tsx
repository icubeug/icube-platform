'use client';
import { useEffect, useState } from 'react';
import { api, ApiCredentials } from '@/lib/api';
import { Copy, Eye, EyeOff, RefreshCw, Check, Key, Terminal, AlertCircle } from 'lucide-react';

const SERVER = '139.84.247.205';

function CopyBtn({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: copied ? 'rgba(37,99,235,0.15)' : '#1a1a1a',
      border: `1px solid ${copied ? '#2563eb' : '#2a2a2a'}`,
      color: copied ? '#2563eb' : '#888', borderRadius: 7,
      padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
    }}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

export default function AdvancedPage() {
  const [creds,       setCreds]       = useState<ApiCredentials | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [showToken,   setShowToken]   = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenMsg,    setRegenMsg]    = useState('');

  async function load() {
    setLoading(true); setError('');
    try { setCreds(await api.settings.getApiCredentials()); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function regenerate() {
    if (!confirm('Regenerate API token? Existing scripts that use the old token will stop working.')) return;
    setRegenerating(true); setRegenMsg('');
    try {
      await api.settings.regenerateApiToken();
      await load();
      setRegenMsg('Token regenerated. Update your router scripts.');
      setTimeout(() => setRegenMsg(''), 4000);
    } catch (e: any) { setError(e.message); }
    finally { setRegenerating(false); }
  }

  const slug      = creds?.tenant_slug || '—';
  const token     = creds?.api_token_full || '';
  const displayed = showToken ? token : (token ? token.slice(0, 12) + '•'.repeat(24) + token.slice(-4) : '');

  // Build example install command
  const exampleCmd = token
    ? `/tool fetch url="https://${SERVER}/api/v1/router/${slug}/scripts/full/[INSTALL_TOKEN]" http-header-field="Authorization: Bearer ${token}" dst-path="icube-setup.rsc" mode=https; :delay 2s; /import file-name="icube-setup.rsc"; :delay 1s; /file remove "icube-setup.rsc"`
    : '(generate a router to get the install command)';

  const inp: React.CSSProperties = {
    flex: 1, background: '#0f0f0f', border: '1px solid #1e1e1e',
    borderRadius: 7, padding: '8px 12px', fontSize: 12, color: '#aaa',
    outline: 'none', fontFamily: 'monospace',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', padding: '24px 28px' }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>API Credentials</h1>
      <p style={{ fontSize: 13, color: '#555', margin: '0 0 28px' }}>
        Your tenant API credentials for Zero-Touch Provisioning and programmatic access.
      </p>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 9, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#f87171' }}>
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {regenMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 9, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#fcd34d' }}>
          <Check size={13} /> {regenMsg}
        </div>
      )}

      {/* Tenant Slug */}
      <div style={{ background: '#131313', border: '1px solid #1e1e1e', borderRadius: 12, padding: '20px 22px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Key size={14} color="#2563eb" />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Tenant Identifier</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input readOnly value={loading ? '…' : slug} style={inp} />
          <CopyBtn text={slug} />
        </div>
        <p style={{ fontSize: 11, color: '#444', margin: '8px 0 0' }}>
          Used in API URLs: <code style={{ color: '#60a5fa' }}>https://{SERVER}/api/v1/router/{slug}/scripts/full/…</code>
        </p>
      </div>

      {/* API / Bearer Token */}
      <div style={{ background: '#131313', border: '1px solid #1e1e1e', borderRadius: 12, padding: '20px 22px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Key size={14} color="#8b5cf6" />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Tenant Bearer Token</span>
          </div>
          <button onClick={regenerate} disabled={regenerating || loading} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888',
            borderRadius: 7, padding: '5px 12px', fontSize: 11, cursor: 'pointer',
            opacity: regenerating ? 0.6 : 1,
          }}>
            <RefreshCw size={11} className={regenerating ? 'animate-spin' : ''} />
            Regenerate
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <input readOnly value={loading ? '…' : displayed} style={inp} />
          <button onClick={() => setShowToken(v => !v)} style={{
            background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888',
            borderRadius: 7, padding: '5px 10px', fontSize: 11, cursor: 'pointer',
            display: 'flex', alignItems: 'center',
          }}>
            {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
          {showToken && token && <CopyBtn text={token} />}
        </div>
        <p style={{ fontSize: 11, color: '#444', margin: '8px 0 0' }}>
          Used in <code style={{ color: '#60a5fa' }}>Authorization: Bearer icube_…</code> headers. Keep this secret.
        </p>
      </div>

      {/* ZTP Install command reference */}
      <div style={{ background: '#131313', border: '1px solid #1e1e1e', borderRadius: 12, padding: '20px 22px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Terminal size={14} color="#22c55e" />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Zero-Touch Install Command Format</span>
        </div>
        <div style={{ background: '#080808', border: '1px solid #1a1a1a', borderRadius: 8, padding: '12px 14px', marginBottom: 10, fontFamily: 'monospace', fontSize: 11, color: '#a3e635', lineHeight: 1.65, wordBreak: 'break-all' }}>
          {exampleCmd}
        </div>
        <p style={{ fontSize: 11, color: '#444', margin: 0 }}>
          Replace <code style={{ color: '#f59e0b' }}>[INSTALL_TOKEN]</code> with the token shown when you add a router from the dashboard.
        </p>
      </div>

      {/* How it works */}
      <div style={{ background: '#131313', border: '1px solid #1e1e1e', borderRadius: 12, padding: '20px 22px' }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: '0 0 14px' }}>How Zero-Touch Provisioning works</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['1', 'Click "+ Add Router" in the Router Monitoring page'],
            ['2', 'Enter router name and model — credentials are generated automatically'],
            ['3', 'Copy the ONE-LINE install command shown'],
            ['4', 'Paste it into your MikroTik terminal (Winbox → New Terminal)'],
            ['5', 'The router downloads its config, sets up VPN, RADIUS, and hotspot'],
            ['6', 'Router appears online in your dashboard within 60 seconds'],
          ].map(([n, text]) => (
            <div key={n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#2563eb', flexShrink: 0 }}>{n}</div>
              <span style={{ fontSize: 12, color: '#888', paddingTop: 3, lineHeight: 1.5 }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20, borderTop: '1px solid #1e1e1e', paddingTop: 16, display: 'flex', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 11, color: '#444', margin: 0 }}>Keep your bearer token secret. Treat it like a password.</p>
        <a href="mailto:support@icubeug.net" style={{ fontSize: 11, color: '#2563eb', textDecoration: 'none' }}>Contact support</a>
      </div>
    </div>
  );
}
