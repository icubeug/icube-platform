'use client';
import { useEffect, useRef } from 'react';

const STEPS = [
  {
    num: '1',
    title: 'Create your account',
    desc: 'Sign up free in 30 seconds. No credit card. No contracts. Your account is ready immediately.',
  },
  {
    num: '2',
    title: 'Connect your MikroTik',
    desc: 'Copy one CLI script from iCube and paste it into your router terminal. RADIUS, VPN and hotspot configure automatically.',
  },
  {
    num: '3',
    title: 'Start selling',
    desc: 'Customers connect to your WiFi, open a browser, and see your branded payment page. They pay via MTN or Airtel — you get the money.',
  },
];

export default function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = ref.current?.querySelectorAll<HTMLElement>('.hiw-step');
    if (!els) return;
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) (e.target as HTMLElement).classList.add('visible'); }),
      { threshold: 0.2 }
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <section id="how-it-works" style={{ background: '#080808', borderTop: '1px solid #111', borderBottom: '1px solid #111' }}>
      <div className="section-wrap" style={{ textAlign: 'center' }}>
        <div className="section-label">HOW IT WORKS</div>
        <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, color: '#f0f0f0', letterSpacing: '-1px', marginBottom: 16 }}>
          From signup to selling in under an hour.
        </h2>
        <p style={{ fontSize: 18, color: '#555', maxWidth: 480, margin: '0 auto 72px' }}>
          Three simple steps. No DevOps required.
        </p>

        {/* Steps container */}
        <div ref={ref} style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 0 }}>
          {/* Dashed connecting line (desktop only) */}
          <div className="hide-mobile" style={{
            position: 'absolute', top: 38, left: 'calc(16.666% + 20px)', right: 'calc(16.666% + 20px)',
            height: 1,
            backgroundImage: 'repeating-linear-gradient(90deg, #2563eb 0, #2563eb 6px, transparent 6px, transparent 14px)',
            zIndex: 0,
          }}/>

          {STEPS.map((step, i) => (
            <div key={step.num} className="hiw-step reveal" style={{ transitionDelay: `${i * 0.15}s`, position: 'relative', zIndex: 1, padding: '0 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
              {/* Step circle */}
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: '#050505', border: '2px solid #2563eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 28px rgba(37,99,235,0.3)',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: '#2563eb' }}>{step.num}</span>
              </div>

              <div style={{ maxWidth: 280 }}>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: '#f0f0f0', marginBottom: 12, letterSpacing: '-0.3px' }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: 15, color: '#666', lineHeight: 1.7 }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
