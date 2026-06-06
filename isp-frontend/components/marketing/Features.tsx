'use client';
import { useEffect, useRef } from 'react';

const FEATURES = [
  {
    icon: <TicketIcon />,
    headline: 'Sell vouchers that actually work',
    body: 'Generate bulk vouchers, set time and data limits, track usage in real time. Customers connect with a code — you get paid instantly via mobile money.',
    bullets: ['Bulk voucher generation', 'QR code printing', 'Auto-expire and recycle', 'Per-site package customization'],
    visual: <VoucherMockup />,
  },
  {
    icon: <RouterIcon />,
    headline: 'MikroTik configured in 60 seconds',
    body: 'Paste one script into your router terminal. iCube handles RADIUS authentication, bandwidth limits, session tracking and remote access automatically.',
    bullets: ['Auto-generates RouterOS CLI scripts', 'RADIUS authentication built in', 'Remote router terminal via VPN', 'Supports hAP, L009, CCR and more'],
    visual: <TerminalMockup />,
  },
  {
    icon: <MobileMoneyIcon />,
    headline: 'MTN & Airtel Money, built in',
    body: 'Customers pay directly from their phones. Vouchers activate automatically the moment payment clears. No manual work. No delays.',
    bullets: ['MTN Mobile Money Uganda', 'Airtel Money Uganda', 'Auto-voucher on payment', 'SMS receipt to customer'],
    visual: <PaymentMockup />,
  },
  {
    icon: <AgentIcon />,
    headline: 'Empower your ground agents',
    body: 'Agents log in from any phone browser, select a package, enter the customer\'s number and sell. Commission is tracked automatically.',
    bullets: ['Phone+PIN agent login', 'Instant voucher delivery via SMS', 'Commission wallet and withdrawal', 'Per-agent sales reports'],
    visual: <AgentMockup />,
  },
  {
    icon: <HomeIcon />,
    headline: 'Manage home broadband subscribers',
    body: 'Add PPPoE subscribers, assign plans, auto-bill via mobile money monthly. Automatic suspension on non-payment.',
    bullets: ['Monthly auto-billing', 'MTN/Airtel collection', 'Grace period management', 'RADIUS session control'],
    visual: <SubscriberMockup />,
  },
  {
    icon: <AIIcon />,
    headline: 'Ask your network anything',
    body: 'The iCube AI assistant knows your entire network. Ask it about revenue, router health, overloaded sites or generate reports — in plain English.',
    bullets: ['Real-time network awareness', 'Revenue and usage reports', 'Troubleshooting suggestions', 'Anomaly detection'],
    visual: <ChatMockup />,
  },
];

export default function Features() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = sectionRef.current?.querySelectorAll<HTMLElement>('.feat-reveal');
    if (!els) return;
    const obs = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) { (e.target as HTMLElement).classList.add('visible'); } });
      },
      { threshold: 0.1 }
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <section id="features" style={{ background: '#050505', padding: '100px 0' }} ref={sectionRef}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 80 }}>
          <div className="section-label">FEATURES</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, color: '#f0f0f0', letterSpacing: '-1px', marginBottom: 16 }}>
            Everything your ISP needs,{' '}
            <span style={{ color: '#444' }}>nothing it doesn&apos;t.</span>
          </h2>
          <p style={{ fontSize: 18, color: '#666', maxWidth: 520, margin: '0 auto' }}>
            Purpose-built for MikroTik operators and mobile money markets.
          </p>
        </div>

        {/* Feature rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 100 }}>
          {FEATURES.map((f, i) => (
            <FeatureRow key={f.headline} feature={f} reverse={i % 2 === 1} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureRow({ feature, reverse, index }: { feature: typeof FEATURES[0]; reverse: boolean; index: number }) {
  return (
    <div className="feat-reveal reveal" style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: 60,
      alignItems: 'center',
      direction: reverse ? 'rtl' : 'ltr',
    }}>
      {/* Visual side */}
      <div style={{ direction: 'ltr' }}>
        <div style={{
          background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 16,
          overflow: 'hidden', position: 'relative',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}>
          {feature.visual}
        </div>
      </div>

      {/* Text side */}
      <div style={{ direction: 'ltr' }}>
        <div style={{
          width: 40, height: 40, background: 'rgba(37,99,235,0.12)',
          border: '1px solid rgba(37,99,235,0.2)', borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
        }}>
          {feature.icon}
        </div>
        <h3 style={{ fontSize: 'clamp(20px, 2.5vw, 28px)', fontWeight: 800, color: '#f0f0f0', letterSpacing: '-0.5px', marginBottom: 16, lineHeight: 1.2 }}>
          {feature.headline}
        </h3>
        <p style={{ fontSize: 16, color: '#666', lineHeight: 1.75, marginBottom: 24 }}>
          {feature.body}
        </p>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {feature.bullets.map(b => (
            <li key={b} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#aaa', fontWeight: 500 }}>
              <span style={{ color: '#2563eb', fontSize: 16, flexShrink: 0 }}>✓</span>
              {b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ── Visual mockups ─────────────────────────────────────────────────────── */

function VoucherMockup() {
  const rows = [
    { code: 'ICB-4F7K-2X9A', time: '1 Hour',  price: '1,000',  active: true  },
    { code: 'ICB-8G3L-5M2N', time: '3 Hours', price: '2,500',  active: true  },
    { code: 'ICB-1Q9R-7P4V', time: '1 Day',   price: '5,000',  active: false },
    { code: 'ICB-6H2T-3K8W', time: '1 Week',  price: '15,000', active: true  },
    { code: 'ICB-2D5Y-9E6C', time: '1 Month', price: '50,000', active: false },
  ];
  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#f0f0f0' }}>Voucher Inventory</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: '#2563eb', borderRadius: 6, padding: '3px 8px' }}>+ Generate</span>
      </div>
      {rows.map(r => (
        <div key={r.code} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1a1a1a', fontSize: 11 }}>
          <span style={{ color: '#90b4fe', fontFamily: 'monospace', fontSize: 10 }}>{r.code}</span>
          <span style={{ color: '#666' }}>{r.time}</span>
          <span style={{ color: '#888' }}>UGX {r.price}</span>
          <span style={{ color: r.active ? '#22c55e' : '#444', fontSize: 9, fontWeight: 700 }}>{r.active ? '● USED' : '○ FREE'}</span>
        </div>
      ))}
    </div>
  );
}

function TerminalMockup() {
  const lines = [
    { color: '#22c55e', text: '# iCube MikroTik Setup Script' },
    { color: '#888',    text: '/ip hotspot profile add' },
    { color: '#90b4fe', text: '  name=iCube-Profile' },
    { color: '#90b4fe', text: '  use-radius=yes' },
    { color: '#90b4fe', text: '  radius-interim-update=1m' },
    { color: '#888',    text: '/radius add service=hotspot' },
    { color: '#90b4fe', text: '  address=vpn.icubeug.net' },
    { color: '#90b4fe', text: '  secret=••••••••••••' },
    { color: '#22c55e', text: '# Done! Router online in iCube ✓' },
  ];
  return (
    <div style={{ background: '#0a0a0a', padding: 20, fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {['#ff5f56','#ffbd2e','#27c93f'].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }}/>)}
      </div>
      {lines.map((l, i) => (
        <div key={i} style={{ fontSize: 11, color: l.color, lineHeight: 1.9 }}>{l.text}</div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, color: '#2563eb', fontSize: 11 }}>
        <span>█</span>
      </div>
    </div>
  );
}

function PaymentMockup() {
  return (
    <div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: 220, background: '#141414', borderRadius: 20, overflow: 'hidden', border: '1px solid #222' }}>
        {/* Phone notch */}
        <div style={{ background: '#111', height: 28, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ width: 60, height: 6, background: '#1e1e1e', borderRadius: 3 }}/>
        </div>
        {/* Screen */}
        <div style={{ padding: 16 }}>
          <p style={{ fontSize: 10, color: '#555', textAlign: 'center', marginBottom: 12 }}>Pay for WiFi</p>
          <div style={{ background: '#111', borderRadius: 10, padding: 12, marginBottom: 10, textAlign: 'center' }}>
            <p style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>3 Hours — KibaraNet</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>UGX 2,500</p>
          </div>
          {[{ label: 'MTN Mobile Money', color: '#f5c518' }, { label: 'Airtel Money', color: '#e62e2d' }].map(p => (
            <button key={p.label} style={{
              width: '100%', background: '#111', border: `1px solid ${p.color}30`,
              borderRadius: 8, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8,
              color: '#ccc', fontSize: 11, fontWeight: 600, cursor: 'pointer', marginBottom: 8,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }}/>
              {p.label}
            </button>
          ))}
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <span style={{ fontSize: 9, color: '#333' }}>Powered by iCube</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentMockup() {
  const packages = ['1 Hour — 1,000', '3 Hours — 2,500', '1 Day — 5,000', '1 Week — 15,000'];
  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#f0f0f0' }}>Agent POS</p>
          <p style={{ fontSize: 10, color: '#444' }}>Balance: UGX 45,000</p>
        </div>
        <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, padding: '3px 8px', fontSize: 10, color: '#22c55e', fontWeight: 600 }}>Online</div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 10, color: '#555', marginBottom: 6 }}>Select package:</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {packages.map((p, i) => (
            <div key={p} style={{
              background: i === 2 ? '#1e3a5f' : '#111', border: `1px solid ${i === 2 ? '#2563eb' : '#1e1e1e'}`,
              borderRadius: 6, padding: '8px', fontSize: 10, color: i === 2 ? '#90b4fe' : '#888', cursor: 'pointer',
            }}>{p}</div>
          ))}
        </div>
      </div>
      <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 6, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 10, color: '#444' }}>07</span>
        <span style={{ fontSize: 10, color: '#666' }}>00 123 456</span>
      </div>
      <div style={{ background: '#2563eb', borderRadius: 6, padding: '10px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
        Sell Voucher →
      </div>
    </div>
  );
}

function SubscriberMockup() {
  const subs = [
    { name: 'Nakato Sarah', plan: '10 Mbps', status: 'Active',  paid: true  },
    { name: 'Ochieng David', plan: '20 Mbps', status: 'Active',  paid: true  },
    { name: 'Ssekandi James', plan: '5 Mbps',  status: 'Overdue', paid: false },
    { name: 'Kamya Grace',  plan: '10 Mbps', status: 'Active',  paid: true  },
  ];
  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#f0f0f0' }}>PPPoE Subscribers</span>
        <span style={{ fontSize: 10, color: '#888' }}>4 active</span>
      </div>
      {subs.map(s => (
        <div key={s.name} style={{ display: 'flex', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #141414', gap: 10 }}>
          <div style={{ width: 26, height: 26, background: '#1e1e1e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#555', flexShrink: 0 }}>
            {s.name.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#ccc' }}>{s.name}</p>
            <p style={{ fontSize: 10, color: '#555' }}>{s.plan}</p>
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, color: s.paid ? '#22c55e' : '#f87171', background: s.paid ? 'rgba(34,197,94,0.08)' : 'rgba(248,113,113,0.08)', borderRadius: 4, padding: '2px 6px' }}>
            {s.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function ChatMockup() {
  const msgs = [
    { role: 'user', text: 'Which site is overloaded?' },
    { role: 'ai',   text: 'Kireka site is at 98% capacity with 67 active users. Bandwidth utilization is 94.2 Mbps / 100 Mbps. I recommend adding an AP or increasing bandwidth.' },
    { role: 'user', text: 'Revenue this week?' },
    { role: 'ai',   text: 'This week: UGX 3,847,000 across 1,240 voucher sales. Up 23% vs last week. Best day: Saturday (847K).' },
  ];
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg, #2563eb, #7c3aed)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✦</div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#f0f0f0' }}>iCube AI Assistant</span>
        <div style={{ marginLeft: 'auto', width: 6, height: 6, background: '#22c55e', borderRadius: '50%' }}/>
      </div>
      {msgs.map((m, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
          <div style={{
            maxWidth: '85%', padding: '8px 12px', borderRadius: 10,
            background: m.role === 'user' ? '#1e3a5f' : '#141414',
            border: `1px solid ${m.role === 'user' ? '#2563eb30' : '#1e1e1e'}`,
            fontSize: 11, color: m.role === 'user' ? '#90b4fe' : '#aaa', lineHeight: 1.5,
          }}>
            {m.text}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Icons ──────────────────────────────────────────────────────────────── */
function TicketIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 010 6v2a2 2 0 002 2h16a2 2 0 002-2v-2a3 3 0 010-6V7a2 2 0 00-2-2H4a2 2 0 00-2 2z"/><line x1="12" y1="7" x2="12" y2="17"/></svg>;
}
function RouterIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="14" width="20" height="6" rx="2"/><path d="M6 14V9"/><path d="M12 14V9"/><path d="M18 14V9"/><path d="M2 9h20"/></svg>;
}
function MobileMoneyIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>;
}
function AgentIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
function HomeIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function AIIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
}
