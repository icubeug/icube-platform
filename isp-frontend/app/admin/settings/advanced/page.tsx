'use client';
import { useState } from 'react';
import { Copy, Eye, EyeOff } from 'lucide-react';

const RADIUS_REAL = `/radius add secret=SuperSecretToken2024xyz service=hotspot address=radius.yourplatform.net`;
const RADIUS_MASKED = `/radius add secret=••••••••••••••••••••••• service=hotspot address=radius.yourplatform.net`;

const WINBOX_REAL = `/tool fetch url="https://setup.yourplatform.net/install" mode=https`;
const WINBOX_MASKED = `/tool fetch url="https://setup.yourplatform.net/install" mode=https`;

const INSTRUCTIONS = [
  'Copy the command above using the "Copy" button',
  'Login to your MikroTik router\'s admin panel',
  'Open Terminal (New Terminal)',
  'Paste the command and press Enter',
  'Verify "radius" service appears in IP > RADIUS',
];

function CodeSection({
  title,
  badgeLeft,
  badgeLeftColor,
  badgeRight,
  realCmd,
  maskedCmd,
}: {
  title: string;
  badgeLeft: string;
  badgeLeftColor: string;
  badgeRight: string;
  realCmd: string;
  maskedCmd: string;
}) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  function copyCmd() {
    navigator.clipboard.writeText(realCmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-semibold text-white">{title}</span>
        <span
          style={{
            background: badgeLeftColor === 'green' ? '#1D9E75' : '#2563eb',
            color: '#fff',
            fontSize: 10,
            borderRadius: 9999,
            padding: '2px 8px',
            fontWeight: 600,
          }}
        >
          {badgeLeft}
        </span>
        <span
          style={{
            background: '#1D9E75',
            color: '#fff',
            fontSize: 10,
            borderRadius: 9999,
            padding: '2px 8px',
            fontWeight: 600,
          }}
        >
          {badgeRight}
        </span>
      </div>

      {/* Code block */}
      <div
        style={{
          background: '#111',
          border: '1px solid #1e1e1e',
          borderRadius: 8,
          padding: '12px 16px',
          fontFamily: 'monospace',
          fontSize: 12,
          color: '#1D9E75',
          wordBreak: 'break-all',
          marginBottom: 12,
        }}
      >
        {show ? realCmd : maskedCmd}
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={copyCmd}
          style={{
            background: '#1D9E75',
            color: '#fff',
            borderRadius: 8,
            padding: '7px 14px',
            fontSize: 12,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Copy size={12} />
          {copied ? 'Copied!' : 'Copy Command'}
        </button>
        <button
          onClick={() => setShow((v) => !v)}
          style={{
            background: '#1a1a1a',
            border: '1px solid #2a2a2a',
            color: '#aaa',
            borderRadius: 8,
            padding: '7px 14px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          {show ? <EyeOff size={12} /> : <Eye size={12} />}
          {show ? 'Hide Token' : 'Show Token'}
        </button>
      </div>

      {/* Instructions */}
      <p className="text-sm font-semibold text-white mt-4 mb-3">Installation Instructions</p>
      <ol className="space-y-2">
        {INSTRUCTIONS.map((step, i) => (
          <li key={i} className="flex items-start gap-2 text-xs" style={{ color: '#888' }}>
            <span style={{ color: '#444', flexShrink: 0, minWidth: 14 }}>{i + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function AdvancedPage() {
  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>
      <h1 className="text-xl font-bold text-white mb-6">RouterOS Settings</h1>

      <CodeSection
        title="RADIUS Service Installation"
        badgeLeft="Authentication"
        badgeLeftColor="green"
        badgeRight="Ready"
        realCmd={RADIUS_REAL}
        maskedCmd={RADIUS_MASKED}
      />

      <CodeSection
        title="Remote Winbox Setup"
        badgeLeft="VPN"
        badgeLeftColor="blue"
        badgeRight="Ready"
        realCmd={WINBOX_REAL}
        maskedCmd={WINBOX_MASKED}
      />

      {/* Footer */}
      <div
        className="flex items-center justify-between"
        style={{
          marginTop: 24,
          borderTop: '1px solid #1e1e1e',
          paddingTop: 16,
        }}
      >
        <p className="text-xs" style={{ color: '#555' }}>
          Ensure you know what you&apos;re doing before executing commands.
        </p>
        <p className="text-xs" style={{ color: '#555' }}>
          Need help?{' '}
          <span style={{ color: '#1D9E75', cursor: 'pointer' }}>Contact our support team</span>
        </p>
      </div>
    </div>
  );
}
