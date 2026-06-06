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
import '@/components/marketing/marketing.css';

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <Stats />
        <Features />
        <HowItWorks />
        <Comparison />
        <Pricing />
        <Testimonials />
        <CTABanner />
      </main>
      <Footer />
    </>
  );
}
