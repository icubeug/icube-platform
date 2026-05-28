'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { api, logout } from '@/lib/api';
import type { Site } from '@/lib/api';
import {
  LayoutDashboard, Router, BarChart2, Headphones, ShoppingBag,
  Wallet, Users, Package, ArrowLeftRight, ArrowUpFromLine,
  Smartphone, Ticket, Network, Terminal, Settings,
  Receipt, Sliders, HelpCircle, ChevronDown, Wifi,
  Sun, Moon, LogOut, User as UserIcon, Plus, CheckCircle,
} from 'lucide-react';

const BLUE    = '#2563eb';
const BLUE_BG = 'rgba(37,99,235,0.1)';

const SITE_COLORS = ['#22c55e','#2563eb','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4'];

interface Child  { label: string; href: string }
interface NavItem {
  label: string;
  icon: React.ElementType;
  href?: string;
  children?: Child[];
}

const MAIN_NAV: NavItem[] = [
  { label: 'Dashboard',       icon: LayoutDashboard, href: '/admin' },
  { label: 'Routers',         icon: Router,          href: '/admin/routers' },
  { label: 'Analytics',       icon: BarChart2,       href: '/admin/analytics' },
  { label: 'Support Hub',     icon: Headphones,      href: '/admin/support' },
  { label: 'Sales',           icon: ShoppingBag,     children: [
    { label: 'All Sales',    href: '/admin/payments' },
    { label: 'Transactions', href: '/admin/transactions' },
  ]},
  { label: 'Float',           icon: Wallet,          children: [
    { label: 'Manage',       href: '/admin/float' },
    { label: 'Purchases',    href: '/admin/float/purchases' },
    { label: 'Transactions', href: '/admin/float/transactions' },
  ]},
  { label: 'Users',           icon: Users,           children: [
    { label: 'Staff',        href: '/admin/users/staff' },
    { label: 'Customers',    href: '/admin/users/customers' },
    { label: 'Roles',        href: '/admin/users/roles' },
  ]},
  { label: 'Packages',        icon: Package,         href: '/admin/packages' },
  { label: 'Disbursements',   icon: ArrowUpFromLine, href: '/admin/disbursements' },
  { label: 'Agent POS',       icon: Smartphone,      href: '/agent' },
  { label: 'Vouchers',        icon: Ticket,          href: '/admin/vouchers' },
  { label: 'PPPoE',           icon: Network,         children: [
    { label: 'Subscribers',  href: '/admin/pppoe' },
  ]},
  { label: 'Remote Access',   icon: Terminal,        href: '/admin/remote' },
  { label: 'Settings',        icon: Settings,        children: [
    { label: 'General',      href: '/admin/settings/general' },
    { label: 'Routers',      href: '/admin/settings/routers' },
    { label: 'Templates',    href: '/admin/settings/templates' },
    { label: 'SMS',          href: '/admin/settings/sms' },
    { label: 'Gateways',     href: '/admin/settings/gateways' },
    { label: 'Advanced',     href: '/admin/settings/advanced' },
  ]},
];

const ACCOUNT_NAV: NavItem[] = [
  { label: 'Billing',   icon: Receipt,   children: [
    { label: 'History',  href: '/admin/billing' },
    { label: 'Payments', href: '/admin/billing/payments' },
  ]},
  { label: 'Features',  icon: Sliders,   children: [
    { label: 'Overview', href: '/admin/features' },
    { label: 'Request',  href: '/admin/limits/request' },
  ]},
  { label: 'Help',      icon: HelpCircle, href: '/admin/help' },
];

function NavRow({ item, isLight }: { item: NavItem; isLight: boolean }) {
  const path = usePathname();
  const textActive   = isLight ? '#111'  : '#fff';
  const textInactive = isLight ? '#888'  : '#666';
  const textHover    = isLight ? '#333'  : '#aaa';
  const childActive  = isLight ? '#333'  : '#aaa';
  const childInact   = isLight ? '#999'  : '#555';

  const isLeafActive = !!item.href && (
    item.href === '/admin' ? path === '/admin' : path.startsWith(item.href)
  );
  const hasChildActive = item.children?.some(c => path === c.href || path.startsWith(c.href));
  const [open, setOpen] = useState(!!hasChildActive);
  useEffect(() => { if (hasChildActive) setOpen(true); }, [hasChildActive]);

  if (item.children) {
    return (
      <div>
        <button onClick={() => setOpen(v => !v)} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px', borderRadius: 0, fontSize: 12, fontWeight: 500,
          background: 'none', border: 'none', cursor: 'pointer', transition: 'color .15s',
          color: hasChildActive ? textActive : textInactive,
        }}
        onMouseEnter={e => { if (!hasChildActive) (e.currentTarget as HTMLButtonElement).style.color = textHover; }}
        onMouseLeave={e => { if (!hasChildActive) (e.currentTarget as HTMLButtonElement).style.color = textInactive; }}>
          <item.icon size={13} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.label}
          </span>
          <ChevronDown size={10} style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 180ms', flexShrink: 0 }} />
        </button>

        <div style={{ overflow: 'hidden', maxHeight: open ? `${item.children.length * 28}px` : '0', transition: 'max-height 200ms ease-in-out' }}>
          <div style={{ marginLeft: 22, borderLeft: `1px solid ${isLight ? '#e5e5e5' : '#1f1f1f'}`, paddingLeft: 8, paddingTop: 2, paddingBottom: 2 }}>
            {item.children.map(c => {
              const active = path === c.href || path.startsWith(c.href + '/');
              return (
                <Link key={c.href} href={c.href} style={{
                  display: 'block', padding: '5px 8px', fontSize: 11, borderRadius: 0,
                  color: active ? childActive : childInact, textDecoration: 'none', transition: 'color .15s',
                  borderLeft: active ? `2px solid ${BLUE}` : '2px solid transparent',
                  marginLeft: -8 - 1, paddingLeft: active ? 14 : 8,
                }}>
                  {c.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link href={item.href!} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 10px', fontSize: 12, fontWeight: 500,
      textDecoration: 'none', transition: 'color .15s',
      color: isLeafActive ? textActive : textInactive,
      background: isLeafActive ? BLUE_BG : 'none',
      borderLeft: isLeafActive ? `2px solid ${BLUE}` : '2px solid transparent',
      marginLeft: -2, paddingLeft: isLeafActive ? 12 : 10,
    }}>
      <item.icon size={13} style={{ flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.label}
      </span>
    </Link>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sites,         setSites]         = useState<Site[]>([]);
  const [activeSiteId,  setActiveSiteId]  = useState('');
  const [siteOpen,      setSiteOpen]      = useState(false);
  const [theme,         setTheme]         = useState<'dark' | 'light'>('dark');
  const [user,          setUser]          = useState<{ name: string; email: string; role: string } | null>(null);
  const [accountOpen,   setAccountOpen]   = useState(false);

  const siteRef    = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  // Init from localStorage
  useEffect(() => {
    const savedTheme = (localStorage.getItem('icube_theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    document.documentElement.className = savedTheme;

    const savedSite = localStorage.getItem('icube_active_site') || '';
    setActiveSiteId(savedSite);

    try {
      const raw = localStorage.getItem('icube_user');
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  // Load sites
  useEffect(() => {
    api.sites.list().then(setSites).catch(() => {});
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (siteRef.current    && !siteRef.current.contains(e.target as Node))    setSiteOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('icube_theme', next);
    document.documentElement.className = next;
  }

  function selectSite(id: string) {
    setActiveSiteId(id);
    localStorage.setItem('icube_active_site', id);
    setSiteOpen(false);
  }

  // ── Theme-derived colors ─────────────────────────────────────────────────────
  const L = theme === 'light';
  const sidebarBg   = L ? '#ffffff' : '#0f0f0f';
  const headerBg    = L ? '#ffffff' : '#0f0f0f';
  const mainBg      = L ? '#f0f0f0' : '#080808';
  const borderClr   = L ? '#e5e5e5' : '#1c1c1c';
  const dropBg      = L ? '#ffffff' : '#161616';
  const dropBorder  = L ? '#e5e5e5' : '#252525';
  const textPrimary = L ? '#111111' : '#ffffff';
  const textSec     = L ? '#555555' : '#aaaaaa';
  const textMuted   = L ? '#888888' : '#666666';
  const hoverBg     = L ? '#f0f0f0' : '#1a1a1a';

  const activeSite = sites.find(s => s.id === activeSiteId);
  const dotColor   = activeSite
    ? SITE_COLORS[sites.indexOf(activeSite) % SITE_COLORS.length]
    : '#555';

  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : 'A';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: mainBg, color: textPrimary }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside style={{ width: 182, flexShrink: 0, display: 'flex', flexDirection: 'column', background: sidebarBg, borderRight: `1px solid ${borderClr}` }}>

        {/* Logo */}
        <div style={{ padding: '14px 14px 12px', borderBottom: `1px solid ${borderClr}` }}>
          <img src="/logo-full.svg" alt="iCube" style={{ height: 28, width: 'auto', display: 'block' }} />
        </div>

        {/* Site selector */}
        <div ref={siteRef} style={{ padding: '8px 10px', borderBottom: `1px solid ${borderClr}`, position: 'relative' }}>
          <button onClick={() => setSiteOpen(v => !v)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 7,
            padding: '6px 8px', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer',
            transition: 'background .15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = hoverBg)}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: activeSite ? dotColor : '#22c55e', flexShrink: 0 }} />
            <span style={{ flex: 1, textAlign: 'left', fontSize: 12, fontWeight: 500, color: textSec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {activeSite?.name || 'All Sites'}
            </span>
            <ChevronDown size={11} style={{ color: textMuted, transform: siteOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
          </button>

          {siteOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% - 2px)', left: 8, right: 8, zIndex: 300,
              background: dropBg, border: `1px solid ${dropBorder}`,
              borderRadius: 9, boxShadow: '0 8px 28px rgba(0,0,0,0.45)', overflow: 'hidden',
            }}>
              {/* All sites */}
              <button onClick={() => selectSite('')} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', background: !activeSiteId ? hoverBg : 'none',
                border: 'none', cursor: 'pointer', textAlign: 'left',
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#555', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: !activeSiteId ? textPrimary : textSec, fontWeight: !activeSiteId ? 600 : 400 }}>All Sites</span>
                {!activeSiteId && <CheckCircle size={11} style={{ color: BLUE, marginLeft: 'auto' }} />}
              </button>

              {sites.map((s, idx) => {
                const color  = SITE_COLORS[idx % SITE_COLORS.length];
                const active = s.id === activeSiteId;
                return (
                  <button key={s.id} onClick={() => selectSite(s.id)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', background: active ? hoverBg : 'none',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, color: active ? textPrimary : textSec, fontWeight: active ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.name}
                    </span>
                    {active && <CheckCircle size={11} style={{ color: BLUE, flexShrink: 0 }} />}
                  </button>
                );
              })}

              {/* Add site */}
              <div style={{ borderTop: `1px solid ${borderClr}`, padding: '3px 0' }}>
                <Link href="/admin/sites" onClick={() => setSiteOpen(false)} style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '7px 10px', fontSize: 12, color: BLUE, textDecoration: 'none', fontWeight: 500,
                }}>
                  <Plus size={11} /> Add new site
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 2px', scrollbarWidth: 'none' }}>
          {MAIN_NAV.map(item => <NavRow key={item.label} item={item} isLight={L} />)}

          <div style={{ padding: '12px 10px 4px' }}>
            <p style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: L ? '#ccc' : '#333' }}>
              ACCOUNT
            </p>
          </div>
          {ACCOUNT_NAV.map(item => <NavRow key={item.label} item={item} isLight={L} />)}
        </nav>

        {/* Footer */}
        <div style={{ padding: '10px 12px', borderTop: `1px solid ${borderClr}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: textSec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                {user?.name || 'Admin'}
              </p>
              <p style={{ fontSize: 11, color: textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                {user?.email || ''}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Content column ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Top bar ── */}
        <header style={{
          height: 44, flexShrink: 0, display: 'flex', alignItems: 'center',
          justifyContent: 'flex-end', padding: '0 18px', gap: 8,
          background: headerBg, borderBottom: `1px solid ${borderClr}`,
        }}>

          {/* Theme toggle */}
          <button onClick={toggleTheme} title={L ? 'Dark mode' : 'Light mode'} style={{
            width: 32, height: 32, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: `1px solid ${borderClr}`, cursor: 'pointer',
            color: textMuted, transition: 'color .15s, border-color .15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = textPrimary; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = textMuted; }}>
            {L ? <Moon size={14} /> : <Sun size={14} />}
          </button>

          {/* Account dropdown */}
          <div ref={accountRef} style={{ position: 'relative' }}>
            <button onClick={() => setAccountOpen(v => !v)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 8px', borderRadius: 8, cursor: 'pointer',
              background: accountOpen ? hoverBg : 'none',
              border: `1px solid ${accountOpen ? borderClr : 'transparent'}`,
              transition: 'all .15s',
            }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>
                {initials}
              </div>
              <ChevronDown size={12} style={{ color: textMuted, transform: accountOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
            </button>

            {accountOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', right: 0, width: 204, zIndex: 300,
                background: dropBg, border: `1px solid ${dropBorder}`,
                borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', overflow: 'hidden',
              }}>
                {/* User header */}
                <div style={{ padding: '12px 14px', borderBottom: `1px solid ${borderClr}` }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: textPrimary, margin: 0 }}>{user?.name || 'Admin'}</p>
                  <p style={{ fontSize: 11, color: textMuted, margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email || ''}</p>
                </div>

                {/* Links */}
                <div style={{ padding: '4px 0' }}>
                  {[
                    { href: '/admin/settings/general', label: 'My Profile',  icon: UserIcon  },
                    { href: '/admin/settings/general', label: 'Settings',    icon: Settings  },
                  ].map(({ href, label, icon: Icon }) => (
                    <Link key={label} href={href} onClick={() => setAccountOpen(false)} style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: '8px 14px', fontSize: 13, color: textSec, textDecoration: 'none',
                    }}
                    onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.background = hoverBg)}
                    onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.background = 'none')}>
                      <Icon size={13} /> {label}
                    </Link>
                  ))}
                </div>

                <div style={{ height: 1, background: borderClr }} />

                <div style={{ padding: '4px 0' }}>
                  <button onClick={() => { setAccountOpen(false); logout(); }} style={{
                    display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                    padding: '8px 14px', fontSize: 13, color: '#ef4444',
                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = L ? '#fef2f2' : 'rgba(239,68,68,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    <LogOut size={13} /> Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ── Page content ── */}
        <main style={{ flex: 1, overflowY: 'auto', background: mainBg }}>
          {children}
        </main>
      </div>
    </div>
  );
}
