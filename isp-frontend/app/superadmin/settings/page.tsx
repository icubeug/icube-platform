'use client';
import { useEffect, useState } from 'react';
import { Save, Loader, CheckCircle, AlertCircle } from 'lucide-react';

const SETTING_GROUPS = [
  {
    title: 'Platform Fees',
    keys: [
      { key: 'voucher_platform_fee_pct', label: 'Voucher Sale Fee (%)', desc: 'iCube deducts this % from every voucher sale' },
      { key: 'momo_platform_fee_pct',    label: 'Mobile Money Fee (%)', desc: 'iCube deducts this % from MoMo payments (0 = disabled)' },
      { key: 'sms_rate_ugx',            label: 'SMS Rate (UGX)', desc: 'Cost per SMS charged to tenants' },
    ],
  },
  {
    title: 'Branding',
    keys: [
      { key: 'platform_name',    label: 'Platform Name', desc: 'Shown to tenants' },
      { key: 'support_email',    label: 'Support Email', desc: 'Tenant-facing support contact' },
      { key: 'support_phone',    label: 'Support Phone', desc: '' },
    ],
  },
  {
    title: 'Network Infrastructure',
    keys: [
      { key: 'icube_radius_ip',      label: 'RADIUS Server IP', desc: 'Used in MikroTik setup scripts' },
      { key: 'icube_vpn_server',     label: 'VPN Server Hostname', desc: 'PPTP/L2TP endpoint for router VPN' },
      { key: 'icube_server_ip',      label: 'Server IP', desc: 'iCube management server IP' },
      { key: 'icube_portal_domain',  label: 'Captive Portal Domain', desc: 'Hotspot login page DNS name' },
    ],
  },
];

export default function SuperadminSettingsPage() {
  const [settings, setSettings] = useState<Record<string,string>>({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    const token = localStorage.getItem('sa_token');
    fetch('/api/superadmin/settings', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setSettings(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true); setError('');
    const token = localStorage.getItem('sa_token');
    try {
      const res = await fetch('/api/superadmin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(settings),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setSettings(d);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const inp = {
    width: '100%', background: '#0a0a0a', border: '1px solid #1e1e1e',
    borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#fff',
    outline: 'none', boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080808', padding: '24px 28px', color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Platform Settings</h1>
          <p style={{ fontSize: 12, color: '#444', margin: 0 }}>Global iCube configuration applied to all tenants</p>
        </div>
        <button onClick={save} disabled={saving || loading}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: saved ? '#1D9E75' : '#6366f1', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1, transition: 'background 0.3s' }}>
          {saving ? <><Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving…</>
          : saved ? <><CheckCircle size={13} /> Saved!</>
          : <><Save size={13} /> Save Changes</>}
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#f87171', marginBottom: 20 }}>
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 60 }}>
          <div style={{ width: 22, height: 22, border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {SETTING_GROUPS.map(group => (
            <div key={group.title} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #1a1a1a' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{group.title}</span>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {group.keys.map(({ key, label, desc }) => (
                  <div key={key} style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#ccc', margin: '0 0 3px' }}>{label}</p>
                      {desc && <p style={{ fontSize: 11, color: '#444', margin: 0, lineHeight: 1.4 }}>{desc}</p>}
                    </div>
                    <input style={inp}
                      value={settings[key] || ''}
                      onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
