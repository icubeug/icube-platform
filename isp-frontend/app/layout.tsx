import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

export const metadata: Metadata = {
  title:       'iCube ISP Platform',
  description: 'Manage your WiFi hotspots, vouchers, and customers from anywhere.',
  manifest:    '/manifest.json',
  appleWebApp: {
    capable:       true,
    title:         'iCube',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon:  [
      { url: '/logo-icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png',  sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png',  sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icon-192.png',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor:     '#1D9E75',
  width:          'device-width',
  initialScale:   1,
  maximumScale:   1,
  userScalable:   false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" style={{ background: '#080808' }}>
      <head>
        <link rel="icon" href="/logo-icon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1D9E75" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="iCube" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body style={{ background: 'var(--bg-primary)', margin: 0, minHeight: '100vh' }}>
      <ThemeProvider>{children}</ThemeProvider>
    </body>
    </html>
  );
}
