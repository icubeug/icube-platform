'use client';
import { Clock } from 'lucide-react';

const STATS = [
  { label: 'Total Data Used', value: '1.2 TB' },
  { label: 'Peak Concurrent Users', value: '87' },
  { label: 'Avg Session Duration', value: '2.4 hrs' },
];

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>
      <h1 className="text-xl font-bold text-white mb-6">Usage Analytics</h1>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {STATS.map(s => (
          <div key={s.label} style={{
            background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '20px 24px',
          }}>
            <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Coming soon card */}
      <div style={{
        background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '20px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 260,
      }}>
        <Clock size={36} color="#333" style={{ marginBottom: 14 }} />
        <div style={{ fontSize: 14, color: '#666', fontWeight: 500 }}>Analytics features coming soon</div>
        <div style={{ fontSize: 12, color: '#444', marginTop: 6 }}>
          Detailed usage reports and charts will be available here.
        </div>
      </div>
    </div>
  );
}
