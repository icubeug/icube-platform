'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Users, Router as RouterIcon, Wifi, WifiOff, MessageSquare, Plus, Edit, AlertTriangle } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  active: '#1D9E75', trial: '#f59e0b', suspended: '#ef4444', cancelled: '#555',
};

function fmtUGX(n: number) {
  return `UGX ${Number(n).toLocaleString()}`;
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [statusEdit, setStatusEdit] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const token = localStorage.getItem('sa_token');
    const res = await fetch(`/api/superadmin/tenants/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const d = await res.json();
    setData(d);
    setStatusEdit(d.tenant?.status || '');
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addNote() {
    if (!note.trim()) return;
    setAddingNote(true);
    const token = localStorage.getItem('sa_token');
    await fetch('/api/superadmin/support/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ tenant_id: id, note }),
    });
    setNote('');
    setAddingNote(false);
    load();
  }

  async function updateStatus() {
    setSaving(true);
    const token = localStorage.getItem('sa_token');
    await fetch(`/api/superadmin/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status: statusEdit }),
    });
    setSaving(false);
    load();
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 20, height: 20, border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  const { tenant, admins = [], routers = [], recentFees = [], notes = [] } = data || {};
  if (!tenant) return <div style={{ minHeight: '100vh', background: '#080808', color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>Tenant not found</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#080808', padding: '24px 28px', color: '#fff' }}>
      {/* Back */}
      <a href="/superadmin/tenants"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#444', fontSize: 12, textDecoration: 'none', marginBottom: 20 }}>
        <ArrowLeft size={13} /> All Tenants
      </a>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>{tenant.name}</h1>
          <p style={{ fontSize: 12, color: '#444', margin: '0 0 8px' }}>{tenant.subdomain}.icube.co.ug · Joined {new Date(tenant.created_at).toLocaleDateString()}</p>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: STATUS_COLORS[tenant.status] || '#555', background: `${STATUS_COLORS[tenant.status] || '#555'}18`, borderRadius: 99, padding: '3px 10px' }}>
            {tenant.status}
          </span>
        </div>

        {/* Status change */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={statusEdit} onChange={e => setStatusEdit(e.target.value)}
            style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: '7px 12px', fontSize: 12, color: '#fff', outline: 'none' }}>
            {['active','trial','suspended','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={updateStatus} disabled={saving || statusEdit === tenant.status}
            style={{ background: '#6366f1', border: 'none', color: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: statusEdit === tenant.status ? 0.4 : 1 }}>
            {saving ? '…' : 'Update'}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Plan', value: tenant.plan, color: '#6366f1' },
          { label: 'Total Fees', value: fmtUGX(parseFloat(tenant.total_fees || 0)), color: '#1D9E75' },
          { label: 'Routers', value: String(tenant.router_count || 0), color: '#f59e0b' },
          { label: 'Vouchers Sold', value: String(tenant.vouchers_sold || 0), color: '#aaa' },
        ].map(s => (
          <div key={s.label} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ fontSize: 10, color: '#444', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 6px' }}>{s.label}</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Admins */}
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={14} style={{ color: '#6366f1' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Admins ({admins.length})</span>
          </div>
          {admins.map((a: any) => (
            <div key={a.id} style={{ padding: '11px 18px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', margin: 0 }}>{a.name}</p>
                <p style={{ fontSize: 10, color: '#444', margin: '2px 0 0' }}>{a.email}</p>
              </div>
              <span style={{ fontSize: 10, color: '#555', textTransform: 'capitalize', background: '#1a1a1a', borderRadius: 6, padding: '2px 8px' }}>{a.role}</span>
            </div>
          ))}
          {admins.length === 0 && <p style={{ padding: 18, fontSize: 12, color: '#333' }}>No admins</p>}
        </div>

        {/* Routers */}
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <RouterIcon size={14} style={{ color: '#1D9E75' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Routers ({routers.length})</span>
          </div>
          {routers.map((r: any) => (
            <div key={r.id} style={{ padding: '11px 18px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {r.vpn_connected ? <Wifi size={13} style={{ color: '#1D9E75' }} /> : <WifiOff size={13} style={{ color: '#444' }} />}
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', margin: 0 }}>{r.name}</p>
                  <p style={{ fontSize: 10, color: '#444', margin: '2px 0 0' }}>{r.ip_address}</p>
                </div>
              </div>
              {r.setup_completed
                ? <span style={{ fontSize: 10, color: '#1D9E75', background: 'rgba(29,158,117,0.1)', borderRadius: 6, padding: '2px 8px' }}>Setup ✓</span>
                : <span style={{ fontSize: 10, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', borderRadius: 6, padding: '2px 8px' }}>Pending setup</span>}
            </div>
          ))}
          {routers.length === 0 && <p style={{ padding: 18, fontSize: 12, color: '#333' }}>No routers</p>}
        </div>

        {/* Support notes */}
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare size={14} style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Support Notes</span>
          </div>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #1a1a1a' }}>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="Add a note about this tenant…"
              rows={2}
              style={{ width: '100%', background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: '#fff', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
            <button onClick={addNote} disabled={!note.trim() || addingNote}
              style={{ marginTop: 6, background: '#6366f1', border: 'none', color: '#fff', borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: !note.trim() ? 0.4 : 1 }}>
              {addingNote ? '…' : '+ Add Note'}
            </button>
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {notes.map((n: any) => (
              <div key={n.id} style={{ padding: '12px 18px', borderBottom: '1px solid #1a1a1a' }}>
                <p style={{ fontSize: 12, color: '#ccc', margin: '0 0 6px', lineHeight: 1.5 }}>{n.note}</p>
                <p style={{ fontSize: 10, color: '#444', margin: 0 }}>{n.author_name || 'Staff'} · {new Date(n.created_at).toLocaleString()}</p>
              </div>
            ))}
            {notes.length === 0 && <p style={{ padding: '16px 18px', fontSize: 12, color: '#333' }}>No notes yet</p>}
          </div>
        </div>

        {/* Recent fees */}
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a1a1a' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Platform Fee Transactions</span>
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {recentFees.map((f: any) => (
              <div key={f.id} style={{ padding: '11px 18px', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 12, color: '#aaa', margin: 0, textTransform: 'capitalize' }}>{f.source} sale</p>
                  <p style={{ fontSize: 10, color: '#444', margin: '2px 0 0' }}>{new Date(f.created_at).toLocaleString()}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#1D9E75', margin: 0 }}>+UGX {Number(f.fee_amount || 0).toLocaleString()}</p>
                  <p style={{ fontSize: 10, color: '#444', margin: '2px 0 0' }}>{f.fee_pct}% of {Number(f.gross_amount || 0).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {recentFees.length === 0 && <p style={{ padding: '16px 18px', fontSize: 12, color: '#333' }}>No fee transactions yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
