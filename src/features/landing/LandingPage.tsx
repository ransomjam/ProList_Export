// Complete landing page

import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ValueProps } from './components/ValueProps';
import { HowItWorks } from './components/HowItWorks';
import { SocialProof } from './components/SocialProof';
import { FinalCTA } from './components/FinalCTA';
import { Footer } from './components/Footer';

export const LandingPage = () => {
  return (
    <div className="min-h-screen">
      {/* Skip to content for accessibility */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      
      <Navbar />
      
      <main id="main-content" className="hero-enter">
        <Hero />
        <ValueProps />
        <HowItWorks />
        <SocialProof />
        <FinalCTA />
      </main>
      
      <Footer />
    </div>
  );
};