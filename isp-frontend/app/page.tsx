import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import '@/components/marketing/marketing.css';
import Navbar from '@/components/marketing/Navbar';
import Hero from '@/components/marketing/Hero';
import TrustBar from '@/components/marketing/TrustBar';
import Stats from '@/components/marketing/Stats';
import Features from '@/components/marketing/Features';
import HowItWorks from '@/components/marketing/HowItWorks';
import Comparison from '@/components/marketing/Comparison';
import Pricing from '@/components/marketing/Pricing';
import Testimonials from '@/components/marketing/Testimonials';
import CTABanner from '@/components/marketing/CTABanner';
import Footer from '@/components/marketing/Footer';

export default function Home() {
  const host = headers().get('host') || '';

  // Platform domain (web.icubeug.net) — send straight to the app
  if (host.startsWith('web.')) {
    redirect('/admin');
  }

  // Marketing domain (icubeug.net / www.icubeug.net) — show the homepage
  return (
    <>
      <Navbar />
      <Hero />
      <TrustBar />
      <Stats />
      <Features />
      <HowItWorks />
      <Comparison />
      <Pricing />
      <Testimonials />
      <CTABanner />
      <Footer />
    </>
  );
}
