'use client';
import { useEffect, useState } from 'react';
import { api, TenantCredentials } from '@/lib/api';
import { Copy, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';

const SERVER = 'web.icubeug.net';

// ── Badge pill ────────────────────────────────────────────────────────────────
function Badge({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
      background: bg, color,
    }}>
      {label}
    </span>
  );
}

// ── Command block with Copy + Hide buttons ─────────────────────────────────────
function CommandBlock({ cmd }: { cmd: string }) {
  const [visible, setVisible] = useState(true);
  const [copied,  setCopied]  = useState(false);

  function copy() {
    navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const display = visible
    ? cmd
    : cmd.replace(/Bearer icube_[a-f0-9]+/g, 'Bearer ••••••••••••')
         .replace(/\/(full|vpn|radius)\/[a-f0-9]{20,}/g, '/$1/••••••••••••');

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 8,
        padding: '14px 16px', fontFamily: '"Fira Code", "JetBrains Mono", Menlo, monospace',
        fontSize: 12, color: '#a3e635', lineHeight: 1.7,
        wordBreak: 'break-all', whiteSpace: 'pre-wrap', marginBottom: 10,
      }}>
        {display}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={copy} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: copied ? 'rgba(37,99,235,0.15)' : '#1a1a1a',
          border: `1px solid ${copied ? '#2563eb' : '#2a2a2a'}`,
          color: copied ? '#2563eb' : '#888', borderRadius: 7,
          padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.15s',
        }}>
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>

        <button onClick={() => setVisible(v => !v)} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#1a1a1a', border: '1px solid #2a2a2a',
          color: '#888', borderRadius: 7,
          padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>
          {visible ? <EyeOff size={12} /> : <Eye size={12} />}
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );
}

// ── Instructions list ─────────────────────────────────────────────────────────
function Instructions() {
  const steps = [
    'Copy the command above',
    "Paste it into your router's terminal",
    'Press Enter',
  ];
  return (
    <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {steps.map((s, i) => (
        <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 12, color: '#888' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#2563eb', width: 18, height: 18, borderRadius: '50%', background: 'rgba(37,99,235,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {i + 1}
          </span>
          {s}
        </li>
      ))}
    </ol>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
interface SectionProps {
  title: string;
  badges: { label: string; bg: string; color: string }[];
  description: string;
  cmd: string;
}

function Section({ title, badges, description, cmd }: SectionProps) {
  return (
    <div style={{
      background: '#111111', border: '1px solid #1f1f1f', borderRadius: 12,
      padding: 24, marginBottom: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{title}</span>
        {badges.map(b => <Badge key={b.label} {...b} />)}
      </div>

      {/* Description */}
      <p style={{ fontSize: 13, color: '#666', margin: '0 0 16px', lineHeight: 1.6 }}>{description}</p>

      {/* Command */}
      <CommandBlock cmd={cmd} />

      {/* Instructions */}
      <Instructions />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function RouterOSSettingsPage() {
  const [creds,   setCreds]   = useState<TenantCredentials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    api.settings.getTenantCredentials()
      .then(setCreds)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const slug       = creds?.slug                          || '[TENANT_SLUG]';
  const bearer     = creds?.latest_router?.bearer_token   || creds?.api_token || '[BEARER_TOKEN]';
  const installTok = creds?.latest_router?.install_token  || '[INSTALL_TOKEN]';
  const hasRouter  = !!creds?.latest_router;
  const base       = `https://${SERVER}/api/v1/router/${slug}/scripts`;

  const sections: SectionProps[] = [
    {
      title: 'RADIUS Service Installation',
      badges: [
        { label: 'Authentication', bg: '#1c1c1c',  color: '#888888' },
        { label: 'Ready',          bg: '#052e16',  color: '#22c55e' },
      ],
      description: 'Deploy only the RADIUS authentication service without bootstrapping the entire router.',
      cmd: `/tool fetch url="${base}/radius/${installTok}" http-header-field="Authorization: Bearer ${bearer}" dst-path="radius-install.rsc" mode=https; :delay 2s; /import file-name="radius-install.rsc"; :delay 1s; /file remove "radius-install.rsc"`,
    },
    {
      title: 'VPN Setup',
      badges: [
        { label: 'VPN',   bg: '#0d1a2e',  color: '#2563eb' },
        { label: 'Ready', bg: '#052e16',  color: '#22c55e' },
      ],
      description: 'Configure WireGuard VPN client connection to iCube servers.',
      cmd: `/tool fetch url="${base}/vpn/${installTok}" http-header-field="Authorization: Bearer ${bearer}" dst-path="vpn.rsc" mode=https; :delay 2s; /import file-name="vpn.rsc"; :delay 1s; /file remove "vpn.rsc"`,
    },
    {
      title: 'Full Router Setup',
      badges: [
        { label: 'Complete',    bg: '#1a0a2e',  color: '#a855f7' },
        { label: 'Recommended', bg: '#0d1a2e',  color: '#2563eb' },
      ],
      description: 'Bootstrap a new router from scratch — installs VPN, RADIUS, hotspot and heartbeat in one command.',
      cmd: `/tool fetch url="${base}/full/${installTok}" http-header-field="Authorization: Bearer ${bearer}" dst-path="icube-setup.rsc" mode=https; :delay 2s; /import file-name="icube-setup.rsc"; :delay 1s; /file remove "icube-setup.rsc"`,
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', padding: '24px 28px' }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>RouterOS Settings</h1>
        <p style={{ fontSize: 13, color: '#555', margin: 0 }}>
          Manage your RouterOS configurations with secure command blocks
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 9, padding: '10px 14px', fontSize: 13, color: '#f87171',
        }}>
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {/* No router notice */}
      {!loading && !hasRouter && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.18)',
          borderRadius: 9, padding: '12px 16px', marginBottom: 20, flexWrap: 'wrap', gap: 10,
        }}>
          <p style={{ fontSize: 13, color: '#60a5fa', margin: 0 }}>
            Add a router first to get your install token — the commands below use placeholders until then.
          </p>
          <a href="/admin/router" style={{
            background: '#2563eb', color: '#fff', borderRadius: 7,
            padding: '6px 14px', fontSize: 12, fontWeight: 600, textDecoration: 'none',
          }}>
            Add Router →
          </a>
        </div>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: '#111111', border: '1px solid #1f1f1f', borderRadius: 12, padding: 24, height: 200 }}>
              <div style={{ height: 14, background: '#1a1a1a', borderRadius: 4, width: '30%', marginBottom: 12 }} />
              <div style={{ height: 11, background: '#1a1a1a', borderRadius: 4, width: '60%', marginBottom: 20 }} />
              <div style={{ height: 60, background: '#0f0f0f', borderRadius: 8, marginBottom: 14 }} />
            </div>
          ))}
        </div>
      ) : (
        sections.map(s => <Section key={s.title} {...s} />)
      )}

      {/* Footer note */}
      <div style={{ marginTop: 8, borderTop: '1px solid #1a1a1a', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 11, color: '#444', margin: 0 }}>
          Commands are unique to your account. Keep your bearer token secret.
        </p>
        <a href="mailto:support@icubeug.net" style={{ fontSize: 11, color: '#2563eb', textDecoration: 'none' }}>
          Need help?
        </a>
      </div>
    </div>
  );
}
