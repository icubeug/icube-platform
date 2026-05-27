'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, HeadphonesIcon, TrendingUp,
  Settings, UserCog, Shield, LogOut, ChevronRight,
} from 'lucide-react';

const NAV = [
  { href: '/superadmin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/superadmin/tenants',   icon: Users,           label: 'Tenants' },
  { href: '/superadmin/support',   icon: HeadphonesIcon,  label: 'Support' },
  { href: '/superadmin/revenue',   icon: TrendingUp,      label: 'Revenue' },
  { href: '/superadmin/settings',  icon: Settings,        label: 'Settings' },
  { href: '/superadmin/staff',     icon: UserCog,         label: 'Staff' },
];

function NavItem({ href, icon: Icon, label, active }: any) {
  return (
    <a href={href} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
      borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 500,
      color: active ? '#a5b4fc' : '#555',
      background: active ? 'rgba(99,102,241,0.15)' : 'transparent',
      transition: 'all 0.15s',
    }}>
      <Icon size={16} />
      {label}
    </a>
  );
}

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  // Skip layout for login page
  if (pathname === '/superadmin/login') return <>{children}</>;

  useEffect(() => {
    const token = localStorage.getItem('sa_token');
    if (!token && pathname !== '/superadmin/login') {
      window.location.href = '/superadmin/login';
      return;
    }
    fetch('/api/superadmin/me', {
      headers: { 'Authorization': `Bearer ${token}` },
    }).then(r => r.json()).then(d => {
      if (d?.superadmin_id || d?.id) setUser(d);
      else window.location.href = '/superadmin/login';
    }).catch(() => window.location.href = '/superadmin/login');
  }, []);

  function logout() {
    localStorage.removeItem('sa_token');
    window.location.href = '/superadmin/login';
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#080808', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: 210, background: '#0e0e0e', borderRight: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 10 }}>
        {/* Brand */}
        <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid #1a1a1a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={15} color="#fff" />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>iCube Admin</p>
              <p style={{ fontSize: 10, color: '#444', margin: 0 }}>Superadmin Portal</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {NAV.map(n => (
            <NavItem key={n.href} {...n} active={pathname.startsWith(n.href)} />
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #1a1a1a' }}>
          {user && (
            <div style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#aaa', margin: '0 0 1px' }}>{user.name}</p>
              <p style={{ fontSize: 10, color: '#444', margin: 0, textTransform: 'capitalize' }}>{user.role}</p>
            </div>
          )}
          <button onClick={logout}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: 12, padding: 0 }}>
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ marginLeft: 210, flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}
