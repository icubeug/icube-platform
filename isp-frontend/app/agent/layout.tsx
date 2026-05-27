'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, Settings, Receipt, Wallet,
  ChevronDown, Wifi,
} from 'lucide-react';

interface Child { label: string; href: string }
interface NavItem {
  label: string;
  icon: React.ElementType;
  href?: string;
  children?: Child[];
  external?: boolean;
}

const AGENT_NAV: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/agent/pos' },
  { label: 'Admin',     icon: Settings,         href: '/admin', external: true },
  { label: 'Sold Cards', icon: Receipt,          href: '/agent/sold-cards' },
  { label: 'Float',     icon: Wallet,           children: [
      { label: 'Manage',       href: '/agent/float' },
      { label: 'Purchases',    href: '/agent/float/purchases' },
      { label: 'Transactions', href: '/agent/float/transactions' },
  ]},
];

function NavRow({ item }: { item: NavItem }) {
  const path = usePathname();

  const isLeafActive = !!item.href && (
    item.href === '/agent/pos'
      ? path === '/agent/pos'
      : path.startsWith(item.href)
  );
  const childActive = item.children?.some(c => path === c.href || path.startsWith(c.href));

  const [open, setOpen] = useState(!!childActive);
  useEffect(() => { if (childActive) setOpen(true); }, [childActive]);

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(v => !v)}
          className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
            childActive ? 'text-white' : 'text-[#666] hover:text-[#aaa]'
          }`}>
          <item.icon size={13} className="flex-shrink-0" />
          <span className="flex-1 text-left truncate">{item.label}</span>
          <ChevronDown size={11} style={{
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 180ms',
          }} />
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
    <Link
      href={item.href!}
      target={item.external ? '_blank' : undefined}
      rel={item.external ? 'noreferrer' : undefined}
      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
        isLeafActive
          ? 'bg-[#1D9E75]/15 text-[#1D9E75]'
          : 'text-[#666] hover:text-[#aaa] hover:bg-white/[0.04]'
      }`}>
      <item.icon size={13} className="flex-shrink-0" />
      <span className="truncate">{item.label}</span>
      {item.external && (
        <span style={{ fontSize: 9, color: '#444', marginLeft: 'auto' }}>↗</span>
      )}
    </Link>
  );
}

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [agentName, setAgentName] = useState('Agent');
  const [agentPhone, setAgentPhone] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('agent_info');
      if (raw) {
        const info = JSON.parse(raw);
        setAgentName(info.name || 'Agent');
        setAgentPhone(info.phone || '');
      }
    } catch {}
  }, []);

  // Login page — render without sidebar
  if (pathname === '/agent') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0f0f0f', color: '#fff' }}>

      {/* Sidebar */}
      <aside className="flex-shrink-0 flex flex-col" style={{ width: 180, background: '#161616', borderRight: '1px solid #222' }}>

        {/* Logo */}
        <div className="px-4 pt-5 pb-4 flex items-center gap-2" style={{ borderBottom: '1px solid #222' }}>
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: '#1D9E75' }}>
            <Wifi size={13} className="text-white" />
          </div>
          <span className="font-bold text-sm text-white">YourISP</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5"
          style={{ scrollbarWidth: 'none' }}>
          {AGENT_NAV.map(item => <NavRow key={item.label} item={item} />)}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3" style={{ borderTop: '1px solid #222' }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
              style={{ background: '#1D9E75', color: '#fff' }}>
              {agentName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-[#aaa] truncate">{agentName}</p>
              {agentPhone && (
                <p className="text-[10px] truncate" style={{ color: '#555' }}>{agentPhone}</p>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto" style={{ background: '#0f0f0f' }} data-theme="dark">
        {children}
      </main>
    </div>
  );
}
