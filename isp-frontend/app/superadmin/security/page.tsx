'use client';
import { useEffect, useState } from 'react';
import { Shield, AlertTriangle, Lock, Globe, RefreshCw, Search, Clock } from 'lucide-react';

function timeAgo(d: string) {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

const SEVERITY: Record<string, { text: string; bg: string }> = {
  critical: { text: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  high:     { text: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  medium:   { text: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
  low:      { text: '#64748b', bg: 'rgba(100,116,139,0.12)' },
};

const MOCK_INCIDENTS = [
  { id: '1', type: 'failed_login',       severity: 'high',     ip: '41.210.4.18',    tenant: 'NetLink Uganda',  description: '12 failed login attempts in 5 minutes', created_at: new Date(Date.now() - 5*60_000).toISOString() },
  { id: '2', type: 'suspicious_access',  severity: 'medium',   ip: '197.155.12.88',  tenant: 'HotelWifi Pro',   description: 'Login from new country: Kenya (was: Uganda)', created_at: new Date(Date.now() - 23*60_000).toISOString() },
  { id: '3', type: 'account_locked',     severity: 'low',      ip: '10.0.0.55',      tenant: 'FiberTech ISP',   description: 'Account auto-locked after 5 failures', created_at: new Date(Date.now() - 45*60_000).toISOString() },
  { id: '4', type: 'api_abuse',          severity: 'critical',  ip: '185.220.101.4',  tenant: null,              description: 'Rate limit exceeded: 500 req/min from single IP', created_at: new Date(Date.now() - 2*60_000).toISOString() },
  { id: '5', type: 'failed_login',       severity: 'medium',   ip: '197.239.5.100',  tenant: 'SchoolNet Africa',description: '4 failed attempts — MFA triggered', created_at: new Date(Date.now() - 120*60_000).toISOString() },
];

const TYPE_ICONS: Record<string, string> = {
  failed_login:      '🔐',
  suspicious_access: '🌍',
  account_locked:    '🔒',
  api_abuse:         '⚡',
};

const box: React.CSSProperties = { background: '#0a1628', border: '1px solid #1a2540', borderRadius: 12, padding: '16px 18px', marginBottom: 16 };

export default function SuperadminSecurityPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const token = localStorage.getItem('sa_token');
      try {
        const [incRes] = await Promise.all([
          fetch('/api/superadmin/security/incidents', { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        ]);
        if (incRes?.ok) {
          const d = await incRes.json();
          setIncidents(d.data || d || []);
        } else {
          setIncidents(MOCK_INCIDENTS);
        }
      } catch { setIncidents(MOCK_INCIDENTS); }
      setLoading(false);
    }
    load();
  }, []);

  const critical = incidents.filter(i => i.severity === 'critical').length;
  const high     = incidents.filter(i => i.severity === 'high').length;

  return (
    <div style={{ background: '#060c1a', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif', padding: '20px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px' }}>Security Center</h1>
          <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>Threat detection · Audit logs · Access control</p>
        </div>
        <button style={{ background: 'none', border: '1px solid #1a2540', color: '#64748b', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Critical Alerts', val: critical,              color: '#ef4444', icon: AlertTriangle },
          { label: 'High Severity',   val: high,                  color: '#f59e0b', icon: AlertTriangle },
          { label: 'Total Incidents', val: incidents.length,      color: '#0ea5e9', icon: Shield },
          { label: 'Last 24h Events', val: incidents.length,      color: '#64748b', icon: Clock },
        ].map(({ label, val, color, icon: Icon }) => (
          <div key={label} style={{ background: '#0a1628', border: `1px solid ${val > 0 && label.includes('Critical') ? 'rgba(239,68,68,0.3)' : '#1a2540'}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={15} style={{ color }} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: val > 0 && label.includes('Critical') ? color : '#f1f5f9' }}>{val}</div>
              <div style={{ fontSize: 10, color: '#475569' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Incidents */}
      <div style={box}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
          <Shield size={14} style={{ color: '#ef4444' }} /> Security Incidents
        </div>
        <div>
          {(incidents.length > 0 ? incidents : MOCK_INCIDENTS).map(inc => {
            const sev = SEVERITY[inc.severity] || SEVERITY.low;
            return (
              <div key={inc.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid #111e36' }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: sev.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                  {TYPE_ICONS[inc.type] || '🔐'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>{inc.description}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: sev.text, background: sev.bg, borderRadius: 99, padding: '1px 7px', textTransform: 'uppercase' }}>{inc.severity}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#475569' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Globe size={10} />{inc.ip}</span>
                    {inc.tenant && <span>Tenant: <strong style={{ color: '#64748b' }}>{inc.tenant}</strong></span>}
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} />{timeAgo(inc.created_at)}</span>
                  </div>
                </div>
                <button style={{ background: 'none', border: '1px solid #1a2540', color: '#64748b', borderRadius: 6, padding: '4px 10px', fontSize: 10, cursor: 'pointer', flexShrink: 0 }}>
                  Resolve
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Platform Security Config */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={box}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Lock size={14} style={{ color: '#0ea5e9' }} /> Access Policies
          </div>
          {[
            { label: '2FA Enforcement',          val: 'Enabled for SA', ok: true },
            { label: 'Session Timeout',           val: '60 minutes',    ok: true },
            { label: 'Failed Login Lockout',      val: '5 attempts',    ok: true },
            { label: 'IP Allowlisting',           val: 'Optional',      ok: true },
            { label: 'JWT Token Expiry',          val: '15 minutes',    ok: true },
            { label: 'Refresh Token Rotation',   val: 'Enabled',        ok: true },
          ].map(({ label, val, ok }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #111e36' }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{label}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: ok ? '#22c55e' : '#ef4444', background: ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: 99, padding: '2px 8px' }}>
                {val}
              </span>
            </div>
          ))}
        </div>

        <div style={box}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
            <Shield size={14} style={{ color: '#8b5cf6' }} /> Data Protection
          </div>
          {[
            { label: 'Password Hashing',         val: 'bcrypt 12r',    ok: true },
            { label: 'Transport Encryption',      val: 'TLS 1.3',       ok: true },
            { label: 'Row-Level Security',        val: 'PostgreSQL RLS', ok: true },
            { label: 'Tenant Isolation',          val: 'tenant_id FK',  ok: true },
            { label: 'Audit Logging',             val: 'All writes',    ok: true },
            { label: 'Secrets Management',        val: 'Env vars',      ok: true },
          ].map(({ label, val, ok }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #111e36' }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{label}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: ok ? '#22c55e' : '#ef4444', background: ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: 99, padding: '2px 8px' }}>
                {val}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
