'use client';
import { useState } from 'react';
import { GripVertical } from 'lucide-react';

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        background: enabled ? '#1D9E75' : '#333',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 200ms',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: enabled ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 200ms',
        }}
      />
    </div>
  );
}

export default function GatewaysPage() {
  const [preferences, setPreferences] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold text-white">Payment Gateways</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: '#666' }}>Preferences</span>
          <Toggle enabled={preferences} onToggle={() => setPreferences((v) => !v)} />
        </div>
      </div>
      <p className="text-sm mb-6" style={{ color: '#666' }}>
        Configure and prioritize payment collection methods for your platform.
      </p>

      {/* Gateway list */}
      <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
        {/* Single gateway item */}
        <div className="flex items-center gap-4 py-3">
          <GripVertical size={16} style={{ color: '#444', cursor: 'grab', flexShrink: 0 }} />
          {/* Green indicator — first = prioritized */}
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', flexShrink: 0 }} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm text-white font-medium">Agents</span>
              <span
                style={{
                  background: '#1D9E75',
                  color: '#fff',
                  fontSize: 10,
                  borderRadius: 9999,
                  padding: '1px 8px',
                  fontWeight: 600,
                }}
              >
                Active
              </span>
            </div>
            <p className="text-xs" style={{ color: '#555' }}>
              Allow agents to collect cash payments from customers
            </p>
          </div>
        </div>

        {/* Info text */}
        <p className="text-xs mt-4" style={{ color: '#555', borderTop: '1px solid #222', paddingTop: 12 }}>
          Drag to reorder. The first active gateway is shown as the primary payment option.
        </p>
      </div>
    </div>
  );
}
