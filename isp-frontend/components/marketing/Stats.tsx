'use client';
import { useEffect, useRef, useState } from 'react';

const STATS = [
  { value: 500,  suffix: '+',  unit: '',    label: 'Hotspots managed'    },
  { value: 50,   suffix: 'K+', unit: '',    label: 'Daily users connected' },
  { value: 2,    suffix: 'B+', unit: 'UGX', label: 'Processed monthly'   },
  { value: 99.9, suffix: '%',  unit: '',    label: 'Uptime'               },
];

function useCountUp(target: number, decimals: number, active: boolean) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (!active) return;
    const duration = 1800;
    const start = performance.now();
    function step(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      setCurrent(parseFloat((target * ease).toFixed(decimals)));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [active, target, decimals]);
  return current;
}

function StatItem({ stat, active }: { stat: typeof STATS[0]; active: boolean }) {
  const decimals = stat.value % 1 !== 0 ? 1 : 0;
  const count = useCountUp(stat.value, decimals, active);

  return (
    <div style={{ textAlign: 'center', padding: '0 24px' }}>
      <div style={{ fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 800, color: '#fff', letterSpacing: '-2px', lineHeight: 1, marginBottom: 8 }}>
        {stat.unit && <span style={{ fontSize: '0.55em', color: '#2563eb', marginRight: 4, fontWeight: 700 }}>{stat.unit}</span>}
        <span>{count}</span>
        <span style={{ color: '#2563eb', fontSize: '0.75em' }}>{stat.suffix}</span>
      </div>
      <p style={{ fontSize: 14, color: '#555', fontWeight: 500 }}>{stat.label}</p>
    </div>
  );
}

export default function Stats() {
  const ref    = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setActive(true); obs.disconnect(); } },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section style={{ background: '#050505', borderTop: '1px solid #111', borderBottom: '1px solid #111', padding: '80px 24px' }}>
      <div ref={ref} style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 40 }}>
        {STATS.map((s, i) => (
          <div key={i}>
            <StatItem stat={s} active={active} />
          </div>
        ))}
      </div>
    </section>
  );
}
