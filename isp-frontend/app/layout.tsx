import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ISP Platform',
  description: 'Full-stack ISP & hotspot management platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
