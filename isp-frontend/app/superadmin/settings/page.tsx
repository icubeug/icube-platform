'use client';
import { useEffect, useState } from 'react';
import { Save, RefreshCw, CheckCircle, AlertTriangle, Settings, Globe, DollarSign, Wifi } from 'lucide-react';

const BG   = '#050d1f';
const CARD = '#0a1628';
const BD   = '1px solid #1a2540';
const TXT  = '#f1f5f9';
const DIM  = '#475569';
const ROW  = '#111e36';

const SETTING_GROUPS = [
  {
    title: 'Platform Fees',
    icon: DollarSign,
    color: '#22c55e',
    desc: 'Revenue-share percentages deducted by iCube on each transaction',
    keys: [
      { key: 'voucher_platform_fee_pct', label: 'Voucher Sale Fee (%)',   desc: 'iCube deducts this % from every voucher sale' },
      { key: 'momo_platform_fee_pct',    label: 'Mobile Money Fee (%)',   desc: 'iCube deducts this % from MoMo payments (0 = disabled)' },
      { key: 'sms_rate_ugx',            label: 'SMS Rate (UGX)',          desc: 'Cost per SMS charged to tenant accounts' },
    ],
  },
  {
    title: 'Branding',
    icon: Settings,
    color: '#8b5cf6',
    desc: 'Global platform identity visible to tenants and their subscribers',
    keys: [
      { key: 'platform_name',  label: 'Platform Name',  desc: 'Shown in tenant emails and login pages' },
      { key: 'support_email',  label: 'Support Email',  desc: 'Tenant-facing support contact address' },
      { key: 'support_phone',  label: 'Support Phone',  desc: 'Displayed in help pages' },
    ],
  },
  {
    title: 'Network Infrastructure',
    icon: Wifi,
    color: '#0ea5e9',
    desc: 'Core network endpoints injected into router provisioning scripts',
    keys: [
      { key: 'icube_radius_ip',     label: 'RADIUS Server IP',      desc: 'Used in MikroTik setup scripts' },
      { key: 'icube_vpn_server',    label: 'VPN Server Hostname',   desc: 'PPTP / L2TP / WireGuard endpoint for router VPN tunnels' },
      { key: 'icube_server_ip',     label: 'Server IP / Hostname',  desc: 'iCube management server — use domain name, never raw IP' },
      { key: 'icube_portal_domain', label: 'Captive Portal Domain', desc: 'Hotspot login page DNS — e.g. portal.icubeug.net' },
    ],
  },
];

export default function SuperadminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    const token = localStorage.getItem('sa_token');
    fetch('/api/superadmin/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setSettings(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true); setError('');
    const token = localStorage.getItem('sa_token');
    try {
      const res = await fetch('/api/superadmin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Save failed');
      setSettings(d);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: '#070d1e',
    border: BD, borderRadius: 8, padding: '9px 12px',
    fontSize: 13, color: TXT, outline: 'none', fontFamily: 'inherit',
  };

  return (
    <div style={{ background: BG, minHeight: '100vh', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif', padding: '24px 28px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: TXT, margin: '0 0 4px', letterSpacing: '-0.3px' }}>Platform Settings</h1>
          <p style={{ fontSize: 12, color: DIM, margin: 0 }}>Global iCube configuration applied across all tenants</p>
        </div>
        <button onClick={save} disabled={saving || loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, border: 'none', color: '#fff',
            borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 700,
            cursor: saving || loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s',
            background: saved ? '#22c55e' : '#0ea5e9', opacity: saving ? 0.8 : 1,
          }}>
          {saving
            ? <><RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving…</>
            : saved
            ? <><CheckCircle size={13} /> Saved!</>
            : <><Save size={13} /> Save Changes</>}
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '11px 14px', fontSize: 12, color: '#f87171', marginBottom: 20 }}>
          <AlertTriangle size={13} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 80 }}>
          <div style={{ width: 22, height: 22, border: '2px solid #0ea5e9', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {SETTING_GROUPS.map(group => {
            const Icon = group.icon;
            return (
              <div key={group.title} style={{ background: CARD, border: BD, borderRadius: 12, overflow: 'hidden' }}>
                {/* Group header */}
                <div style={{ padding: '14px 20px', borderBottom: `1px solid ${ROW}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `${group.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={14} style={{ color: group.color }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: TXT, margin: 0 }}>{group.title}</p>
                    <p style={{ fontSize: 11, color: '#334155', margin: 0 }}>{group.desc}</p>
                  </div>
                </div>

                {/* Settings rows */}
                <div style={{ padding: '6px 0' }}>
                  {group.keys.map(({ key, label, desc }, i) => (
                    <div key={key} style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, padding: '14px 20px', alignItems: 'center', borderTop: i === 0 ? 'none' : `1px solid ${ROW}` }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#cbd5e1', margin: '0 0 3px' }}>{label}</p>
                        {desc && <p style={{ fontSize: 11, color: '#334155', margin: 0, lineHeight: 1.5 }}>{desc}</p>}
                      </div>
                      <input
                        style={inp}
                        value={settings[key] || ''}
                        onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                        onFocus={e  => (e.target.style.borderColor = 'rgba(14,165,233,0.6)')}
                        onBlur={e   => (e.target.style.borderColor = '#1a2540')}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
