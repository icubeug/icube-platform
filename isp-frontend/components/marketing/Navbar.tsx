'use client';
import { useState, useEffect } from 'react';

const LINKS = [
  { label: 'Features',     href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing',      href: '#pricing' },
  { label: 'Customers',    href: '#testimonials' },
  { label: 'Blog',         href: '#',           dim: true },
];

const LOGIN_URL    = 'https://web.icubeug.net/auth/login?callbackUrl=%2Fadmin';
const REGISTER_URL = 'https://web.icubeug.net/auth/register';

export default function Navbar() {
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 32px', height: 64,
    background: scrolled ? 'rgba(5,5,5,0.92)' : 'rgba(5,5,5,0.6)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: scrolled ? '1px solid #1a1a1a' : '1px solid transparent',
    transition: 'background 300ms ease, border-color 300ms ease',
  };

  return (
    <>
      <nav style={navStyle}>
        {/* Logo */}
        <a href="/" style={{ display: 'flex', flexDirection: 'column', gap: 2, textDecoration: 'none', flexShrink: 0 }}>
          <img src="/logo-full.svg" alt="iCube" style={{ height: '40px', width: 'auto', display: 'block' }} />
          <span style={{ fontSize: 10, color: '#555', letterSpacing: '0.08em', fontWeight: 500, textTransform: 'uppercase' }}>Redefining IT</span>
        </a>

        {/* Desktop nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="hide-mobile">
          {LINKS.map(l => (
            <a key={l.label} href={l.href} style={{
              padding: '6px 14px', fontSize: 14, fontWeight: 500,
              color: l.dim ? '#444' : '#999',
              textDecoration: 'none', borderRadius: 8,
              transition: '200ms',
              cursor: l.dim ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={e => { if (!l.dim) (e.target as HTMLElement).style.color = '#fff'; }}
            onMouseLeave={e => { if (!l.dim) (e.target as HTMLElement).style.color = '#999'; }}
            onClick={e => l.dim && e.preventDefault()}
            >
              {l.label}{l.dim && <span style={{ fontSize: 9, marginLeft: 4, color: '#333', verticalAlign: 'super' }}>soon</span>}
            </a>
          ))}
        </div>

        {/* CTA buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} className="hide-mobile">
          <a href={LOGIN_URL} style={{
            padding: '7px 18px', fontSize: 14, fontWeight: 600,
            color: '#aaa', textDecoration: 'none', borderRadius: 8,
            border: '1px solid #222', transition: '200ms',
            background: 'transparent',
          }}
          onMouseEnter={e => { const el = e.target as HTMLElement; el.style.color = '#fff'; el.style.borderColor = '#444'; }}
          onMouseLeave={e => { const el = e.target as HTMLElement; el.style.color = '#aaa'; el.style.borderColor = '#222'; }}
          >
            Log in
          </a>
          <a href={REGISTER_URL} style={{
            padding: '8px 20px', fontSize: 14, fontWeight: 700,
            color: '#fff', textDecoration: 'none', borderRadius: 99,
            background: '#2563eb',
            boxShadow: '0 0 16px rgba(37,99,235,0.35)',
            transition: '200ms',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
          onMouseEnter={e => { const el = e.target as HTMLElement; el.style.background = '#1d4fd8'; el.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { const el = e.target as HTMLElement; el.style.background = '#2563eb'; el.style.transform = 'translateY(0)'; }}
          >
            Start free →
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="hide-desktop"
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 8 }}
          aria-label="Menu"
        >
          <HamburgerIcon open={menuOpen} />
        </button>
      </nav>

      {/* Mobile menu */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 99,
        background: 'rgba(5,5,5,0.98)',
        backdropFilter: 'blur(20px)',
        display: 'flex', flexDirection: 'column',
        paddingTop: 80, paddingBottom: 32, paddingLeft: 28, paddingRight: 28,
        transition: 'opacity 250ms, transform 250ms',
        opacity: menuOpen ? 1 : 0,
        transform: menuOpen ? 'translateY(0)' : 'translateY(-8px)',
        pointerEvents: menuOpen ? 'auto' : 'none',
      }} className="hide-desktop">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 32 }}>
          {LINKS.map(l => (
            <a key={l.label} href={l.href}
              onClick={() => { setMenuOpen(false); if (l.dim) return; }}
              style={{
                padding: '14px 0', fontSize: 20, fontWeight: 600,
                color: l.dim ? '#333' : '#ccc',
                textDecoration: 'none',
                borderBottom: '1px solid #111',
              }}
            >
              {l.label}
            </a>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <a href={LOGIN_URL} style={{
            padding: '14px', textAlign: 'center', fontSize: 16, fontWeight: 600,
            color: '#aaa', border: '1px solid #222', borderRadius: 12, textDecoration: 'none',
          }}>Log in</a>
          <a href={REGISTER_URL} style={{
            padding: '14px', textAlign: 'center', fontSize: 16, fontWeight: 700,
            color: '#fff', background: '#2563eb', borderRadius: 12, textDecoration: 'none',
          }}>Start free →</a>
        </div>
      </div>
    </>
  );
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      {open ? (
        <>
          <line x1="4" y1="4" x2="18" y2="18" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          <line x1="18" y1="4" x2="4" y2="18" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
        </>
      ) : (
        <>
          <line x1="3" y1="6"  x2="19" y2="6"  stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          <line x1="3" y1="11" x2="19" y2="11" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          <line x1="3" y1="16" x2="19" y2="16" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
        </>
      )}
    </svg>
  );
}
