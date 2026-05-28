'use client';
import { Terminal, ArrowRight } from 'lucide-react';

export default function AdvancedPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', padding: '24px 28px' }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Advanced</h1>
      <p style={{ fontSize: 13, color: '#555', margin: '0 0 28px' }}>Advanced configuration options</p>

      <div style={{
        background: '#111111', border: '1px solid #1f1f1f', borderRadius: 12, padding: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: 'rgba(37,99,235,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Terminal size={18} color="#2563eb" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: '0 0 6px' }}>
              Router Setup Commands
            </p>
            <p style={{ fontSize: 13, color: '#666', margin: '0 0 16px', lineHeight: 1.6 }}>
              RADIUS installation, WireGuard VPN setup and full router bootstrap commands
              are available in <strong style={{ color: '#aaa' }}>Settings → Routers</strong>.
            </p>
            <a href="/admin/settings/routers" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#2563eb', color: '#fff', borderRadius: 8,
              padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
            }}>
              Go to RouterOS Settings <ArrowRight size={13} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
