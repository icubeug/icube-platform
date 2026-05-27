'use client';
import { useState, useEffect } from 'react';
import { Loader2, Check, Copy } from 'lucide-react';
import { api, HotspotSettings } from '@/lib/api';

// ── Save button with feedback ─────────────────────────────────────────────────
function SaveBtn({
  label = 'Save',
  saving,
  saved,
  onClick,
  disabled,
}: {
  label?: string;
  saving: boolean;
  saved: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onClick}
        disabled={saving || disabled}
        style={{
          background: '#1D9E75',
          color: '#fff',
          borderRadius: 8,
          padding: '7px 16px',
          fontSize: 13,
          fontWeight: 600,
          border: 'none',
          cursor: saving || disabled ? 'not-allowed' : 'pointer',
          opacity: saving || disabled ? 0.7 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {saving && <Loader2 size={13} className="animate-spin" />}
        {label}
      </button>
      {saved && (
        <span style={{ color: '#1D9E75', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Check size={13} /> Saved
        </span>
      )}
    </div>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
      <p className="text-sm font-semibold text-white mb-4">{title}</p>
      {children}
    </div>
  );
}

export default function GeneralSettingsPage() {
  const [data, setData] = useState<HotspotSettings | null>(null);

  // DNS
  const [dns, setDns] = useState('');
  const [savingDns, setSavingDns] = useState(false);
  const [savedDns, setSavedDns] = useState(false);

  // Support phones
  const [phone1, setPhone1] = useState('');
  const [phone2, setPhone2] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [savedPhone, setSavedPhone] = useState(false);

  // Login page name
  const [loginName, setLoginName] = useState('');
  const [savingLogin, setSavingLogin] = useState(false);
  const [savedLogin, setSavedLogin] = useState(false);

  // Router identity
  const [routerIdentity, setRouterIdentity] = useState('');
  const [copied, setCopied] = useState(false);

  // Footer note
  const [footerNote, setFooterNote] = useState('');
  const [savingFooter, setSavingFooter] = useState(false);
  const [savedFooter, setSavedFooter] = useState(false);

  useEffect(() => {
    api.settings.getGeneral().then((d) => {
      setData(d);
      setDns(d.dns_url ?? '');
      setPhone1(d.support_phone_1 ?? '');
      setPhone2(d.support_phone_2 ?? '');
      setLoginName(d.login_page_name ?? '');
      setRouterIdentity(d.router_identity ?? '');
      setFooterNote(d.footer_note ?? '');
    }).catch(() => {});
  }, []);

  async function save(
    field: Partial<HotspotSettings>,
    setSaving: (v: boolean) => void,
    setSaved: (v: boolean) => void,
  ) {
    setSaving(true);
    try {
      await api.settings.putGeneral(field);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    finally { setSaving(false); }
  }

  function copyIdentity() {
    navigator.clipboard.writeText(routerIdentity).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="min-h-screen" style={{ background: '#0f0f0f', padding: '24px 28px' }}>
      <h1 className="text-xl font-bold text-white mb-6">Hotspot Settings</h1>

      {/* DNS Configuration */}
      <SectionCard title="DNS Configuration">
        <label className="block text-xs font-medium mb-1.5" style={{ color: '#888' }}>DNS Server URL</label>
        <input
          className="input w-full mb-4"
          placeholder="https://dns.yourplatform.net"
          value={dns}
          onChange={(e) => setDns(e.target.value)}
        />
        <SaveBtn
          label="Update DNS Configuration"
          saving={savingDns}
          saved={savedDns}
          onClick={() => save({ dns_url: dns }, setSavingDns, setSavedDns)}
        />
      </SectionCard>

      {/* Customer Support Phones */}
      <SectionCard title="Customer Support Phones">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#888' }}>Primary Phone</label>
            <input
              className="input w-full"
              placeholder="+256700000000"
              value={phone1}
              onChange={(e) => setPhone1(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: '#888' }}>Secondary Phone</label>
            <input
              className="input w-full"
              placeholder="Optional"
              value={phone2}
              onChange={(e) => setPhone2(e.target.value)}
            />
          </div>
        </div>
        <SaveBtn
          label="Update"
          saving={savingPhone}
          saved={savedPhone}
          onClick={() => save({ support_phone_1: phone1, support_phone_2: phone2 }, setSavingPhone, setSavedPhone)}
        />
      </SectionCard>

      {/* Login Page Display Name */}
      <SectionCard title="Login Page Display Name">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium" style={{ color: '#888' }}>Display Name</label>
          <span className="text-xs" style={{ color: '#555' }}>{loginName.length}/50</span>
        </div>
        <input
          className="input w-full mb-4"
          placeholder="Your ISP Name"
          maxLength={50}
          value={loginName}
          onChange={(e) => setLoginName(e.target.value)}
        />
        <SaveBtn
          label="Update"
          saving={savingLogin}
          saved={savedLogin}
          onClick={() => save({ login_page_name: loginName }, setSavingLogin, setSavedLogin)}
        />
      </SectionCard>

      {/* Router Identity */}
      <SectionCard title="Router Identity">
        <label className="block text-xs font-medium mb-1.5" style={{ color: '#888' }}>Router Identity</label>
        <input
          className="input w-full mb-4"
          value={routerIdentity}
          readOnly
          style={{ color: '#666', cursor: 'default' }}
        />
        <button
          onClick={copyIdentity}
          style={{
            background: '#1D9E75',
            color: '#fff',
            borderRadius: 8,
            padding: '7px 16px',
            fontSize: 13,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Copy size={13} />
          {copied ? 'Copied!' : 'Copy Router Identity'}
        </button>
      </SectionCard>

      {/* Footer Note */}
      <SectionCard title="Footer Note">
        <label className="block text-xs font-medium mb-1.5" style={{ color: '#888' }}>Footer Note</label>
        <textarea
          className="input w-full mb-1"
          rows={4}
          maxLength={21000}
          placeholder="Enter footer note..."
          value={footerNote}
          onChange={(e) => setFooterNote(e.target.value)}
          style={{ resize: 'vertical' }}
        />
        <p className="text-xs mb-4" style={{ color: '#555' }}>{footerNote.length} / 21000</p>
        <SaveBtn
          label="Update Footer Note"
          saving={savingFooter}
          saved={savedFooter}
          onClick={() => save({ footer_note: footerNote }, setSavingFooter, setSavedFooter)}
        />
      </SectionCard>
    </div>
  );
}
