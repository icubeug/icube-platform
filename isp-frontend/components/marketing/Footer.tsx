'use client';
export default function Footer() {
  const cols = [
    {
      title: 'Product',
      links: [
        { label: 'Features',    href: '#features'     },
        { label: 'Pricing',     href: '#pricing'      },
        { label: 'How it works',href: '#how-it-works' },
        { label: 'Changelog',   href: '#'             },
        { label: 'API docs',    href: '#', dim: true   },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About us',  href: '#' },
        { label: 'Blog',      href: '#' },
        { label: 'Careers',   href: '#' },
        { label: 'Press',     href: '#' },
        { label: 'Contact',   href: 'mailto:hello@icubeug.net' },
      ],
    },
    {
      title: 'Legal & Support',
      links: [
        { label: 'Privacy policy',  href: '#' },
        { label: 'Terms of service', href: '#' },
        { label: 'Security',        href: '#' },
        { label: 'Support center',  href: '#' },
        { label: 'Status page',     href: '#' },
      ],
    },
  ];

  return (
    <footer style={{ background: '#050505', borderTop: '1px solid #111', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 48, marginBottom: 64 }}>

          {/* Brand col */}
          <div style={{ gridColumn: 'span 1' }}>
            <a href="/" style={{ display: 'block', textDecoration: 'none', marginBottom: 6 }}>
              <img src="/logo-full.svg" alt="iCube" style={{ height: '36px', width: 'auto', display: 'block' }} />
            </a>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 16, fontWeight: 500, letterSpacing: '0.04em' }}>Redefining IT</p>
            <p style={{ fontSize: 13, color: '#444', lineHeight: 1.75, marginBottom: 24, maxWidth: 220 }}>
              The complete ISP and hotspot management platform for African operators.
            </p>
            {/* Social */}
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { icon: <TwitterIcon/>, href: '#' },
                { icon: <LinkedInIcon/>, href: '#' },
                { icon: <FacebookIcon/>, href: '#' },
                { icon: <WhatsAppIcon/>, href: 'https://wa.me/256774673115' },
              ].map(({ icon, href }, i) => (
                <a key={i} href={href} style={{
                  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#111', border: '1px solid #1e1e1e', borderRadius: 8,
                  transition: '200ms', textDecoration: 'none',
                }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#1a1a1a'; el.style.borderColor = '#2a2a2a'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = '#111'; el.style.borderColor = '#1e1e1e'; }}
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Nav cols */}
          {cols.map(col => (
            <div key={col.title}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
                {col.title}
              </p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.links.map(l => (
                  <li key={l.label}>
                    <a href={l.href} style={{
                      fontSize: 13, color: (l as any).dim ? '#2a2a2a' : '#555',
                      textDecoration: 'none', transition: '200ms',
                    }}
                    onMouseEnter={e => { if (!(l as any).dim) (e.target as HTMLElement).style.color = '#aaa'; }}
                    onMouseLeave={e => { if (!(l as any).dim) (e.target as HTMLElement).style.color = '#555'; }}
                    >
                      {l.label}
                      {(l as any).dim && <span style={{ fontSize: 9, marginLeft: 4, color: '#2a2a2a' }}>soon</span>}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid #111', paddingTop: 24, display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#333' }}>© 2026 iCube Solutions Ltd.</span>
          <span style={{ fontSize: 12, color: '#333' }}>Made with ❤️ in Uganda 🇺🇬</span>
          <a href="mailto:hello@icubeug.net" style={{ fontSize: 12, color: '#444', textDecoration: 'none' }}
            onMouseEnter={e => (e.target as HTMLElement).style.color = '#888'}
            onMouseLeave={e => (e.target as HTMLElement).style.color = '#444'}
          >
            hello@icubeug.net
          </a>
        </div>
      </div>
    </footer>
  );
}

function TwitterIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/></svg>;
}
function LinkedInIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>;
}
function FacebookIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>;
}
function WhatsAppIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>;
}
