'use client';
import { useEffect, useState } from 'react';
import { UserCog, Plus, Trash2, Loader, X, AlertCircle, Shield } from 'lucide-react';

const ROLES = ['superadmin', 'support', 'finance'];

function AddStaffModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'support' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError('');
    const token = localStorage.getItem('sa_token');
    try {
      const res = await fetch('/api/superadmin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      onAdded(); onClose();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  const inp = {
    width: '100%', background: '#0a0a0a', border: '1px solid #1e1e1e',
    borderRadius: 8, padding: '9px 12px', fontSize: 13, color: '#fff', outline: 'none', boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, padding: 24, width: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Add Staff Member</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: 2 }}><X size={16} /></button>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[['name','Name'], ['email','Email'], ['password','Password']].map(([k, l]) => (
            <div key={k}>
              <label style={{ display: 'block', fontSize: 11, color: '#555', marginBottom: 5 }}>{l}</label>
              <input style={inp} type={k === 'password' ? 'password' : k === 'email' ? 'email' : 'text'}
                required value={(form as any)[k]} onChange={e => set(k, e.target.value)} />
            </div>
          ))}
          <div>
            <label style={{ display: 'block', fontSize: 11, color: '#555', marginBottom: 5 }}>Role</label>
            <select style={inp} value={form.role} onChange={e => set('role', e.target.value)}>
              {ROLES.map(r => <option key={r} value={r} style={{ textTransform: 'capitalize' }}>{r}</option>)}
            </select>
          </div>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 7, padding: '7px 10px', fontSize: 12, color: '#f87171' }}>
              <AlertCircle size={12} /> {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, background: '#0a0a0a', border: '1px solid #1e1e1e', color: '#888', borderRadius: 8, padding: '8px 0', fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ flex: 1, background: '#6366f1', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 0', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              {saving ? <><Loader size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> Adding…</> : 'Add Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const ROLE_COLORS: Record<string,string> = {
  superadmin: '#a5b4fc', support: '#1D9E75', finance: '#f59e0b',
};

export default function SuperadminStaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  async function load() {
    const token = localStorage.getItem('sa_token');
    const res = await fetch('/api/superadmin/staff', { headers: { 'Authorization': `Bearer ${token}` } });
    const d = await res.json();
    setStaff(Array.isArray(d) ? d : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function del(id: string, name: string) {
    if (!confirm(`Remove "${name}" from staff?`)) return;
    const token = localStorage.getItem('sa_token');
    await fetch(`/api/superadmin/staff/${id}`, {
      method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` },
    });
    setStaff(s => s.filter(m => m.id !== id));
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080808', padding: '24px 28px', color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>Staff</h1>
          <p style={{ fontSize: 12, color: '#444', margin: 0 }}>iCube team members with portal access</p>
        </div>
        <button onClick={() => setAddOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#6366f1', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Plus size={14} /> Add Staff
        </button>
      </div>

      <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ width: 20, height: 20, border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
          </div>
        ) : staff.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <UserCog size={28} style={{ color: '#222', marginBottom: 10 }} />
            <p style={{ fontSize: 13, color: '#333', margin: 0 }}>No staff members yet</p>
          </div>
        ) : staff.map(member => (
          <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderBottom: '1px solid #1a1a1a' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Shield size={16} style={{ color: '#6366f1' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: '0 0 2px' }}>{member.name}</p>
              <p style={{ fontSize: 11, color: '#444', margin: 0 }}>{member.email}</p>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: ROLE_COLORS[member.role] || '#555', background: `${ROLE_COLORS[member.role] || '#555'}18`, borderRadius: 99, padding: '3px 10px', textTransform: 'capitalize' }}>
              {member.role}
            </span>
            <span style={{ fontSize: 11, color: '#333' }}>
              {new Date(member.created_at).toLocaleDateString()}
            </span>
            <button onClick={() => del(member.id, member.name)}
              style={{ background: 'none', border: '1px solid #1e1e1e', borderRadius: 7, padding: '5px 8px', color: '#444', cursor: 'pointer', display: 'flex' }}
              className="hover:border-red-900 hover:text-red-400">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {addOpen && <AddStaffModal onClose={() => setAddOpen(false)} onAdded={load} />}
    </div>
  );
}
