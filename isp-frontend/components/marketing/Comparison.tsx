'use client';
import { useEffect, useRef } from 'react';

type CellValue = boolean | 'partial';

const ROWS: { feature: string; icube: CellValue; userman: CellValue; manual: CellValue; other: CellValue }[] = [
  { feature: 'Mobile Money (MTN/Airtel)', icube: true,  userman: false,     manual: false,     other: false     },
  { feature: 'AI Assistant',             icube: true,  userman: false,     manual: false,     other: false     },
  { feature: 'Agent POS System',         icube: true,  userman: false,     manual: false,     other: false     },
  { feature: 'Offline Router Recovery',  icube: true,  userman: false,     manual: false,     other: false     },
  { feature: 'Self-hosted option',       icube: true,  userman: true,      manual: true,      other: false     },
  { feature: 'Multi-router brands',      icube: true,  userman: false,     manual: false,     other: 'partial' },
  { feature: 'PPPoE Billing',            icube: true,  userman: false,     manual: false,     other: 'partial' },
  { feature: 'Remote Terminal',          icube: true,  userman: false,     manual: false,     other: false     },
  { feature: 'Data sovereignty',         icube: true,  userman: true,      manual: true,      other: false     },
  { feature: 'Free to start',            icube: true,  userman: true,      manual: true,      other: false     },
  { feature: 'Built for Uganda',         icube: true,  userman: false,     manual: false,     other: false     },
];

const COLS = [
  { key: 'icube',   label: 'iCube',                 highlight: true  },
  { key: 'userman', label: 'MikroTik User Manager', highlight: false },
  { key: 'manual',  label: 'Manual Setup',          highlight: false },
  { key: 'other',   label: 'Other ISP Software',    highlight: false },
];

export default function Comparison() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('visible'); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section style={{ background: '#080808', padding: '100px 24px', borderTop: '1px solid #111' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="section-label">COMPARISON</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, color: '#f0f0f0', letterSpacing: '-1px' }}>
            How iCube compares to the alternatives
          </h2>
        </div>

        <div ref={ref} className="reveal" style={{ overflowX: 'auto', borderRadius: 16, border: '1px solid #1a1a1a' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr>
                <th style={{ padding: '16px 20px', fontSize: 12, color: '#444', fontWeight: 600, textAlign: 'left', background: '#111', borderBottom: '1px solid #1a1a1a', width: '30%' }}>Feature</th>
                {COLS.map(col => (
                  <th key={col.key} style={{
                    padding: '16px 20px', fontSize: 12, fontWeight: 700, textAlign: 'center',
                    background: col.highlight ? 'rgba(37,99,235,0.08)' : '#111',
                    color: col.highlight ? '#90b4fe' : '#444',
                    borderBottom: `2px solid ${col.highlight ? '#2563eb' : '#1a1a1a'}`,
                    borderLeft: '1px solid #1a1a1a',
                  }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr key={row.feature} style={{ background: i % 2 === 0 ? '#0a0a0a' : '#080808' }}>
                  <td style={{ padding: '13px 20px', fontSize: 13, color: '#aaa', borderBottom: '1px solid #111' }}>
                    {row.feature}
                  </td>
                  {COLS.map(col => {
                    const val = row[col.key as keyof typeof row] as CellValue;
                    return (
                      <td key={col.key} style={{
                        padding: '13px 20px', textAlign: 'center',
                        background: col.highlight ? 'rgba(37,99,235,0.04)' : 'transparent',
                        borderBottom: '1px solid #111',
                        borderLeft: '1px solid #141414',
                      }}>
                        {val === true
                          ? <CheckMark highlight={col.highlight} />
                          : val === 'partial'
                          ? <PartialMark />
                          : <CrossMark />
                        }
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function CheckMark({ highlight }: { highlight: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ margin: '0 auto', display: 'block' }}>
      <circle cx="9" cy="9" r="9" fill={highlight ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.04)'}/>
      <polyline points="5,9 8,12 13,6" stroke={highlight ? '#2563eb' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CrossMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ margin: '0 auto', display: 'block' }}>
      <circle cx="9" cy="9" r="9" fill="rgba(255,255,255,0.02)"/>
      <line x1="6" y1="6" x2="12" y2="12" stroke="#2a2a2a" strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="6" x2="6" y2="12" stroke="#2a2a2a" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function PartialMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ margin: '0 auto', display: 'block' }}>
      <circle cx="9" cy="9" r="9" fill="rgba(245,158,11,0.12)"/>
      <text x="9" y="13" textAnchor="middle" fontSize="11" fill="#f59e0b" fontWeight="700">~</text>
    </svg>
  );
}
