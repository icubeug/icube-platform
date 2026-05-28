'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Users, Router as RouterIcon, Wifi, WifiOff,
  MessageSquare, CreditCard,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  active: '#1D9E75', trial: '#f59e0b', suspended: '#ef4444', cancelled: '#555',
};

const PLANS = [
  { id: 'free',       label: 'Free',       color: '#555',    desc: 'Basic access, community support' },
  { id: 'starter',    label: 'Starter',    color: '#2563eb', desc: 'Up to 5 sites, 20 routers' },
  { id: 'pro',        label: 'Pro',        color: '#6366f1', desc: 'Unlimited sites, priority support' },
  { id: 'enterprise', label: 'Enterprise', color: '#f59e0b', desc: 'Custom limits, dedicated SLA' },
];

function fmtUGX(n: number) {
  return `UGX ${Number(n).toLocaleString()}`;
}

function token() {
  return localStorage.getItem('sa_token') || '';
}

// ── Plan badge ────────────────────────────────────────────────────────────────
function PlanBadge({ plan }: { plan: string }) {
  const p = PLANS.find(x => x.id === plan) || PLANS[0];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 11, fontWeight: 700, color: p.color,
      background: `${p.color}18`, borderRadius: 99, padding: '3px 10px',
      textTransform: 'uppercase' as const, letterSpacing: '0.04em',
    }}>
      {p.label}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [data, setData]           = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [note, setNote]           = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Status editor
  const [statusEdit, setStatusEdit] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  // Plan editor
  const [planEdit, setPlanEdit]   = useState('');
  const [savingPlan, setSavingPlan] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);

  // Site limit editor
  const [maxSitesEdit, setMaxSitesEdit] = useState('5');
  const [savingMaxSites, setSavingMaxSites] = useState(false);
  const [maxSitesSaved, setMaxSitesSaved] = useState(false);

  async function load() {
    const res = await fetch(`/api/superadmin/tenants/${id}`, {
      headers: { Authorization: `Bearer ${token()}` },
    });
    const d = await res.json();
    setData(d);
    setStatusEdit(d.tenant?.status   || '');
    setPlanEdit(d.tenant?.plan       || 'free');
    setMaxSitesEdit(String(d.tenant?.max_sites ?? 5));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function addNote() {
    if (!note.trim()) return;
    setAddingNote(true);
    await fetch('/api/superadmin/support/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ tenant_id: id, note }),
    });
    setNote('');
    setAddingNote(false);
    load();
  }

  async function updateStatus() {
    setSavingStatus(true);
    await fetch(`/api/superadmin/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ status: statusEdit }),
    });
    setSavingStatus(false);
    load();
  }

  async function updateMaxSites() {
    const val = parseInt(maxSitesEdit, 10);
    if (isNaN(val) || val < 1) return;
    setSavingMaxSites(true);
    await fetch(`/api/superadmin/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ max_sites: val }),
    });
    setSavingMaxSites(false);
    setMaxSitesSaved(true);
    setTimeout(() => setMaxSitesSaved(false), 2000);
    load();
  }

  async function updatePlan() {
    setSavingPlan(true);
    await fetch(`/api/superadmin/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ plan: planEdit }),
    });
    setSavingPlan(false);
    setPlanSaved(true);
    setTimeout(() => setPlanSaved(false), 2000);
    load();
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 20, height: 20, border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const { tenant, admins = [], routers = [], recentFees = [], notes = [] } = data || {};
  if (!tenant) return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
      Tenant not found
    </div>
  );

  const currentPlanInfo = PLANS.find(p => p.id === tenant.plan) || PLANS[0];

  return (
    <div style={{ minHeight: '100vh', background: '#080808', padding: '24px 28px', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Back */}
      <a href="/superadmin/tenants" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#444', fontSize: 12, textDecoration: 'none', marginBottom: 20 }}>
        <ArrowLeft size={13} /> All Tenants
      </a>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>{tenant.name}</h1>
          <p style={{ fontSize: 12, color: '#444', margin: '0 0 8px' }}>
            {tenant.slug}.icubeug.net · Joined {new Date(tenant.created_at).toLocaleDateString()}
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600,
              color: STATUS_COLORS[tenant.status] || '#555',
              background: `${STATUS_COLORS[tenant.status] || '#555'}18`,
              borderRadius: 99, padding: '3px 10px',
            }}>
              {tenant.status}
            </span>
            <PlanBadge plan={tenant.plan || 'free'} />
          </div>
        </div>

        {/* Controls: Status + Plan */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {/* Status */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select
              value={statusEdit} onChange={e => setStatusEdit(e.target.value)}
              style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 8, padding: '7px 12px', fontSize: 12, color: '#fff', outline: 'none' }}>
              {['active', 'trial', 'suspended', 'cancelled'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={updateStatus}
              disabled={savingStatus || statusEdit === tenant.status}
              style={{
                background: '#1e1e1e', border: '1px solid #2a2a2a', color: '#aaa',
                borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600,
                cursor: savingStatus || statusEdit === tenant.status ? 'not-allowed' : 'pointer',
                opacity: statusEdit === tenant.status ? 0.4 : 1,
              }}>
              {savingStatus ? '…' : 'Set Status'}
            </button>
          </div>

          {/* Plan */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select
              value={planEdit} onChange={e => setPlanEdit(e.target.value)}
              style={{ background: '#111', border: '1px solid #6366f1', borderRadius: 8, padding: '7px 12px', fontSize: 12, color: '#fff', outline: 'none' }}>
              {PLANS.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            <button
              onClick={updatePlan}
              disabled={savingPlan || planEdit === tenant.plan}
              style={{
                background: planSaved ? '#1D9E75' : '#6366f1',
                border: 'none', color: '#fff', borderRadius: 8, padding: '7px 14px',
                fontSize: 12, fontWeight: 600,
                cursor: savingPlan || planEdit === tenant.plan ? 'not-allowed' : 'pointer',
                opacity: planEdit === tenant.plan ? 0.4 : 1,
                transition: 'background 0.3s',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
              <CreditCard size={12} />
              {savingPlan ? '…' : planSaved ? 'Saved ✓' : 'Change Plan'}
            </button>
          </div>

          {/* Site limit */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 9, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Site Limit</span>
              <input
                type="number" min={1} max={999}
                value={maxSitesEdit}
                onChange={e => setMaxSitesEdit(e.target.value)}
                style={{ width: 72, background: '#111', border: '1px solid #2a2a2a', borderRadius: 7, padding: '6px 10px', fontSize: 13, color: '#fff', outline: 'none', textAlign: 'center' }}
              />
            </div>
            <button
              onClick={updateMaxSites}
              disabled={savingMaxSites || maxSitesEdit === String(tenant.max_sites ?? 5)}
              style={{
                background: maxSitesSaved ? '#1D9E75' : '#1e1e1e',
                border: '1px solid #2a2a2a', color: maxSitesSaved ? '#fff' : '#aaa',
                borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.2s', marginTop: 14,
                opacity: maxSitesEdit === String(tenant.max_sites ?? 5) ? 0.4 : 1,
              }}>
              {savingMaxSites ? '…' : maxSitesSaved ? 'Saved ✓' : 'Set Limit'}
            </button>
          </div>
        </div>
      </div>

      {/* Plan info strip */}
      <div style={{
        background: `${currentPlanInfo.color}0d`,
        border: `1px solid ${currentPlanInfo.color}30`,
        borderRadius: 10, padding: '10px 16px', marginBottom: 24,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: currentPlanInfo.color, textTransform: 'uppercase' as const }}>
            {currentPlanInfo.label} Plan
          </span>
          <span style={{ fontSize: 12, color: '#555' }}>{currentPlanInfo.desc}</span>
        </div>
        {tenant.trial_ends_at && tenant.status === 'trial' && (
          <span style={{ fontSize: 11, color: '#f59e0b' }}>
            Trial ends {new Date(tenant.trial_ends_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* ── Stats row ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Plan',          value: (tenant.plan || 'free').charAt(0).toUpperCase() + (tenant.plan || 'free').slice(1), color: currentPlanInfo.color },
          { label: 'Total Fees',    value: fmtUGX(parseFloat(tenant.total_fees || 0)), color: '#2563eb' },
          { label: 'Routers',       value: String(tenant.router_count || 0), color: '#f59e0b' },
          { label: 'Vouchers Sold', value: String(tenant.vouchers_sold || 0), color: '#aaa' },
        ].map(s => (
          <div key={s.label} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ fontSize: 10, color: '#444', fontWeight: 600, textTransform: 'uppercase' as const, margin: '0 0 6px' }}>{s.label}</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── 2-col grid ──────────────────────────────────────────────────────── */}
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
              <span style={{ fontSize: 10, color: '#555', textTransform: 'capitalize' as const, background: '#1a1a1a', borderRadius: 6, padding: '2px 8px' }}>{a.role}</span>
            </div>
          ))}
          {admins.length === 0 && <p style={{ padding: 18, fontSize: 12, color: '#333' }}>No admins</p>}
        </div>

        {/* Routers */}
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <RouterIcon size={14} style={{ color: '#2563eb' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Routers ({routers.length})</span>
          </div>
          {routers.map((r: any) => (
            <div key={r.id} style={{ padding: '11px 18px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {r.vpn_connected
                  ? <Wifi size={13} style={{ color: '#1D9E75' }} />
                  : <WifiOff size={13} style={{ color: '#444' }} />}
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', margin: 0 }}>{r.name}</p>
                  <p style={{ fontSize: 10, color: '#444', margin: '2px 0 0' }}>{r.ip_address}</p>
                </div>
              </div>
              {r.setup_completed
                ? <span style={{ fontSize: 10, color: '#1D9E75', background: 'rgba(29,158,117,0.1)', borderRadius: 6, padding: '2px 8px' }}>Setup ✓</span>
                : <span style={{ fontSize: 10, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', borderRadius: 6, padding: '2px 8px' }}>Pending</span>}
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
            <textarea
              value={note} onChange={e => setNote(e.target.value)}
              placeholder="Add a note about this tenant…"
              rows={2}
              style={{ width: '100%', background: '#0a0a0a', border: '1px solid #1e1e1e', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: '#fff', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
            />
            <button
              onClick={addNote} disabled={!note.trim() || addingNote}
              style={{ marginTop: 6, background: '#6366f1', border: 'none', color: '#fff', borderRadius: 7, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: !note.trim() ? 0.4 : 1 }}>
              {addingNote ? '…' : '+ Add Note'}
            </button>
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {notes.map((n: any) => (
              <div key={n.id} style={{ padding: '12px 18px', borderBottom: '1px solid #1a1a1a' }}>
                <p style={{ fontSize: 12, color: '#ccc', margin: '0 0 6px', lineHeight: 1.5 }}>{n.note}</p>
                <p style={{ fontSize: 10, color: '#444', margin: 0 }}>
                  {n.author_name || 'Staff'} · {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
            ))}
            {notes.length === 0 && <p style={{ padding: '16px 18px', fontSize: 12, color: '#333' }}>No notes yet</p>}
          </div>
        </div>

        {/* Platform fee transactions */}
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a1a1a' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Platform Fee Transactions</span>
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {recentFees.map((f: any) => (
              <div key={f.id} style={{ padding: '11px 18px', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 12, color: '#aaa', margin: 0, textTransform: 'capitalize' as const }}>{f.source} sale</p>
                  <p style={{ fontSize: 10, color: '#444', margin: '2px 0 0' }}>{new Date(f.created_at).toLocaleString()}</p>
                </div>
                <div style={{ textAlign: 'right' as const }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', margin: 0 }}>
                    +UGX {Number(f.fee_amount || 0).toLocaleString()}
                  </p>
                  <p style={{ fontSize: 10, color: '#444', margin: '2px 0 0' }}>
                    {f.fee_pct}% of {Number(f.gross_amount || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {recentFees.length === 0 && (
              <p style={{ padding: '16px 18px', fontSize: 12, color: '#333' }}>No fee transactions yet</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
