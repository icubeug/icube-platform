'use client';
import { useEffect, useRef } from 'react';

const COMPANIES = ['KibaraNet', 'ConnectUG', 'SwiftNet Uganda', 'FiberLink', 'AirConnect', 'NetWave'];

export default function TrustBar() {
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
    <section style={{ background: '#080808', borderTop: '1px solid #141414', borderBottom: '1px solid #141414', padding: '40px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: '#333', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 28 }}>
          Powering ISPs across East Africa
        </p>
        <div ref={ref} className="reveal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, flexWrap: 'wrap' }}>
          {COMPANIES.map((name, i) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center' }}>
              <span
                style={{ fontSize: 15, fontWeight: 700, color: '#2a2a2a', padding: '6px 20px', transition: '200ms', cursor: 'default', letterSpacing: '-0.2px' }}
                onMouseEnter={e => (e.target as HTMLElement).style.color = '#555'}
                onMouseLeave={e => (e.target as HTMLElement).style.color = '#2a2a2a'}
              >
                {name}
              </span>
              {i < COMPANIES.length - 1 && (
                <span style={{ color: '#222', fontSize: 18, userSelect: 'none' }}>·</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
