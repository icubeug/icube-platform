'use client';
import { useEffect, useRef } from 'react';

const TESTIMONIALS = [
  {
    stars: 5,
    quote: 'Before iCube we were managing vouchers in WhatsApp groups. Now everything is automated. Our agents sold 3,000 vouchers last month without calling us once.',
    name: 'David Ochieng',
    company: 'ConnectUG',
    location: 'Kampala',
    initials: 'DO',
    color: '#2563eb',
  },
  {
    stars: 5,
    quote: 'The MikroTik setup took literally 2 minutes. I pasted the script, refreshed iCube, and my router showed up online. Incredible.',
    name: 'Sarah Nakamya',
    company: 'SwiftNet Uganda',
    location: 'Entebbe',
    initials: 'SN',
    color: '#7c3aed',
  },
  {
    stars: 5,
    quote: 'MTN Mobile Money integration means customers pay themselves. We went from 200 to 800 active users in 3 months.',
    name: 'James Ssekandi',
    company: 'AirConnect',
    location: 'Jinja',
    initials: 'JS',
    color: '#0891b2',
  },
];

export default function Testimonials() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = ref.current?.querySelectorAll<HTMLElement>('.t-card');
    if (!els) return;
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) (e.target as HTMLElement).classList.add('visible'); }),
      { threshold: 0.2 }
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <section id="testimonials" style={{ background: '#050505', padding: '100px 24px', borderTop: '1px solid #111' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div className="section-label">CUSTOMERS</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, color: '#f0f0f0', letterSpacing: '-1px' }}>
            ISP operators love iCube
          </h2>
        </div>

        <div ref={ref} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 24,
          overflowX: 'auto',
        }}>
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.name}
              className="t-card reveal"
              style={{ transitionDelay: `${i * 0.12}s` }}
            >
              <div style={{
                background: '#111', border: '1px solid #1a1a1a',
                borderTop: `3px solid ${t.color}`,
                borderRadius: 16, padding: 32,
                display: 'flex', flexDirection: 'column', gap: 20,
                height: '100%',
                transition: '200ms',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#2a2a2a'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#1a1a1a'}
              >
                {/* Stars */}
                <div style={{ display: 'flex', gap: 3 }}>
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <span key={j} style={{ color: '#f5c518', fontSize: 16 }}>★</span>
                  ))}
                </div>

                {/* Quote */}
                <p style={{ fontSize: 15, color: '#ccc', lineHeight: 1.75, flex: 1 }}>
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Attribution */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: t.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0,
                  }}>
                    {t.initials}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#f0f0f0', margin: 0 }}>{t.name}</p>
                    <p style={{ fontSize: 12, color: '#555', margin: 0 }}>{t.company}, {t.location}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
