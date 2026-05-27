'use client';
import { useState, useEffect } from 'react';
import { Lock, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface LimitEntry {
  current: number;
  max: number;
  label: string;
}

interface OptionalFeature {
  key: string;
  label: string;
  enabled: boolean;
  description: string;
}

interface FeaturesData {
  limits: Record<string, LimitEntry>;
  optional: OptionalFeature[];
}

export default function FeaturesPage() {
  const [data, setData] = useState<FeaturesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.features.list().then((d) => {
      setData(d);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const hotspotLimit = data?.limits?.hotspot_sites ?? { current: 2, max: 20, label: 'Hotspot Sites' };
  const routerLimit  = data?.limits?.routers        ?? { current: 1, max: 3,  label: 'Routers' };
  const optional     = data?.optional ?? [];

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>
      <h1 className="text-xl font-bold text-white mb-6">Features &amp; Limits</h1>

      {/* Platform Limits */}
      <p
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#444',
          fontWeight: 600,
          marginBottom: 12,
        }}
      >
        Platform Limits
      </p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {/* Hotspot Sites */}
        <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '20px 24px' }}>
          <p className="text-sm font-bold text-white">Hotspot Sites</p>
          <p className="text-xs mt-1 mb-4" style={{ color: '#666' }}>
            Increase the number of hotspot sites you can manage on this account.
          </p>
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-white" style={{ fontSize: 30 }}>{hotspotLimit.current}</span>
            <span style={{ fontSize: 20, color: '#444', fontWeight: 600 }}>/ {hotspotLimit.max}</span>
          </div>
          <p className="text-xs mt-3" style={{ color: '#1D9E75', cursor: 'pointer' }}>
            Request Increase →
          </p>
        </div>

        {/* Router Limit */}
        <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '20px 24px' }}>
          <p className="text-sm font-bold text-white">Routers</p>
          <p className="text-xs mt-1 mb-4" style={{ color: '#666' }}>
            Increase the number of routers you can manage on this account.
          </p>
          <div className="flex items-baseline gap-1">
            <span className="font-bold text-white" style={{ fontSize: 30 }}>{routerLimit.current}</span>
            <span style={{ fontSize: 20, color: '#444', fontWeight: 600 }}>/ {routerLimit.max}</span>
          </div>
          <p className="text-xs mt-3" style={{ color: '#1D9E75', cursor: 'pointer' }}>
            Request Increase →
          </p>
        </div>
      </div>

      {/* Optional Features */}
      <p
        style={{
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: '#444',
          fontWeight: 600,
          marginBottom: 12,
        }}
      >
        Optional Features
      </p>

      {loading ? (
        <p style={{ color: '#555', fontSize: 13 }}>Loading...</p>
      ) : optional.length === 0 ? (
        <p style={{ color: '#555', fontSize: 13 }}>No optional features available.</p>
      ) : (
        <div className="space-y-3">
          {optional.map((feat) => (
            <div
              key={feat.key}
              style={{
                background: '#1a1a1a',
                border: '1px solid #222',
                borderRadius: 12,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              {/* Icon */}
              <div style={{ flexShrink: 0 }}>
                {feat.enabled ? (
                  <CheckCircle size={20} style={{ color: '#1D9E75' }} />
                ) : (
                  <Lock size={20} style={{ color: '#444' }} />
                )}
              </div>
              {/* Text */}
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{feat.label}</p>
                <p className="text-xs mt-0.5" style={{ color: '#666' }}>{feat.description}</p>
              </div>
              {/* Badge */}
              <div className="flex flex-col items-end gap-1">
                {feat.enabled ? (
                  <>
                    <span
                      style={{
                        background: 'rgba(29,158,117,0.15)',
                        color: '#1D9E75',
                        fontSize: 10,
                        borderRadius: 9999,
                        padding: '2px 8px',
                        fontWeight: 600,
                      }}
                    >
                      ENABLED
                    </span>
                    <span style={{ fontSize: 10, color: '#1D9E75', fontWeight: 700 }}>FEATURE ACTIVE</span>
                  </>
                ) : (
                  <>
                    <span
                      style={{
                        background: '#222',
                        color: '#555',
                        fontSize: 10,
                        borderRadius: 9999,
                        padding: '2px 8px',
                        fontWeight: 600,
                      }}
                    >
                      DISABLED
                    </span>
                    <span style={{ fontSize: 10, color: '#1D9E75', cursor: 'pointer' }}>Request Access →</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
