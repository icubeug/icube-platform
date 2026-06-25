'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { api, logout } from '@/lib/api';
import type { Site } from '@/lib/api';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useDevice } from '@/hooks/useDevice';
import {
  LayoutDashboard, Router, BarChart2, Headphones, ShoppingBag,
  Wallet, Users, Package, ArrowUpFromLine, Smartphone, Ticket,
  Network, Terminal, Settings, Receipt, Sliders, HelpCircle,
  ChevronDown, Sun, Moon, LogOut, User as UserIcon, Plus,
  CheckCircle, AlertTriangle, Menu, X,
} from 'lucide-react';

const BLUE    = '#2563eb';
const BLUE_BG = 'rgba(37,99,235,0.1)';
const SITE_COLORS = ['#22c55e','#2563eb','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4'];

interface Child  { label: string; href: string }
interface NavItem { label: string; icon: React.ElementType; href?: string; children?: Child[] }

const MAIN_NAV: NavItem[] = [
  { label: 'Dashboard',     icon: LayoutDashboard, href: '/admin' },
  { label: 'Routers',       icon: Router,          href: '/admin/routers' },
  { label: 'Analytics',     icon: BarChart2,       href: '/admin/analytics' },
  { label: 'Support Hub',   icon: Headphones,      href: '/admin/support' },
  { label: 'Sales',         icon: ShoppingBag,     children: [
    { label: 'All Sales',    href: '/admin/payments' },
    { label: 'Transactions', href: '/admin/transactions' },
  ]},
  { label: 'Float',         icon: Wallet,          children: [
    { label: 'Manage',       href: '/admin/float' },
    { label: 'Purchases',    href: '/admin/float/purchases' },
    { label: 'Transactions', href: '/admin/float/transactions' },
  ]},
  { label: 'Users',         icon: Users,           children: [
    { label: 'Staff',        href: '/admin/users/staff' },
    { label: 'Customers',    href: '/admin/users/customers' },
    { label: 'Roles',        href: '/admin/users/roles' },
  ]},
  { label: 'Packages',      icon: Package,         href: '/admin/packages' },
  { label: 'Disbursements', icon: ArrowUpFromLine, href: '/admin/disbursements' },
  { label: 'Agent POS',     icon: Smartphone,      href: '/agent' },
  { label: 'Vouchers',      icon: Ticket,          href: '/admin/vouchers' },
  { label: 'PPPoE',         icon: Network,         children: [
    { label: 'Subscribers',  href: '/admin/pppoe' },
  ]},
  { label: 'Remote Access', icon: Terminal,        href: '/admin/remote' },
  { label: 'Settings',      icon: Settings,        children: [
    { label: 'General',      href: '/admin/settings/general' },
    { label: 'Routers',      href: '/admin/settings/routers' },
    { label: 'Templates',    href: '/admin/settings/templates' },
    { label: 'SMS',          href: '/admin/settings/sms' },
    { label: 'Gateways',     href: '/admin/settings/gateways' },
    { label: 'Advanced',     href: '/admin/settings/advanced' },
  ]},
];

const ACCOUNT_NAV: NavItem[] = [
  { label: 'Billing',  icon: Receipt,   children: [
    { label: 'History',  href: '/admin/billing' },
    { label: 'Payments', href: '/admin/billing/payments' },
  ]},
  { label: 'Features', icon: Sliders,   children: [
    { label: 'Overview', href: '/admin/features' },
    { label: 'Request',  href: '/admin/limits/request' },
  ]},
  { label: 'Help',     icon: HelpCircle, href: '/admin/help' },
];

// ── Nav row ───────────────────────────────────────────────────────────────────
function NavRow({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const path = usePathname();
  const isLeafActive = !!item.href && (
    item.href === '/admin' ? path === '/admin' : path.startsWith(item.href)
  );
  const hasChildActive = item.children?.some(c => path === c.href || path.startsWith(c.href + '/'));
  const [open, setOpen] = useState(!!hasChildActive);
  useEffect(() => { if (hasChildActive) setOpen(true); }, [hasChildActive]);

  const textActive   = '#ffffff';
  const textInactive = 'rgba(255,255,255,0.82)';

  if (item.children) {
    return (
      <div>
        <button onClick={() => setOpen(v => !v)} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: collapsed ? '7px 0' : '6px 10px', justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: 0, fontSize: 12, fontWeight: 500,
          background: 'none', border: 'none', cursor: 'pointer', transition: 'color .15s',
          color: hasChildActive ? textActive : textInactive,
        }}
        title={collapsed ? item.label : undefined}>
          <item.icon size={13} style={{ flexShrink: 0 }} />
          {!collapsed && (
            <>
              <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.label}
              </span>
              <ChevronDown size={10} style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 180ms', flexShrink: 0 }} />
            </>
          )}
        </button>
        {!collapsed && (
          <div style={{ overflow: 'hidden', maxHeight: open ? `${item.children.length * 28}px` : '0', transition: 'max-height 200ms ease-in-out' }}>
            <div style={{ marginLeft: 22, borderLeft: `1px solid var(--border)`, paddingLeft: 8, paddingTop: 2, paddingBottom: 2 }}>
              {item.children.map(c => {
                const active = path === c.href || path.startsWith(c.href + '/');
                return (
                  <Link key={c.href} href={c.href} style={{
                    display: 'block', padding: '5px 8px', fontSize: 11, borderRadius: 0,
                    color: active ? '#ffffff' : 'rgba(255,255,255,0.65)',
                    textDecoration: 'none', transition: 'color .15s',
                    borderLeft: active ? `2px solid ${BLUE}` : '2px solid transparent',
                    marginLeft: -8 - 1, paddingLeft: active ? 14 : 8,
                  }}>{c.label}</Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Link href={item.href!} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: collapsed ? '7px 0' : '6px 10px',
      justifyContent: collapsed ? 'center' : 'flex-start',
      fontSize: 12, fontWeight: 500, textDecoration: 'none', transition: 'color .15s',
      color: isLeafActive ? textActive : textInactive,
      background: isLeafActive ? BLUE_BG : 'none',
      borderLeft: !collapsed ? (isLeafActive ? `2px solid ${BLUE}` : '2px solid transparent') : 'none',
      marginLeft: collapsed ? 0 : -2,
      paddingLeft: !collapsed ? (isLeafActive ? 12 : 10) : 0,
    }} title={collapsed ? item.label : undefined}>
      <item.icon size={13} style={{ flexShrink: 0 }} />
      {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>}
    </Link>
  );
}

// ── Bottom nav ────────────────────────────────────────────────────────────────
function BottomNav() {
  const path = usePathname();
  const items = [
    { href: '/admin',           icon: LayoutDashboard, label: 'Home'     },
    { href: '/admin/routers',   icon: Router,          label: 'Routers'  },
    { href: '/admin/vouchers',  icon: Ticket,          label: 'Vouchers' },
    { href: '/admin/payments',  icon: ShoppingBag,     label: 'Sales'    },
    { href: '/admin/analytics', icon: BarChart2,       label: 'Analytics'},
  ];
  return (
    <nav className="bottom-nav">
      {items.map(({ href, icon: Icon, label }) => {
        const active = href === '/admin' ? path === '/admin' : path.startsWith(href);
        return (
          <Link key={href} href={href} className={active ? 'active' : ''}>
            <Icon size={20} />
            <span className="nav-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ── Sidebar content ───────────────────────────────────────────────────────────
function SidebarContent({
  collapsed, sites, activeSiteId, siteOpen, setSiteOpen, selectSite, user, initials,
}: {
  collapsed: boolean; sites: Site[]; activeSiteId: string;
  siteOpen: boolean; setSiteOpen: (v: boolean) => void; selectSite: (id: string) => void;
  user: { name: string; email: string } | null; initials: string;
}) {
  const siteRef = useRef<HTMLDivElement>(null);
  const activeSite = sites.find(s => s.id === activeSiteId);
  const dotColor   = activeSite ? SITE_COLORS[sites.indexOf(activeSite) % SITE_COLORS.length] : '#555';

  useEffect(() => {
    function h(e: MouseEvent) { if (siteRef.current && !siteRef.current.contains(e.target as Node)) setSiteOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <>
      {/* Logo */}
      <div style={{ padding: collapsed ? '14px 0' : '14px 14px 12px', borderBottom: `1px solid var(--border)`, display: 'flex', justifyContent: collapsed ? 'center' : 'flex-start' }}>
        {collapsed
          ? <div style={{ width: 26, height: 26, borderRadius: 7, background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>i</div>
          : <img src="/logo-full.svg" alt="iCube" style={{ height: 28, width: 'auto', display: 'block' }} />}
      </div>

      {/* Site selector */}
      {!collapsed && (
        <div ref={siteRef} style={{ padding: '8px 10px', borderBottom: `1px solid var(--border)`, position: 'relative' }}>
          <button onClick={() => setSiteOpen(!siteOpen)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 7,
            padding: '6px 8px', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: activeSite ? dotColor : '#22c55e', flexShrink: 0 }} />
            <span className="site-name" style={{ flex: 1, textAlign: 'left', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeSite?.name || 'All Sites'}
            </span>
            <ChevronDown size={11} style={{ color: 'var(--text-tertiary)', transform: siteOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
          </button>
          {siteOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% - 2px)', left: 8, right: 8, zIndex: 300, background: 'var(--dropdown-bg)', border: `1px solid var(--border)`, borderRadius: 9, boxShadow: '0 8px 28px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
              <button onClick={() => selectSite('')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: !activeSiteId ? 'var(--bg-hover)' : 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#555', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: !activeSiteId ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: !activeSiteId ? 600 : 400 }}>All Sites</span>
                {!activeSiteId && <CheckCircle size={11} style={{ color: BLUE, marginLeft: 'auto' }} />}
              </button>
              {sites.map((s, idx) => {
                const color  = SITE_COLORS[idx % SITE_COLORS.length];
                const active = s.id === activeSiteId;
                return (
                  <button key={s.id} onClick={() => selectSite(s.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: active ? 'var(--bg-hover)' : 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, color: active ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: active ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                    {active && <CheckCircle size={11} style={{ color: BLUE, flexShrink: 0 }} />}
                  </button>
                );
              })}
              <div style={{ borderTop: `1px solid var(--border)`, padding: '3px 0' }}>
                <Link href="/admin/sites" onClick={() => setSiteOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', fontSize: 12, color: BLUE, textDecoration: 'none', fontWeight: 500 }}>
                  <Plus size={11} /> Add new site
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: collapsed ? '8px 0' : '8px 2px', scrollbarWidth: 'none', textAlign: collapsed ? 'center' : 'left' }}>
        {MAIN_NAV.map(item => <NavRow key={item.label} item={item} collapsed={collapsed} />)}
        {!collapsed && (
          <div style={{ padding: '12px 10px 4px' }}>
            <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>ACCOUNT</p>
          </div>
        )}
        {ACCOUNT_NAV.map(item => <NavRow key={item.label} item={item} collapsed={collapsed} />)}
      </nav>

      {/* Footer */}
      <div style={{ padding: collapsed ? '10px 0' : '10px 12px', borderTop: `1px solid var(--border)`, display: 'flex', justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials}</div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="user-name"  style={{ fontSize: 12, fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{user?.name || 'Admin'}</p>
              <p className="user-email" style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{user?.email || ''}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Admin Layout ──────────────────────────────────────────────────────────────
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme }   = useTheme();
  const device                   = useDevice();
  const isMobile                 = device === 'mobile';
  const isTablet                 = device === 'tablet';
  const collapsed                = isTablet;

  const [sidebarOpen,        setSidebarOpen]        = useState(false);
  const [sites,              setSites]              = useState<Site[]>([]);
  const [activeSiteId,       setActiveSiteId]       = useState('');
  const [siteOpen,           setSiteOpen]           = useState(false);
  const [user,               setUser]               = useState<{ name: string; email: string } | null>(null);
  const [accountOpen,        setAccountOpen]        = useState(false);
  const [impersonating,      setImpersonating]      = useState(false);
  const [impersonateName,    setImpersonateName]    = useState('');

  const accountRef = useRef<HTMLDivElement>(null);
  const path       = usePathname();

  // Close mobile sidebar on navigation
  useEffect(() => { setSidebarOpen(false); }, [path]);

  useEffect(() => {
    setActiveSiteId(localStorage.getItem('icube_active_site') || '');
    try { const raw = localStorage.getItem('icube_user'); if (raw) setUser(JSON.parse(raw)); } catch {}
    if (localStorage.getItem('icube_impersonating') === 'true') {
      setImpersonating(true);
      setImpersonateName(localStorage.getItem('icube_impersonating_tenant_name') || 'Unknown');
    }
  }, []);

  useEffect(() => { api.sites.list().then(setSites).catch(() => {}); }, []);

  useEffect(() => {
    function h(e: MouseEvent) { if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function exitImpersonation() {
    const original = localStorage.getItem('icube_original_token');
    if (original) localStorage.setItem('icube_token', original);
    localStorage.removeItem('icube_impersonating');
    localStorage.removeItem('icube_impersonating_tenant_name');
    localStorage.removeItem('icube_original_token');
    document.cookie = `icube_token=${original || ''}; path=/; max-age=604800; SameSite=Lax`;
    window.location.href = '/superadmin/tenants';
  }

  function selectSite(id: string) {
    setActiveSiteId(id);
    localStorage.setItem('icube_active_site', id);
    setSiteOpen(false);
    setSidebarOpen(false);
  }

  const initials = user?.name ? user.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() : 'A';
  const sidebarW = isMobile ? 240 : isTablet ? 60 : 182;

  const sidebarCommon: React.CSSProperties = {
    width: sidebarW, flexShrink: 0, display: 'flex', flexDirection: 'column',
    background: 'var(--sidebar-bg)', borderRight: `1px solid var(--border)`,
    height: '100vh', overflowY: 'auto', overflowX: 'hidden',
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      {isMobile ? (
        <aside className={`sidebar-drawer${sidebarOpen ? ' open' : ''}`} style={{ ...sidebarCommon, position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 300, width: sidebarW }}>
          <SidebarContent collapsed={false} sites={sites} activeSiteId={activeSiteId} siteOpen={siteOpen} setSiteOpen={setSiteOpen} selectSite={selectSite} user={user} initials={initials} />
        </aside>
      ) : (
        <aside className={isTablet ? 'sidebar-tablet-collapsed' : ''} style={sidebarCommon}>
          <SidebarContent collapsed={collapsed} sites={sites} activeSiteId={activeSiteId} siteOpen={siteOpen} setSiteOpen={setSiteOpen} selectSite={selectSite} user={user} initials={initials} />
        </aside>
      )}

      {/* ── Content column ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* ── Top bar ── */}
        <header style={{
          height: 44, flexShrink: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 16px', gap: 8,
          background: 'var(--sidebar-bg)', borderBottom: `1px solid var(--border)`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Hamburger — mobile only */}
            {isMobile && (
              <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
                background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
                display: 'flex', padding: 4,
              }}>
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            )}
            {isMobile && (
              <img src="/logo-full.svg" alt="iCube" style={{ height: 22, width: 'auto' }} />
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Theme toggle */}
            <button onClick={toggleTheme} title={theme === 'dark' ? 'Light mode' : 'Dark mode'} style={{
              width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: `1px solid var(--border)`, cursor: 'pointer',
              color: 'var(--text-tertiary)', transition: 'color .15s',
            }}>
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            {/* Account dropdown */}
            <div ref={accountRef} style={{ position: 'relative' }}>
              <button onClick={() => setAccountOpen(!accountOpen)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 8,
                cursor: 'pointer', background: accountOpen ? 'var(--bg-hover)' : 'none',
                border: `1px solid ${accountOpen ? 'var(--border)' : 'transparent'}`, transition: 'all .15s',
              }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{initials}</div>
                <ChevronDown size={12} style={{ color: 'var(--text-tertiary)', transform: accountOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
              </button>
              {accountOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', right: 0, width: 204, zIndex: 300,
                  background: 'var(--dropdown-bg)', border: `1px solid var(--border)`,
                  borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', overflow: 'hidden',
                }}>
                  <div style={{ padding: '12px 14px', borderBottom: `1px solid var(--border)` }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{user?.name || 'Admin'}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email || ''}</p>
                  </div>
                  <div style={{ padding: '4px 0' }}>
                    {[
                      { href: '/admin/settings/general', label: 'My Profile',  icon: UserIcon },
                      { href: '/admin/settings/general', label: 'Settings',    icon: Settings },
                    ].map(({ href, label, icon: Icon }) => (
                      <Link key={label} href={href} onClick={() => setAccountOpen(false)} style={{
                        display: 'flex', alignItems: 'center', gap: 9, padding: '8px 14px',
                        fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none',
                      }}
                      onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.background = 'none')}>
                        <Icon size={13} /> {label}
                      </Link>
                    ))}
                  </div>
                  <div style={{ height: 1, background: 'var(--border)' }} />
                  <div style={{ padding: '4px 0' }}>
                    <button onClick={() => { setAccountOpen(false); logout(); }} style={{
                      display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                      padding: '8px 14px', fontSize: 13, color: '#ef4444',
                      background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--error-bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      <LogOut size={13} /> Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Impersonation banner ── */}
        {impersonating && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 16px', flexShrink: 0, flexWrap: 'wrap', gap: 8,
            background: 'rgba(245,158,11,0.12)', borderBottom: '1px solid rgba(245,158,11,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={14} color="#f59e0b" />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#fcd34d' }}>
                ⚠ Viewing as <strong>{impersonateName}</strong>
              </span>
            </div>
            <button onClick={exitImpersonation} style={{
              background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)',
              color: '#fcd34d', borderRadius: 7, padding: '4px 12px',
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>
              Exit Impersonation
            </button>
          </div>
        )}

        {/* ── Page content ── */}
        <main className="main-content" style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-secondary)' }}>
          {children}
        </main>

        {/* ── Bottom nav (mobile) ── */}
        <BottomNav />
      </div>
    </div>
  );
}
