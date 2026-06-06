'use client';
import { useEffect, useRef } from 'react';

const REGISTER_URL = 'https://web.icubeug.net/auth/register';

export default function CTABanner() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('visible'); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section style={{ position: 'relative', overflow: 'hidden', padding: '100px 24px', background: '#050505', borderTop: '1px solid #111' }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 800, height: 400, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(37,99,235,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}/>

      <div ref={ref} className="reveal" style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 800, color: '#f0f0f0', letterSpacing: '-1.5px', marginBottom: 20, lineHeight: 1.1 }}>
          Ready to modernize<br/>your ISP?
        </h2>
        <p style={{ fontSize: 18, color: '#555', lineHeight: 1.7, marginBottom: 48, maxWidth: 480, margin: '0 auto 48px' }}>
          Join 200+ operators already using iCube to run faster, smarter WiFi businesses.
        </p>

        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
          <a
            href={REGISTER_URL}
            style={{
              padding: '16px 36px', fontSize: 16, fontWeight: 700,
              background: '#fff', color: '#050505',
              borderRadius: 99, textDecoration: 'none',
              boxShadow: '0 4px 24px rgba(255,255,255,0.1)',
              transition: '200ms', display: 'inline-flex', alignItems: 'center', gap: 8,
            }}
            onMouseEnter={e => { const el = e.currentTarget; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 8px 36px rgba(255,255,255,0.15)'; }}
            onMouseLeave={e => { const el = e.currentTarget; el.style.transform = 'translateY(0)'; el.style.boxShadow = '0 4px 24px rgba(255,255,255,0.1)'; }}
          >
            Start for free →
          </a>
          <a
            href="mailto:hello@icubeug.net"
            style={{
              padding: '16px 32px', fontSize: 16, fontWeight: 600,
              color: '#90b4fe', border: '1px solid rgba(37,99,235,0.35)',
              borderRadius: 99, textDecoration: 'none', background: 'transparent',
              transition: '200ms',
            }}
            onMouseEnter={e => { const el = e.currentTarget; el.style.background = 'rgba(37,99,235,0.08)'; el.style.borderColor = 'rgba(37,99,235,0.6)'; }}
            onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'transparent'; el.style.borderColor = 'rgba(37,99,235,0.35)'; }}
          >
            Talk to us
          </a>
        </div>

        <p style={{ fontSize: 13, color: '#333' }}>
          No credit card required · Setup in under an hour · Free forever
        </p>
      </div>
    </section>
  );
}
