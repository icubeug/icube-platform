'use client';
import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Building2, Radio, HeadphonesIcon,
  TrendingUp, Settings, UserCog, Shield, LogOut, Zap,
  BarChart3, ChevronRight, ExternalLink, Briefcase, X,
  Search, RefreshCw, Link2, Unlink, CheckCircle2,
} from 'lucide-react';

const NAV = [
  {
    section: 'Platform',
    items: [
      { href: '/superadmin/dashboard',  icon: LayoutDashboard, label: 'NOC Dashboard' },
      { href: '/superadmin/tenants',    icon: Building2,        label: 'Tenants' },
      { href: '/superadmin/routers',    icon: Radio,            label: 'Router Fleet' },
      { href: '/superadmin/analytics',  icon: BarChart3,        label: 'Analytics' },
    ],
  },
  {
    section: 'Operations',
    items: [
      { href: '/superadmin/revenue',    icon: TrendingUp,       label: 'Revenue' },
      { href: '/superadmin/support',    icon: HeadphonesIcon,   label: 'Support' },
      { href: '/superadmin/security',   icon: Shield,           label: 'Security' },
    ],
  },
  {
    section: 'Admin',
    items: [
      { href: '/superadmin/staff',      icon: UserCog,          label: 'Staff' },
      { href: '/superadmin/settings',   icon: Settings,         label: 'Settings' },
    ],
  },
];

function NavItem({ href, icon: Icon, label, active }: any) {
  return (
    <a href={href} style={{
      display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
      borderRadius: 8, textDecoration: 'none', fontSize: 12, fontWeight: 500,
      color: active ? '#38bdf8' : 'rgba(255,255,255,0.65)',
      background: active ? 'rgba(14,165,233,0.14)' : 'transparent',
      transition: 'all 0.15s', marginBottom: 1,
      borderLeft: active ? '2px solid #0ea5e9' : '2px solid transparent',
    }}>
      <Icon size={15} style={{ opacity: active ? 1 : 0.7 }} />
      {label}
      {active && <ChevronRight size={11} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
    </a>
  );
}

// ── Link My Business Modal ─────────────────────────────────────────────────────
function LinkTenantModal({ onClose, onLinked }: { onClose: () => void; onLinked: (t: any) => void }) {
  const [tenants,  setTenants]  = useState<any[]>([]);
  const [q,        setQ]        = useState('');
  const [loading,  setLoading]  = useState(true);
  const [linking,  setLinking]  = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('sa_token');
    const params = new URLSearchParams({ per_page: '50' });
    if (q) params.set('q', q);
    setLoading(true);
    fetch(`/api/superadmin/tenants?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setTenants(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [q]);

  async function link(tenant: any) {
    setLinking(tenant.id);
    const token = localStorage.getItem('sa_token');
    const res   = await fetch('/api/superadmin/my-tenant', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tenant_id: tenant.id }),
    });
    if (res.ok) {
      const t = await res.json();
      onLinked(t);
      onClose();
    }
    setLinking(null);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: '#070d1e', border: '1px solid #1a2540', borderRadius: 16,
        width: 480, maxWidth: '95vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #1a2540' }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Link My Business</h2>
            <p style={{ fontSize: 11, color: '#475569', margin: '3px 0 0' }}>Select the tenant you personally own</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}><X size={16} /></button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a2540', position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 28, top: '50%', transform: 'translateY(-50%)', color: '#334155' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search tenants…"
            style={{ width: '100%', boxSizing: 'border-box', background: '#0a1628', border: '1px solid #1a2540', borderRadius: 8, padding: '8px 12px 8px 32px', fontSize: 12, color: '#f1f5f9', outline: 'none' }} />
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ width: 18, height: 18, border: '2px solid #0ea5e9', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
            </div>
          ) : tenants.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#334155', fontSize: 12, padding: 24 }}>No tenants found</p>
          ) : tenants.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid #0d1a2e' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#0ea5e920', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#38bdf8', flexShrink: 0 }}>
                {t.name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                <div style={{ fontSize: 10, color: '#334155' }}>{t.slug}.icubeug.net · {t.plan}</div>
              </div>
              <button onClick={() => link(t)} disabled={!!linking}
                style={{ background: linking === t.id ? 'rgba(14,165,233,0.3)' : '#0ea5e9', border: 'none', color: '#fff', borderRadius: 7, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: linking ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                {linking === t.id ? <RefreshCw size={11} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Link2 size={11} />}
                {linking === t.id ? 'Linking…' : 'Select'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── My Business Card (sidebar) ─────────────────────────────────────────────────
function MyBusinessCard() {
  const [tenant,     setTenant]     = useState<any>(null);
  const [loading,    setLoading]    = useState(true);
  const [launching,  setLaunching]  = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const load = useCallback(async () => {
    const token = localStorage.getItem('sa_token');
    try {
      const res = await fetch('/api/superadmin/my-tenant', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setTenant(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openDashboard() {
    setLaunching(true);
    const token = localStorage.getItem('sa_token');
    try {
      const res = await fetch('/api/superadmin/my-tenant/access', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) { alert(d.error || 'Failed to open dashboard'); return; }

      // Store owner-mode token
      localStorage.setItem('icube_original_token', localStorage.getItem('icube_token') || '');
      localStorage.setItem('icube_token', d.token);
      localStorage.setItem('icube_tenant_id', String(d.tenant_id));
      localStorage.setItem('icube_impersonating', 'true');
      localStorage.setItem('icube_sa_owner_mode', 'true');
      localStorage.setItem('icube_impersonating_tenant_name', d.tenant_name);
      document.cookie = `icube_token=${d.token}; path=/; max-age=28800; SameSite=Lax`;
      window.location.href = '/admin';
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLaunching(false);
    }
  }

  async function unlink() {
    if (!confirm('Unlink your business tenant?')) return;
    const token = localStorage.getItem('sa_token');
    await fetch('/api/superadmin/my-tenant', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setTenant(null);
  }

  return (
    <>
      {showPicker && (
        <LinkTenantModal onClose={() => setShowPicker(false)} onLinked={t => { setTenant(t); load(); }} />
      )}

      <div style={{ margin: '8px 8px 4px', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(14,165,233,0.25)', background: 'linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(59,130,246,0.06) 100%)' }}>
        {/* Header strip */}
        <div style={{ padding: '8px 10px 6px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Briefcase size={11} style={{ color: '#38bdf8' }} />
          <span style={{ fontSize: 9, fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>My Business</span>
          {tenant && (
            <button onClick={unlink} title="Unlink" style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#334155', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <Unlink size={10} />
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '8px 10px 10px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 14, height: 14, border: '2px solid #0ea5e9', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : tenant ? (
          <div style={{ padding: '0 10px 10px' }}>
            {/* Tenant info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                {tenant.name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#f1f5f9', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tenant.name}</p>
                <p style={{ fontSize: 9, color: '#475569', margin: 0 }}>{tenant.router_count ?? 0} routers · {tenant.site_count ?? 0} sites</p>
              </div>
            </div>
            {/* Unlimited badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 7 }}>
              <Zap size={9} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Unlimited Access</span>
            </div>
            {/* Launch button */}
            <button onClick={openDashboard} disabled={launching} style={{
              width: '100%', background: launching ? 'rgba(14,165,233,0.4)' : 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
              border: 'none', color: '#fff', borderRadius: 7, padding: '7px 0',
              fontSize: 11, fontWeight: 700, cursor: launching ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: launching ? 'none' : '0 4px 14px rgba(14,165,233,0.35)',
              transition: 'all 0.15s',
            }}>
              {launching
                ? <><RefreshCw size={11} style={{ animation: 'spin 0.8s linear infinite' }} /> Opening…</>
                : <><ExternalLink size={11} /> Open My Dashboard</>}
            </button>
          </div>
        ) : (
          <div style={{ padding: '4px 10px 10px' }}>
            <p style={{ fontSize: 10, color: '#475569', margin: '0 0 8px', lineHeight: 1.4 }}>Link your ISP tenant to manage it with unlimited access.</p>
            <button onClick={() => setShowPicker(true)} style={{
              width: '100%', background: 'rgba(14,165,233,0.12)', border: '1px dashed rgba(14,165,233,0.35)',
              color: '#38bdf8', borderRadius: 7, padding: '7px 0', fontSize: 11, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            }}>
              <Link2 size={11} /> Link My Business
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ── Layout ─────────────────────────────────────────────────────────────────────
export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const pathname    = usePathname();
  const isLoginPage = pathname === '/superadmin/login' || pathname === '/superadmin/totp-setup';
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (isLoginPage) return;
    const token = localStorage.getItem('sa_token');
    if (!token) { window.location.href = '/superadmin/login'; return; }
    fetch('/api/superadmin/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d?.superadmin_id || d?.id) setUser(d);
        else window.location.href = '/superadmin/login';
      })
      .catch(() => { window.location.href = '/superadmin/login'; });
  }, [isLoginPage]);

  if (isLoginPage) return <>{children}</>;

  function logout() {
    localStorage.removeItem('sa_token');
    window.location.href = '/superadmin/login';
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#060c1a', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: 220, background: '#070d1e', borderRight: '1px solid #1a2540',
        display: 'flex', flexDirection: 'column', position: 'fixed',
        top: 0, left: 0, height: '100vh', zIndex: 10,
      }}>
        {/* Brand */}
        <div style={{ padding: '16px 14px 14px', borderBottom: '1px solid #1a2540' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(14,165,233,0.35)',
            }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>iC</span>
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 800, color: '#f1f5f9', margin: 0, letterSpacing: '0.01em' }}>ICUBE ISP</p>
              <p style={{ fontSize: 10, color: '#475569', margin: 0 }}>Super Admin Portal</p>
            </div>
          </div>
          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'blink 1.5s infinite' }} />
            <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>Platform Online</span>
          </div>
        </div>

        {/* My Business card */}
        <MyBusinessCard />

        {/* Nav */}
        <nav style={{ flex: 1, padding: '4px 8px', overflowY: 'auto' }}>
          {NAV.map(({ section, items }) => (
            <div key={section} style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '8px 10px 5px' }}>
                {section}
              </div>
              {items.map(n => (
                <NavItem key={n.href} {...n} active={pathname === n.href || (n.href !== '/superadmin/dashboard' && pathname.startsWith(n.href))} />
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid #1a2540' }}>
          {user && (
            <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {(user.name || 'SA')[0].toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name || 'Super Admin'}</p>
                <p style={{ fontSize: 10, color: '#334155', margin: 0, textTransform: 'capitalize' }}>{user.role || 'super_admin'}</p>
              </div>
            </div>
          )}
          <button onClick={logout} style={{
            display: 'flex', alignItems: 'center', gap: 7, width: '100%',
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)',
            cursor: 'pointer', fontSize: 11, padding: '4px 0', transition: 'color 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ marginLeft: 220, flex: 1, minWidth: 0 }}>
        {children}
      </div>

      <style>{`
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        @keyframes spin  { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
