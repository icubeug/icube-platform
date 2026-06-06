'use client';
import { useEffect, useRef } from 'react';

const REGISTER_URL = 'https://web.icubeug.net/auth/register';

export default function Hero() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    // stagger children with class .h-anim
    const kids = el.querySelectorAll<HTMLElement>('.h-anim');
    kids.forEach((k, i) => {
      k.style.animationDelay = `${i * 0.12}s`;
      k.style.animationFillMode = 'both';
      k.style.animation = `fadeUp 0.7s ease forwards`;
    });
  }, []);

  return (
    <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050505', overflow: 'hidden', paddingTop: 80 }}>

      {/* Radial glow */}
      <div style={{
        position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
        width: 700, height: 500, borderRadius: '50%',
        background: 'radial-gradient(ellipse at center, rgba(37,99,235,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Grid lines */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(37,99,235,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(37,99,235,0.06) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        animation: 'gridFadeIn 1.5s ease forwards',
      }} />

      {/* Content */}
      <div ref={wrapRef} style={{ position: 'relative', zIndex: 2, maxWidth: 860, padding: '0 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>

        {/* Badge */}
        <div className="h-anim" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13,
          fontWeight: 600, color: '#90b4fe',
          background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.25)',
          borderRadius: 99, padding: '6px 16px', marginBottom: 32,
          animation: 'pulse-border 3s ease infinite',
        }}>
          🇺🇬 Built for African ISPs
        </div>

        {/* Headline */}
        <div className="h-anim" style={{
          fontSize: 'clamp(38px, 6vw, 72px)',
          fontWeight: 800, lineHeight: 1.05, letterSpacing: '-2px',
          color: '#f0f0f0', marginBottom: 28,
        }}>
          <div>Run your entire</div>
          <div>WiFi business</div>
          <div>from one <span style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>place.</span></div>
        </div>

        {/* Subheadline */}
        <p className="h-anim" style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: '#888', lineHeight: 1.7, maxWidth: 600, marginBottom: 44 }}>
          iCube gives hotspot operators, WISPs and ISPs in Uganda the tools to sell vouchers,
          manage MikroTik routers, collect mobile money payments and grow — all in one dashboard.
        </p>

        {/* CTA buttons */}
        <div className="h-anim" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 44 }}>
          <a href={REGISTER_URL} className="btn-primary" style={{ fontSize: 16, padding: '15px 32px' }}>
            Start for free →
          </a>
          <a href="#how-it-works" className="btn-ghost" style={{ fontSize: 16, padding: '15px 28px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <PlayIcon /> Watch demo
          </a>
        </div>

        {/* Social proof */}
        <div className="h-anim" style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#555', fontSize: 13, fontWeight: 500 }}>
          <div style={{ display: 'flex' }}>
            {['DK', 'SN', 'JO', 'AM', 'RP'].map((init, i) => (
              <div key={init} style={{
                width: 28, height: 28, borderRadius: '50%',
                background: `hsl(${220 + i * 18}, 60%, 40%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: '#fff',
                border: '2px solid #050505',
                marginLeft: i > 0 ? -8 : 0, zIndex: 5 - i,
                position: 'relative',
              }}>{init}</div>
            ))}
          </div>
          <span>Trusted by <strong style={{ color: '#999' }}>200+</strong> hotspot operators across Uganda</span>
        </div>
      </div>

      {/* Dashboard mockup */}
      <div style={{ position: 'relative', zIndex: 2, marginTop: 64, width: '100%', maxWidth: 960, padding: '0 24px' }}>

        {/* Floating badges */}
        <div style={{
          position: 'absolute', top: 20, left: '8%', zIndex: 10,
          background: '#0a1a12', border: '1px solid rgba(34,197,94,0.25)',
          borderRadius: 99, padding: '7px 14px', fontSize: 12, fontWeight: 600,
          color: '#22c55e', display: 'flex', alignItems: 'center', gap: 6,
          animation: 'float 4s ease-in-out infinite',
          boxShadow: '0 4px 20px rgba(34,197,94,0.12)',
        }}>
          <span style={{ width: 7, height: 7, background: '#22c55e', borderRadius: '50%', display: 'inline-block' }}/>
          57 active users
        </div>
        <div style={{
          position: 'absolute', top: 20, right: '8%', zIndex: 10,
          background: '#0a1220', border: '1px solid rgba(37,99,235,0.25)',
          borderRadius: 99, padding: '7px 14px', fontSize: 12, fontWeight: 600,
          color: '#90b4fe', display: 'flex', alignItems: 'center', gap: 6,
          animation: 'float 4s ease-in-out infinite 0.8s',
          boxShadow: '0 4px 20px rgba(37,99,235,0.1)',
        }}>
          <TrendIcon /> +UGX 847,000 today
        </div>
        <div style={{
          position: 'absolute', bottom: 20, right: '8%', zIndex: 10,
          background: '#0a1a12', border: '1px solid rgba(34,197,94,0.25)',
          borderRadius: 99, padding: '7px 14px', fontSize: 12, fontWeight: 600,
          color: '#22c55e', display: 'flex', alignItems: 'center', gap: 6,
          animation: 'float 4s ease-in-out infinite 1.6s',
          boxShadow: '0 4px 20px rgba(34,197,94,0.12)',
        }}>
          ✓ All routers online
        </div>

        {/* Browser frame */}
        <div style={{
          background: '#0a0a0a', border: '1px solid #1e1e1e',
          borderRadius: 16, overflow: 'hidden',
          boxShadow: '0 40px 120px rgba(0,0,0,0.8), 0 0 0 1px rgba(37,99,235,0.1), 0 8px 80px rgba(37,99,235,0.06)',
        }}>
          {/* Browser chrome */}
          <div style={{ background: '#111', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #1e1e1e' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['#ff5f56','#ffbd2e','#27c93f'].map(c => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }}/>
              ))}
            </div>
            <div style={{ flex: 1, background: '#0e0e0e', borderRadius: 6, padding: '4px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <LockIcon />
              <span style={{ fontSize: 11, color: '#444' }}>web.icubeug.net/admin</span>
            </div>
          </div>

          {/* Dashboard UI */}
          <DashboardMockup />
        </div>

        {/* Glow under frame */}
        <div style={{
          position: 'absolute', bottom: -60, left: '10%', right: '10%', height: 120,
          background: 'radial-gradient(ellipse at center, rgba(37,99,235,0.18) 0%, transparent 70%)',
          filter: 'blur(20px)', pointerEvents: 'none',
        }}/>
      </div>
    </section>
  );
}

function DashboardMockup() {
  const stats = [
    { label: 'Revenue Today', value: 'UGX 847K', icon: '💰', up: true  },
    { label: 'Active Users',  value: '57',        icon: '👥', up: true  },
    { label: 'Vouchers Sold', value: '124',        icon: '🎫', up: true  },
    { label: 'Routers Online', value: '8/8',       icon: '📡', up: true  },
  ];
  const bars = [65, 42, 80, 55, 90, 72, 85];
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div style={{ display: 'flex', height: 380, background: '#080808' }}>
      {/* Sidebar */}
      <div style={{ width: 180, background: '#0d0d0d', borderRight: '1px solid #181818', padding: '16px 8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', marginBottom: 12 }}>
          <div style={{ width: 22, height: 22, background: '#2563eb', borderRadius: 6, flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>iCube</span>
        </div>
        {['Dashboard','Vouchers','Routers','Payments','Agents','Settings'].map((item, i) => (
          <div key={item} style={{
            padding: '7px 12px', borderRadius: 6, fontSize: 11, fontWeight: 500, marginBottom: 1,
            color: i === 0 ? '#90b4fe' : '#444',
            background: i === 0 ? 'rgba(37,99,235,0.12)' : 'transparent',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{ width: 12, height: 12, background: i === 0 ? '#2563eb' : '#222', borderRadius: 3, flexShrink: 0 }} />
            {item}
          </div>
        ))}
      </div>

      {/* Main area */}
      <div style={{ flex: 1, padding: '16px', overflow: 'hidden' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f0', marginBottom: 16 }}>Dashboard</p>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          {stats.map(s => (
            <div key={s.label} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, padding: 10 }}>
              <p style={{ fontSize: 9, color: '#555', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{s.value}</p>
              <p style={{ fontSize: 9, color: '#22c55e', marginTop: 4 }}>↑ +12%</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 8, padding: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 12 }}>Revenue — This Week</p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 90 }}>
            {bars.map((h, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: '100%', height: `${h}%`, borderRadius: '3px 3px 0 0',
                  background: i === 6 ? '#2563eb' : '#1a2a4a',
                  transition: '200ms',
                }}/>
                <span style={{ fontSize: 9, color: '#444' }}>{days[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
      <polygon points="6.5,5 11.5,8 6.5,11" fill="currentColor"/>
    </svg>
  );
}
function TrendIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#90b4fe" strokeWidth="1.5" strokeLinecap="round">
      <polyline points="1,9 4,5 7,7 11,2"/>
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 14" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="6" width="8" height="7" rx="1.5"/>
      <path d="M4 6V4a2 2 0 014 0v2"/>
    </svg>
  );
}
