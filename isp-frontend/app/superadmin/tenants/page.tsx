'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Search, Plus, RefreshCw, Building2, Wifi, Users,
  TrendingUp, MoreHorizontal, Shield, AlertTriangle, CheckCircle2,
  Clock, Zap, ChevronLeft, ChevronRight, X, Eye, UserCog, Ban,
} from 'lucide-react';

const STATUS_COLORS: Record<string, { text: string; bg: string; dot: string }> = {
  active:    { text: '#22c55e', bg: 'rgba(34,197,94,0.12)',    dot: '#22c55e' },
  trial:     { text: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   dot: '#f59e0b' },
  suspended: { text: '#ef4444', bg: 'rgba(239,68,68,0.12)',    dot: '#ef4444' },
  cancelled: { text: '#64748b', bg: 'rgba(100,116,139,0.12)',  dot: '#64748b' },
};

const PLAN_COLORS: Record<string, string> = {
  starter: '#64748b', business: '#0ea5e9',
  professional: '#8b5cf6', enterprise: '#f59e0b',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtUGX(n: number) {
  if (!n) return '—';
  if (n >= 1_000_000) return `UGX ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `UGX ${(n / 1_000).toFixed(0)}K`;
  return `UGX ${n}`;
}
function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function avatarColor(name: string) {
  const colors = ['#0ea5e9','#8b5cf6','#f59e0b','#22c55e','#ef4444','#06b6d4','#a855f7'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

// ── Create Tenant Modal ────────────────────────────────────────────────────────
function CreateTenantModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '', subdomain: '', owner_name: '', owner_email: '',
    owner_phone: '', plan: 'business', max_sites: '5', max_routers: '20',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('sa_token');
      const res   = await fetch('/api/superadmin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          business_name: form.name,
          subdomain:     form.subdomain,
          owner_name:    form.owner_name,
          owner_email:   form.owner_email,
          owner_phone:   form.owner_phone,
          plan:          form.plan,
          site_limit:    parseInt(form.max_sites),
          max_routers:   parseInt(form.max_routers),
        }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Failed to create tenant'); return; }
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: '#0a1628',
    border: '1px solid #1a2540', borderRadius: 8, padding: '9px 12px',
    fontSize: 13, color: '#f1f5f9', outline: 'none',
  };
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600,
    color: 'rgba(255,255,255,0.5)', marginBottom: 5,
  };
  const row: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: '#070d1e', border: '1px solid #1a2540', borderRadius: 16,
        width: 560, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #1a2540' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Onboard New Tenant</h2>
            <p style={{ fontSize: 12, color: '#475569', margin: '4px 0 0' }}>Create an ISP account on iCube Cloud</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 4 }}><X size={18} /></button>
        </div>

        <form onSubmit={submit} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Business Info */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Business Information</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={lbl}>Business Name *</label>
                <input required style={inp} placeholder="e.g. NetLink Uganda" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Subdomain *</label>
                <div style={{ display: 'flex', alignItems: 'center', background: '#0a1628', border: '1px solid #1a2540', borderRadius: 8, overflow: 'hidden' }}>
                  <input required style={{ ...inp, border: 'none', borderRadius: 0, flex: 1 }} placeholder="netlink" value={form.subdomain}
                    onChange={e => set('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} />
                  <span style={{ padding: '0 12px', fontSize: 12, color: '#475569', borderLeft: '1px solid #1a2540', whiteSpace: 'nowrap' }}>.icubeug.net</span>
                </div>
              </div>
            </div>
          </div>

          {/* Owner Info */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Owner / Admin Contact</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={row}>
                <div>
                  <label style={lbl}>Full Name *</label>
                  <input required style={inp} placeholder="John Mukasa" value={form.owner_name} onChange={e => set('owner_name', e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Phone *</label>
                  <input required style={inp} placeholder="+256 700 000 000" value={form.owner_phone} onChange={e => set('owner_phone', e.target.value)} />
                </div>
              </div>
              <div>
                <label style={lbl}>Email Address *</label>
                <input required type="email" style={inp} placeholder="admin@netlink.ug" value={form.owner_email} onChange={e => set('owner_email', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Plan & Limits */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Subscription Plan & Limits</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={lbl}>Plan *</label>
                <select style={{ ...inp, cursor: 'pointer' }} value={form.plan} onChange={e => set('plan', e.target.value)}>
                  <option value="starter">Starter</option>
                  <option value="business">Business</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Max Sites</label>
                <input type="number" min="1" max="500" style={inp} value={form.max_sites} onChange={e => set('max_sites', e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Max Routers</label>
                <input type="number" min="1" max="10000" style={inp} value={form.max_routers} onChange={e => set('max_routers', e.target.value)} />
              </div>
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#f87171', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={13} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ background: 'none', border: '1px solid #1a2540', color: '#64748b', borderRadius: 8, padding: '9px 20px', fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{
              background: loading ? 'rgba(14,165,233,0.5)' : '#0ea5e9', border: 'none',
              color: '#fff', borderRadius: 8, padding: '9px 24px', fontSize: 13, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7,
            }}>
              {loading ? <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Creating…</> : <><Plus size={13} /> Create Tenant</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SuperadminTenantsPage() {
  const [tenants,    setTenants]    = useState<any[]>([]);
  const [total,      setTotal]      = useState(0);
  const [stats,      setStats]      = useState<any>({});
  const [page,       setPage]       = useState(1);
  const [q,          setQ]          = useState('');
  const [statusF,    setStatusF]    = useState('');
  const [planF,      setPlanF]      = useState('');
  const [loading,    setLoading]    = useState(true);
  const [imperLoad,  setImpLoad]    = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const PER = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const token  = localStorage.getItem('sa_token');
    const params = new URLSearchParams({ page: String(page), per_page: String(PER) });
    if (q)       params.set('q', q);
    if (statusF) params.set('status', statusF);
    if (planF)   params.set('plan', planF);
    const res = await fetch(`/api/superadmin/tenants?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await res.json();
    setTenants(d.data || []);
    setTotal(d.total || 0);
    setStats(d.stats || {});
    setLoading(false);
  }, [page, q, statusF, planF]);

  useEffect(() => { load(); }, [load]);

  async function impersonate(id: string, name: string) {
    setImpLoad(id);
    try {
      const token = localStorage.getItem('sa_token');
      const res   = await fetch(`/api/superadmin/impersonate/${id}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) { alert(d.error || 'Impersonation failed'); return; }
      localStorage.setItem('icube_original_token', localStorage.getItem('icube_token') || '');
      localStorage.setItem('icube_token', d.token);
      localStorage.setItem('icube_tenant_id', d.tenant_id);
      localStorage.setItem('icube_impersonating', 'true');
      localStorage.setItem('icube_impersonating_tenant_name', d.tenant_name || name);
      document.cookie = `icube_token=${d.token}; path=/; max-age=3600; SameSite=Lax`;
      window.location.href = '/admin';
    } finally { setImpLoad(null); }
  }

  async function setStatus(id: string, current: string) {
    const next = current === 'suspended' ? 'active' : 'suspended';
    const label = next === 'suspended' ? 'Suspend' : 'Reactivate';
    if (!confirm(`${label} this tenant?`)) return;
    const token = localStorage.getItem('sa_token');
    await fetch(`/api/superadmin/tenants/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: next }),
    });
    load();
  }

  const totalPages = Math.ceil(total / PER);

  const s: React.CSSProperties = { background: '#060c1a', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' };

  return (
    <div style={s}>
      {showCreate && <CreateTenantModal onClose={() => setShowCreate(false)} onCreated={load} />}
      {/* click away action menu */}
      {actionMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setActionMenu(null)} />}

      {/* ── Top bar ── */}
      <div style={{ padding: '20px 28px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px', letterSpacing: '-0.3px' }}>Tenant Management</h1>
          <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>{total} ISPs · {stats.active_tenants ?? '—'} active · {stats.trial_tenants ?? '—'} trial</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={load} style={{ background: 'none', border: '1px solid #1a2540', color: '#64748b', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button onClick={() => setShowCreate(true)} style={{
            background: '#0ea5e9', border: 'none', color: '#fff', borderRadius: 8,
            padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <Plus size={14} /> Onboard Tenant
          </button>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, padding: '16px 28px' }}>
        {[
          { label: 'Total Tenants',   val: total,                      icon: Building2,    color: '#0ea5e9' },
          { label: 'Active',          val: stats.active_tenants ?? 0,  icon: CheckCircle2, color: '#22c55e' },
          { label: 'Trial',           val: stats.trial_tenants ?? 0,   icon: Clock,        color: '#f59e0b' },
          { label: 'Suspended',       val: stats.suspended_tenants ?? 0, icon: Ban,         color: '#ef4444' },
          { label: 'Expiring 30d',    val: stats.expiring_soon ?? 0,   icon: AlertTriangle,color: '#f59e0b' },
        ].map(({ label, val, icon: Icon, color }) => (
          <div key={label} style={{ background: '#0a1628', border: '1px solid #1a2540', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={15} style={{ color }} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ padding: '0 28px 16px', display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#334155' }} />
          <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }}
            placeholder="Search by name, subdomain, or email…"
            style={{ width: '100%', background: '#0a1628', border: '1px solid #1a2540', borderRadius: 8, padding: '8px 12px 8px 32px', fontSize: 12, color: '#f1f5f9', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {[
          { val: statusF, set: setStatusF, opts: ['All Statuses','active','trial','suspended','cancelled'], label: (s: string) => s === '' ? 'All Statuses' : s },
          { val: planF,   set: setPlanF,   opts: ['All Plans','starter','business','professional','enterprise'], label: (s: string) => s === '' ? 'All Plans' : s },
        ].map(({ val, set: setV, opts, label }, i) => (
          <select key={i} value={val} onChange={e => { setV(e.target.value); setPage(1); }}
            style={{ background: '#0a1628', border: '1px solid #1a2540', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: val ? '#f1f5f9' : '#475569', outline: 'none', cursor: 'pointer' }}>
            {opts.map(o => <option key={o} value={o.includes(' ') ? '' : o}>{label(o.includes(' ') ? '' : o) || o}</option>)}
          </select>
        ))}
      </div>

      {/* ── Table ── */}
      <div style={{ margin: '0 28px 28px', background: '#0a1628', border: '1px solid #1a2540', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#070d1e', borderBottom: '1px solid #1a2540' }}>
              {['Tenant', 'Plan', 'Status', 'Sites', 'Routers', 'Revenue (MTD)', 'Created', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ width: 20, height: 20, border: '2px solid #0ea5e9', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
              </td></tr>
            ) : tenants.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 48, textAlign: 'center', color: '#334155', fontSize: 13 }}>
                No tenants found — {q || statusF || planF ? 'try adjusting your filters' : 'onboard the first ISP'}
              </td></tr>
            ) : tenants.map(t => {
              const sc = STATUS_COLORS[t.status] || STATUS_COLORS.cancelled;
              const pc = PLAN_COLORS[t.plan] || '#64748b';
              return (
                <tr key={t.id} style={{ borderTop: '1px solid #111e36' }}>
                  {/* Tenant */}
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 9, background: avatarColor(t.name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                        {getInitials(t.name)}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>{t.name}</div>
                        <div style={{ fontSize: 10, color: '#334155', marginTop: 1 }}>{t.subdomain}.icubeug.net</div>
                        <div style={{ fontSize: 10, color: '#334155' }}>{t.owner_email}</div>
                      </div>
                    </div>
                  </td>
                  {/* Plan */}
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: pc, background: `${pc}18`, borderRadius: 99, padding: '2px 9px', textTransform: 'capitalize' }}>{t.plan}</span>
                  </td>
                  {/* Status */}
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: sc.text, background: sc.bg, borderRadius: 99, padding: '3px 9px' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: sc.dot, flexShrink: 0 }} />
                      {t.status}
                    </span>
                  </td>
                  {/* Sites */}
                  <td style={{ padding: '13px 16px', fontSize: 12, color: '#94a3b8' }}>
                    <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{t.site_count ?? 0}</span>
                    <span style={{ color: '#334155' }}> / {t.max_sites ?? 5}</span>
                  </td>
                  {/* Routers */}
                  <td style={{ padding: '13px 16px', fontSize: 12, color: '#94a3b8' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Wifi size={12} style={{ color: '#22c55e' }} />
                      <span style={{ color: '#f1f5f9', fontWeight: 600 }}>{t.router_count ?? 0}</span>
                    </div>
                  </td>
                  {/* Revenue */}
                  <td style={{ padding: '13px 16px', fontSize: 12, color: '#f1f5f9', fontWeight: 600 }}>
                    {fmtUGX(parseFloat(t.fees_generated || 0))}
                  </td>
                  {/* Created */}
                  <td style={{ padding: '13px 16px', fontSize: 11, color: '#334155' }}>
                    {t.created_at ? fmtDate(t.created_at) : '—'}
                  </td>
                  {/* Actions */}
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      <a href={`/superadmin/tenants/${t.id}`} title="View Details"
                        style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111e36', border: '1px solid #1a2540', borderRadius: 6, color: '#64748b', textDecoration: 'none' }}>
                        <Eye size={13} />
                      </a>
                      <button title="Impersonate" onClick={() => impersonate(t.id, t.name)} disabled={imperLoad === t.id}
                        style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)', borderRadius: 6, color: '#38bdf8', cursor: 'pointer', opacity: imperLoad === t.id ? 0.5 : 1 }}>
                        {imperLoad === t.id ? <RefreshCw size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <UserCog size={13} />}
                      </button>
                      <button title={t.status === 'suspended' ? 'Reactivate' : 'Suspend'} onClick={() => setStatus(t.id, t.status)}
                        style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.status === 'suspended' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${t.status === 'suspended' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, borderRadius: 6, color: t.status === 'suspended' ? '#22c55e' : '#ef4444', cursor: 'pointer' }}>
                        {t.status === 'suspended' ? <CheckCircle2 size={13} /> : <Ban size={13} />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {total > PER && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #111e36', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#070d1e' }}>
            <span style={{ fontSize: 11, color: '#334155' }}>
              Showing <strong style={{ color: '#64748b' }}>{(page-1)*PER+1}–{Math.min(page*PER, total)}</strong> of <strong style={{ color: '#64748b' }}>{total}</strong> tenants
            </span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#0a1628', border: '1px solid #1a2540', color: '#64748b', borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>
                <ChevronLeft size={12} /> Prev
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    style={{ width: 30, height: 28, background: p === page ? '#0ea5e9' : '#0a1628', border: `1px solid ${p === page ? '#0ea5e9' : '#1a2540'}`, color: p === page ? '#fff' : '#64748b', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontWeight: p === page ? 700 : 400 }}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages}
                style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#0a1628', border: '1px solid #1a2540', color: '#64748b', borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.4 : 1 }}>
                Next <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
