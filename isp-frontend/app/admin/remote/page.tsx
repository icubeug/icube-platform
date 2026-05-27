'use client';
import { useState } from 'react';
import { Router, AlertTriangle, X, CheckCircle, Copy, Eye, EyeOff, ChevronDown } from 'lucide-react';

type Tab = 'status' | 'install' | 'connect';

function GreenBadge({ label }: { label: string }) {
  return (
    <span style={{
      background: '#0d2e1e', border: '1px solid #1a4a30', color: '#1D9E75',
      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
    }}>{label}</span>
  );
}

function RedBadge({ label }: { label: string }) {
  return (
    <span style={{
      background: '#2a1515', border: '1px solid #4a2020', color: '#f87171',
      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
    }}>{label}</span>
  );
}

export default function RemoteAccessPage() {
  const [activeTab, setActiveTab] = useState<Tab>('status');
  const [connected, setConnected] = useState(true);
  const [portOpen, setPortOpen] = useState(true);
  const [tokenVisible, setTokenVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [troubleshootOpen, setTroubleshootOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);

  const installCmd = tokenVisible
    ? `/fetch url="https://setup.yourplatform.net/agent?token=eyJhbGciOiJIUzI1NiJ9.abc123" mode=https`
    : `/fetch url="https://setup.yourplatform.net/agent" mode=https`;

  const remoteAddr = `vpn1.yourplatform.net:54321`;

  async function copyText(text: string, setCb: (v: boolean) => void) {
    await navigator.clipboard.writeText(text);
    setCb(true);
    setTimeout(() => setCb(false), 1500);
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'status', label: 'Status' },
    { key: 'install', label: 'Install' },
    { key: 'connect', label: 'Connect' },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>

      {/* Page Header */}
      <div className="flex items-center gap-3 mb-5">
        <Router size={20} color="#1D9E75" />
        <span className="text-xl font-bold text-white">Remote Winbox Access</span>
        <span style={{ fontSize: 11, color: '#555' }}>Main Router</span>
        <div style={{ flex: 1 }} />
        <select style={{
          background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#aaa',
          borderRadius: 8, fontSize: 12, padding: '6px 12px', outline: 'none',
        }}>
          <option>Main Router</option>
          <option>Branch Router</option>
        </select>
        <button
          onClick={() => setConnected(v => !v)}
          style={{
            background: connected ? '#2a1515' : '#0d2e1e',
            border: `1px solid ${connected ? '#4a2020' : '#1a4a30'}`,
            color: connected ? '#f87171' : '#1D9E75',
            borderRadius: 8, fontSize: 12, padding: '6px 14px', cursor: 'pointer',
          }}>
          {connected ? 'Disconnect' : 'Connect'}
        </button>
      </div>

      {/* Security Banner */}
      {!dismissed && (
        <div style={{
          background: '#1a1200', border: '1px solid #3a3000', borderRadius: 10,
          padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10,
          marginBottom: 16, position: 'relative',
        }}>
          <AlertTriangle size={14} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12, color: '#aaa', lineHeight: 1.5 }}>
            Always close your ports if you are not using them to avoid malicious attacks on your network infrastructure.
          </span>
          <button
            onClick={() => setDismissed(true)}
            style={{
              position: 'absolute', top: 10, right: 12,
              background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: 2,
            }}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #222', marginBottom: 20 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              fontSize: 12, fontWeight: 500, padding: '8px 16px', background: 'none',
              border: 'none', borderBottom: `2px solid ${activeTab === t.key ? '#1D9E75' : 'transparent'}`,
              color: activeTab === t.key ? '#fff' : '#666',
              cursor: 'pointer', transition: 'all 150ms',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── STATUS TAB ── */}
      {activeTab === 'status' && (
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm font-semibold text-white">Connection Status</span>
            {connected ? <GreenBadge label="Connected" /> : <RedBadge label="Disconnected" />}
          </div>

          {/* Port card */}
          <div style={{
            background: '#111', border: '1px solid #1e1e1e', borderRadius: 10, padding: 20, marginTop: 16,
          }}>
            <div className="flex items-center gap-2">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: portOpen ? '#1D9E75' : '#f87171', flexShrink: 0 }} />
              <span className="text-sm font-semibold text-white">
                {portOpen ? 'Port 54321 Open' : 'Port 54321 Closed'}
              </span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color: '#1D9E75' }}>
                {portOpen ? 'Remote access enabled' : 'Remote access disabled'}
              </span>
            </div>
            <div style={{ borderTop: '1px solid #1e1e1e', margin: '12px 0' }} />
            <div className="flex justify-end">
              <button
                onClick={() => setPortOpen(v => !v)}
                style={{
                  background: portOpen ? '#2a1515' : '#0d2e1e',
                  border: `1px solid ${portOpen ? '#4a2020' : '#1a4a30'}`,
                  color: portOpen ? '#f87171' : '#1D9E75',
                  borderRadius: 8, fontSize: 12, padding: '6px 12px', cursor: 'pointer',
                }}>
                {portOpen ? 'Close Port' : 'Open Port'}
              </button>
            </div>
          </div>

          {/* Stat rows */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: 12 }}>
              <div className="text-xl font-bold text-white">29s</div>
              <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>Uptime</div>
            </div>
            <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1D9E75' }}>in less than a minute</div>
              <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>Last Connected</div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button style={{
              background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#aaa',
              borderRadius: 8, fontSize: 12, padding: '6px 14px', cursor: 'pointer',
            }}>Refresh Status</button>
            <button style={{
              background: 'rgba(29,158,117,0.15)', border: '1px solid rgba(29,158,117,0.3)', color: '#1D9E75',
              borderRadius: 8, fontSize: 12, padding: '6px 14px', cursor: 'pointer',
            }}>Test Connection</button>
          </div>
          <div style={{ fontSize: 10, color: '#444', marginTop: 8 }}>Last updated: in less than a minute</div>
        </div>
      )}

      {/* ── INSTALL TAB ── */}
      {activeTab === 'install' && (
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm font-semibold text-white">Setup Status</span>
            <GreenBadge label="Connected" />
          </div>

          {/* Info box */}
          <div style={{
            background: '#0d1f16', border: '1px solid #1a4a30', borderRadius: 8,
            padding: 14, marginTop: 16, display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <CheckCircle size={14} color="#1D9E75" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 12, color: '#aaa', lineHeight: 1.6 }}>
              Remote access is configured and ready to use. You can still run the installation script to update your configuration.
            </span>
          </div>

          {/* Automatic Installation */}
          <div style={{ marginTop: 20 }}>
            <div className="text-sm font-semibold text-white mb-1">Automatic Installation</div>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              Run this command in your MikroTik router terminal to install or update the remote access agent.
            </div>
            <div style={{
              background: '#111', border: '1px solid #1e1e1e', borderRadius: 8,
              padding: '12px 16px', fontFamily: 'monospace', fontSize: 12,
              color: '#1D9E75', position: 'relative', wordBreak: 'break-all',
            }}>
              {installCmd}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={() => copyText(installCmd, setCopied)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#aaa',
                  borderRadius: 8, fontSize: 12, padding: '6px 12px', cursor: 'pointer',
                }}>
                <Copy size={12} /> {copied ? 'Copied!' : 'Copy Command'}
              </button>
              <button
                onClick={() => setTokenVisible(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#aaa',
                  borderRadius: 8, fontSize: 12, padding: '6px 12px', cursor: 'pointer',
                }}>
                {tokenVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                {tokenVisible ? 'Hide Token' : 'Show Token'}
              </button>
            </div>
          </div>

          {/* Installation Instructions */}
          <div style={{ marginTop: 20 }}>
            <div className="text-sm font-semibold text-white mb-3">Installation Instructions</div>
            <ol style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                'Login to MikroTik Router admin panel',
                'Open Terminal (New Terminal window)',
                'Paste the copied command and press Enter',
                'Wait for installation to complete (about 30 seconds)',
                'Verify with /system resource print — remote agent service should appear',
              ].map((step, i) => (
                <li key={i} style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* ── CONNECT TAB ── */}
      {activeTab === 'connect' && (
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm font-semibold text-white">Remote Access Address</span>
            <GreenBadge label="Active" />
          </div>

          {/* Address code block */}
          <div style={{
            background: '#111', border: '1px solid #1e1e1e', borderRadius: 8,
            padding: '12px 16px', fontFamily: 'monospace', fontSize: 13,
            color: '#1D9E75', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginTop: 16,
          }}>
            <span>{remoteAddr}</span>
            <button
              onClick={() => copyText(remoteAddr, setCopiedAddr)}
              style={{
                background: 'none', border: 'none', color: copiedAddr ? '#1D9E75' : '#555',
                cursor: 'pointer', padding: 4,
              }}>
              <Copy size={13} />
            </button>
          </div>

          {/* Winbox Desktop */}
          <div style={{ marginTop: 20 }}>
            <div className="text-sm font-semibold text-white mb-3">Winbox Desktop Connection</div>
            <ol style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>
                Open Winbox Application (
                <a href="https://mikrotik.com/software" target="_blank" rel="noreferrer"
                  style={{ color: '#60a5fa', textDecoration: 'none' }}>Download Winbox</a>
                )
              </li>
              <li style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>
                Enter the address <span style={{ fontFamily: 'monospace', color: '#aaa' }}>{remoteAddr}</span> in the Connect To field
              </li>
              <li style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>
                Click Connect and enter your router credentials
              </li>
            </ol>
          </div>

          {/* Mobile App */}
          <div style={{ marginTop: 20 }}>
            <div className="text-sm font-semibold text-white mb-3">Mobile App Connection</div>
            <ol style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>
                Download MikroTik Pro App —{' '}
                <a href="https://apps.apple.com" target="_blank" rel="noreferrer"
                  style={{ color: '#60a5fa', textDecoration: 'none' }}>App Store</a>
                {' '}+{' '}
                <a href="https://play.google.com" target="_blank" rel="noreferrer"
                  style={{ color: '#60a5fa', textDecoration: 'none' }}>Play Store</a>
              </li>
              <li style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>Tap "+" to add new connection</li>
              <li style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>
                Enter remote address: <span style={{ fontFamily: 'monospace', color: '#aaa' }}>{remoteAddr}</span>
              </li>
              <li style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>
                Set target address to your router's LAN IP (e.g. 192.168.1.1)
              </li>
            </ol>
          </div>

          {/* Connection Details */}
          <div style={{ marginTop: 20 }}>
            <div className="text-sm font-semibold text-white mb-3">Connection Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Server', value: 'vpn1.yourplatform.net' },
                { label: 'Port', value: '54321' },
                { label: 'Target Port', value: '8291' },
                { label: 'Remote IP', value: 'Dynamic' },
              ].map(d => (
                <div key={d.label} style={{
                  background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: 12,
                }}>
                  <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                    {d.label}
                  </div>
                  <div style={{ fontSize: 13, fontFamily: 'monospace', color: '#aaa' }}>{d.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Troubleshooting */}
          <div style={{ marginTop: 20 }}>
            <button
              onClick={() => setTroubleshootOpen(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'none', border: 'none', color: '#aaa',
                fontSize: 12, fontWeight: 500, cursor: 'pointer', padding: 0,
              }}>
              If you can't connect:
              <ChevronDown size={14} style={{
                transform: troubleshootOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                transition: 'transform 180ms',
              }} />
            </button>

            {troubleshootOpen && (
              <div style={{
                background: '#111', border: '1px solid #1e1e1e', borderRadius: 8,
                padding: 12, marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                {[
                  'Ensure Close Port was not clicked',
                  'Check that your MikroTik router has internet access',
                  'Verify the installation script ran successfully',
                  'Contact support if issue persists',
                ].map((tip, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#888' }}>• {tip}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
