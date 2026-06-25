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

  // Delete account
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

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

  async function handleDeleteAccount() {
    setDeleteError('');
    setDeletingAccount(true);
    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
      const res = await fetch('/api/auth/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: deletePassword, business_name: deleteConfirmName }),
      });
      const json = await res.json();
      if (!res.ok) { setDeleteError(json.error || 'Deletion failed. Please try again.'); return; }
      // Clear all local auth state then redirect to marketing homepage
      localStorage.clear();
      window.location.href = 'https://icubeug.net';
    } catch {
      setDeleteError('Network error. Please try again.');
    } finally {
      setDeletingAccount(false);
    }
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

      {/* Danger Zone */}
      <div style={{ border: '1.5px solid #e53e3e', borderRadius: 12, padding: 24, marginTop: 8 }}>
        <h2 style={{ color: '#e53e3e', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Danger Zone</h2>
        <p className="text-xs mb-4" style={{ color: '#888' }}>
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          onClick={() => setDeleteModalOpen(true)}
          style={{
            background: '#e53e3e',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 18px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Delete Account
        </button>
      </div>

      {/* Delete Account Modal */}
      {deleteModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#18181b', borderRadius: 14, padding: 32, maxWidth: 440, width: '100%',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5)', border: '1.5px solid #2a2a2a',
          }}>
            <h3 style={{ color: '#e53e3e', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              Delete Account
            </h3>
            <p className="text-xs mb-4" style={{ color: '#aaa', lineHeight: 1.6 }}>
              This will permanently delete:
            </p>
            <ul style={{ color: '#aaa', fontSize: 12, marginBottom: 16, paddingLeft: 18, lineHeight: 1.8 }}>
              <li>Your business profile and branding</li>
              <li>All sites, routers, and vouchers</li>
              <li>All customers and hotspot sessions</li>
              <li>All admin accounts in your organisation</li>
              <li>All packages and pricing</li>
            </ul>
            <p className="text-xs mb-4" style={{ color: '#666' }}>
              Financial records and billing history are retained for legal compliance.
            </p>

            {deleteError && (
              <div style={{ background: '#2d1212', border: '1px solid #e53e3e', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
                <p className="text-xs" style={{ color: '#fc8181' }}>{deleteError}</p>
              </div>
            )}

            <div className="mb-3">
              <label className="block text-xs font-medium mb-1" style={{ color: '#888' }}>Current Password</label>
              <input
                type="password"
                className="input w-full"
                placeholder="Enter your password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="mb-5">
              <label className="block text-xs font-medium mb-1" style={{ color: '#888' }}>
                Type your business name to confirm
              </label>
              <input
                type="text"
                className="input w-full"
                placeholder={data?.business_name || 'Business name'}
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteModalOpen(false); setDeletePassword(''); setDeleteConfirmName(''); setDeleteError(''); }}
                style={{
                  flex: 1, background: '#2a2a2a', color: '#ccc', border: 'none',
                  borderRadius: 8, padding: '9px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deletingAccount || !deletePassword || !deleteConfirmName}
                style={{
                  flex: 1, background: deletingAccount ? '#7a1a1a' : '#e53e3e', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '9px 0', fontSize: 13, fontWeight: 600,
                  cursor: deletingAccount ? 'not-allowed' : 'pointer', opacity: !deletePassword || !deleteConfirmName ? 0.5 : 1,
                }}
              >
                {deletingAccount ? 'Deleting…' : 'Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
