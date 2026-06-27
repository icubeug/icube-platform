'use client';
import { useEffect, useState } from 'react';
import { UserCog, Plus, Trash2, RefreshCw, X, AlertTriangle, Shield, Eye, EyeOff } from 'lucide-react';

const BG   = '#050d1f';
const CARD = '#0a1628';
const BD   = '1px solid #1a2540';
const TXT  = '#f1f5f9';
const DIM  = '#475569';
const ROW  = '#111e36';

const ROLES = ['superadmin', 'support', 'finance'];

const ROLE_META: Record<string, { color: string; bg: string; label: string }> = {
  superadmin: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Super Admin' },
  support:    { color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', label: 'Support'     },
  finance:    { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  label: 'Finance'     },
};

const inp: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: CARD, border: BD,
  borderRadius: 8, padding: '9px 12px', fontSize: 13, color: TXT, outline: 'none',
};
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.45)', marginBottom: 5 };

function AddStaffModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form,    setForm]    = useState({ name: '', email: '', password: '', role: 'support' });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [showPw,  setShowPw]  = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    const token = localStorage.getItem('sa_token');
    try {
      const res = await fetch('/api/superadmin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to add staff');
      onAdded(); onClose();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#070d1e', border: BD, borderRadius: 14, width: 460, boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: BD }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: TXT, margin: 0 }}>Add Staff Member</p>
            <p style={{ fontSize: 12, color: DIM, margin: '4px 0 0' }}>Grant access to the super admin portal</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: DIM, cursor: 'pointer', padding: 2 }}><X size={16} /></button>
        </div>
        <form onSubmit={submit} style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lbl}>Full Name</label>
            <input required style={inp} placeholder="Jane Nakato" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Email Address</label>
            <input required type="email" style={inp} placeholder="jane@icubeug.net" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Password</label>
            <div style={{ position: 'relative' }}>
              <input required type={showPw ? 'text' : 'password'} style={{ ...inp, paddingRight: 40 }} placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} />
              <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: DIM, cursor: 'pointer', display: 'flex' }}>
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label style={lbl}>Role</label>
            <select style={{ ...inp, cursor: 'pointer' }} value={form.role} onChange={e => set('role', e.target.value)}>
              {ROLES.map(r => <option key={r} value={r}>{ROLE_META[r]?.label || r}</option>)}
            </select>
          </div>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#f87171', display: 'flex', alignItems: 'center', gap: 7 }}>
              <AlertTriangle size={13} /> {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 2 }}>
            <button type="button" onClick={onClose}
              style={{ background: 'none', border: BD, color: DIM, borderRadius: 8, padding: '8px 18px', fontSize: 12, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ background: '#0ea5e9', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 22px', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: saving ? 0.7 : 1 }}>
              {saving ? <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
              {saving ? 'Adding…' : 'Add Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SuperadminStaffPage() {
  const [staff,      setStaff]      = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const token = localStorage.getItem('sa_token');
    try {
      const res = await fetch('/api/superadmin/staff', { headers: { Authorization: `Bearer ${token}` } });
      const d   = await res.json();
      setStaff(Array.isArray(d) ? d : d.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function deleteStaff(id: string, name: string) {
    if (!confirm(`Remove ${name} from staff? They will lose all access.`)) return;
    setDeletingId(id);
    const token = localStorage.getItem('sa_token');
    try {
      await fetch(`/api/superadmin/staff/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      load();
    } finally { setDeletingId(null); }
  }

  function getInitials(name: string) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

  return (
    <div style={{ background: BG, minHeight: '100vh', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif', padding: '24px 28px' }}>
      {showModal && <AddStaffModal onClose={() => setShowModal(false)} onAdded={load} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: TXT, margin: '0 0 4px', letterSpacing: '-0.3px' }}>Staff</h1>
          <p style={{ fontSize: 12, color: DIM, margin: 0 }}>Manage super admin portal access</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{ background: '#0ea5e9', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
          <Plus size={14} /> Add Staff
        </button>
      </div>

      {/* Roles legend */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        {ROLES.map(r => {
          const m = ROLE_META[r];
          return (
            <div key={r} style={{ background: m.bg, border: `1px solid ${m.color}30`, borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 600, color: m.color, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Shield size={11} /> {m.label}
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ background: CARD, border: BD, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ background: '#070d1e', borderBottom: BD, display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 100px', padding: '10px 18px', gap: 12 }}>
          {['Name', 'Email', 'Role', 'Actions'].map(h => (
            <span key={h} style={{ fontSize: 9, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ width: 20, height: 20, border: '2px solid #0ea5e9', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
          </div>
        ) : staff.length === 0 ? (
          <div style={{ padding: '56px 0', textAlign: 'center' }}>
            <UserCog size={30} style={{ color: '#1a2540', marginBottom: 10 }} />
            <p style={{ color: '#334155', fontSize: 13, margin: 0 }}>No staff added yet</p>
          </div>
        ) : staff.map((s, i) => {
          const m = ROLE_META[s.role] || { color: '#64748b', bg: 'rgba(100,116,139,0.1)', label: s.role };
          return (
            <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr 100px', padding: '13px 18px', gap: 12, borderTop: i === 0 ? 'none' : `1px solid ${ROW}`, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #1e3a60, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {getInitials(s.name || 'SA')}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: TXT }}>{s.name}</span>
              </div>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>{s.email}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: m.color, background: m.bg, borderRadius: 99, padding: '3px 10px', width: 'fit-content' }}>
                {m.label}
              </span>
              <button
                onClick={() => deleteStaff(s.id, s.name)}
                disabled={deletingId === s.id}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: 7, padding: '5px 10px', fontSize: 11, fontWeight: 600, cursor: deletingId === s.id ? 'not-allowed' : 'pointer', opacity: deletingId === s.id ? 0.5 : 1 }}>
                {deletingId === s.id ? <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={11} />}
                Remove
              </button>
            </div>
          );
        })}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
