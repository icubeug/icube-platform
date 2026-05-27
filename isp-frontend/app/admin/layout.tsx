'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Router, BarChart2, Headphones, ShoppingBag,
  Wallet, Users, Package, ArrowLeftRight, ArrowUpFromLine,
  Smartphone, Ticket, Network, Terminal, Settings,
  Receipt, Sliders, HelpCircle, ChevronDown, Cog, Wifi
} from 'lucide-react';

// ── Nav data ──────────────────────────────────────────────────────────────────
interface Child { label: string; href: string }
interface NavItem {
  label: string;
  icon: React.ElementType;
  href?: string;
  children?: Child[];
}

const MAIN_NAV: NavItem[] = [
  { label: 'Dashboard',        icon: LayoutDashboard, href: '/admin' },
  { label: 'Router',           icon: Router,          href: '/admin/routers' },
  { label: 'Usage Analytics',  icon: BarChart2,       href: '/admin/analytics' },
  { label: 'Support Hub',      icon: Headphones,      href: '/admin/support' },
  { label: 'Sales',            icon: ShoppingBag,     children: [
      { label: 'All',   href: '/admin/payments' },
      { label: 'Trash', href: '/admin/sales/trash' },
  ]},
  { label: 'Float',            icon: Wallet,          children: [
      { label: 'Manage',       href: '/admin/float' },
      { label: 'Purchases',    href: '/admin/float/purchases' },
      { label: 'Transactions', href: '/admin/float/transactions' },
  ]},
  { label: 'Users',            icon: Users,           children: [
      { label: 'Staff',     href: '/admin/users/staff' },
      { label: 'Customers', href: '/admin/users/customers' },
      { label: 'Roles',     href: '/admin/users/roles' },
  ]},
  { label: 'Packages',         icon: Package,         href: '/admin/packages' },
  { label: 'Transactions',     icon: ArrowLeftRight,  href: '/admin/payments' },
  { label: 'Disbursements',    icon: ArrowUpFromLine, href: '/admin/disbursements' },
  { label: 'Agent POS',        icon: Smartphone,      href: '/agent' },
  { label: 'Vouchers',         icon: Ticket,          href: '/admin/vouchers' },
  { label: 'PPPoE',            icon: Network,         children: [
      { label: 'Subscribers', href: '/admin/pppoe' },
      { label: 'Plans',       href: '/admin/pppoe/plans' },
  ]},
  { label: 'Remote Access',    icon: Terminal,        href: '/admin/remote' },
  { label: 'Settings',         icon: Settings,        children: [
      { label: 'General',   href: '/admin/settings/general' },
      { label: 'Routers',   href: '/admin/settings/routers' },
      { label: 'Templates', href: '/admin/settings/templates' },
      { label: 'SMS',       href: '/admin/settings/sms' },
      { label: 'Gateways',  href: '/admin/settings/gateways' },
      { label: 'Advanced',  href: '/admin/settings/advanced' },
  ]},
];

const ACCOUNT_NAV: NavItem[] = [
  { label: 'Billing',           icon: Receipt,   children: [
      { label: 'History',      href: '/admin/billing' },
      { label: 'Transactions', href: '/admin/billing/transactions' },
      { label: 'Payments',     href: '/admin/billing/payments' },
  ]},
  { label: 'Features & Limits', icon: Sliders,   children: [
      { label: 'Overview', href: '/admin/features' },
      { label: 'Request',  href: '/admin/limits/request' },
  ]},
  { label: 'Support',           icon: HelpCircle, href: '/admin/help' },
];

// ── Single nav row ────────────────────────────────────────────────────────────
function NavRow({ item }: { item: NavItem }) {
  const path = usePathname();

  const isLeafActive = !!item.href && (item.href === '/admin' ? path === '/admin' : path.startsWith(item.href));
  const childActive   = item.children?.some(c => path === c.href || path.startsWith(c.href));

  const [open, setOpen] = useState(!!childActive);
  useEffect(() => { if (childActive) setOpen(true); }, [childActive]);

  if (item.children) {
    return (
      <div>
        <button onClick={() => setOpen(v => !v)}
          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
            childActive ? 'text-white' : 'text-[#666] hover:text-[#aaa]'
          }`}>
          <item.icon size={13} className="flex-shrink-0" />
          <span className="flex-1 text-left truncate">{item.label}</span>
          <ChevronDown size={11} style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 180ms' }} />
        </button>

        <div style={{
          overflow: 'hidden',
          maxHeight: open ? `${item.children.length * 28}px` : '0px',
          transition: 'max-height 200ms ease-in-out',
        }}>
          <div className="ml-5 mt-0.5 border-l border-[#2a2a2a] pl-2 space-y-0.5">
            {item.children.map(c => {
              const active = path === c.href;
              return (
                <Link key={c.href} href={c.href}
                  className={`block px-2 py-1 text-[11px] rounded transition-colors ${
                    active ? 'text-[#1D9E75]' : 'text-[#555] hover:text-[#aaa]'
                  }`}>
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
    <Link href={item.href!}
      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
        isLeafActive
          ? 'bg-[#1D9E75]/15 text-[#1D9E75]'
          : 'text-[#666] hover:text-[#aaa] hover:bg-white/[0.04]'
      }`}>
      <item.icon size={13} className="flex-shrink-0" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

// ── Root layout ───────────────────────────────────────────────────────────────
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0f0f0f', color: '#fff' }}>

      {/* ── Sidebar ── */}
      <aside className="flex-shrink-0 flex flex-col" style={{ width: 200, background: '#161616', borderRight: '1px solid #222' }}>

        {/* Logo */}
        <div className="px-4 pt-5 pb-4 flex items-center gap-2" style={{ borderBottom: '1px solid #222' }}>
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: '#1D9E75' }}>
            <Wifi size={13} className="text-white" />
          </div>
          <span className="font-bold text-sm text-white">YourISP</span>
        </div>

        {/* Tenant selector */}
        <div className="px-3 py-3" style={{ borderBottom: '1px solid #222' }}>
          <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#1D9E75' }} />
            <span className="flex-1 text-left text-[11px] font-medium text-[#aaa] truncate">Dev ISP</span>
            <Cog size={11} className="text-[#555]" />
          </button>
        </div>

        {/* Main nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5"
          style={{ scrollbarWidth: 'none' }}>
          {MAIN_NAV.map(item => <NavRow key={item.label} item={item} />)}

          {/* ACCOUNT section */}
          <div className="pt-3 pb-1">
            <p className="px-2.5 text-[9px] font-semibold tracking-widest uppercase"
              style={{ color: '#444' }}>Account</p>
          </div>
          {ACCOUNT_NAV.map(item => <NavRow key={item.label} item={item} />)}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3" style={{ borderTop: '1px solid #222' }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: '#1D9E75', color: '#fff' }}>A</div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-[#aaa] truncate">Dev Admin</p>
              <p className="text-[10px] truncate" style={{ color: '#555' }}>admin@dev.local</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto" style={{ background: '#0f0f0f' }} data-theme="dark">
        {children}
      </main>
    </div>
  );
}
