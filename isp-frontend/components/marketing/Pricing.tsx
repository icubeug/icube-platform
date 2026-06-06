'use client';
import { useEffect, useRef } from 'react';

const REGISTER_URL = 'https://web.icubeug.net/auth/register';

const FEATURES_LEFT = [
  'Unlimited routers',
  'Unlimited hotspot locations',
  'Unlimited vouchers',
  'Agent POS system',
  'PPPoE billing',
  'AI assistant',
];
const FEATURES_RIGHT = [
  'MTN & Airtel Money',
  'MikroTik CLI wizard',
  'Real-time analytics',
  'Remote router access',
  'Captive portal',
  'Priority support',
];

export default function Pricing() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('visible'); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="pricing" style={{ background: '#080808', padding: '100px 24px', borderTop: '1px solid #111' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
        <div className="section-label">PRICING</div>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, color: '#f0f0f0', letterSpacing: '-1px', marginBottom: 16 }}>
          Free to get started. Always.
        </h2>
        <p style={{ fontSize: 18, color: '#666', maxWidth: 520, margin: '0 auto 64px', lineHeight: 1.6 }}>
          No credit card. No contracts. No hidden fees.<br/>
          Just sign up and start managing your hotspot business today.
        </p>

        {/* Single card */}
        <div
          ref={ref}
          className="reveal"
          style={{
            maxWidth: 600, margin: '0 auto',
            background: '#111', borderRadius: 20,
            border: '1px solid #1e1e1e',
            borderTop: '3px solid #2563eb',
            padding: '48px 40px',
            boxShadow: '0 32px 100px rgba(0,0,0,0.5)',
            transition: 'box-shadow 300ms',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 32px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(37,99,235,0.2), 0 0 60px rgba(37,99,235,0.08)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 32px 100px rgba(0,0,0,0.5)'}
        >
          {/* WiFi icon */}
          <div style={{ width: 56, height: 56, background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.2)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
            <WifiIcon />
          </div>

          <h3 style={{ fontSize: 32, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', marginBottom: 12 }}>
            FREE TO JOIN
          </h3>
          <p style={{ fontSize: 16, color: '#666', marginBottom: 32 }}>
            Everything included. No monthly fees. No setup costs.
          </p>

          <hr style={{ border: 'none', borderTop: '1px solid #1e1e1e', marginBottom: 32 }}/>

          {/* Feature grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, textAlign: 'left', marginBottom: 32 }}>
            {[...FEATURES_LEFT, ...FEATURES_RIGHT].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#ccc' }}>
                <span style={{ color: '#2563eb', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>✓</span>
                {f}
              </div>
            ))}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #1e1e1e', marginBottom: 32 }}/>

          {/* CTA */}
          <a
            href={REGISTER_URL}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '100%', background: '#2563eb', color: '#fff',
              borderRadius: 10, padding: '18px', fontSize: 18, fontWeight: 700,
              textDecoration: 'none', transition: '200ms',
              boxShadow: '0 4px 24px rgba(37,99,235,0.35)',
            }}
            onMouseEnter={e => { const el = e.currentTarget; el.style.background = '#1d4fd8'; el.style.boxShadow = '0 8px 36px rgba(37,99,235,0.5)'; el.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { const el = e.currentTarget; el.style.background = '#2563eb'; el.style.boxShadow = '0 4px 24px rgba(37,99,235,0.35)'; el.style.transform = 'translateY(0)'; }}
          >
            Create your free account →
          </a>

          <p style={{ fontSize: 13, color: '#333', marginTop: 20, lineHeight: 1.6 }}>
            iCube earns a small platform fee on transactions — no upfront costs, ever.
          </p>
        </div>
      </div>
    </section>
  );
}

function WifiIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0"/>
      <path d="M1.42 9a16 16 0 0 1 21.16 0"/>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
      <circle cx="12" cy="20" r="1" fill="#2563eb" stroke="none"/>
    </svg>
  );
}
