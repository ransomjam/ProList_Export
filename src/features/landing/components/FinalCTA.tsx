// Landing page final call-to-action section

import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const FinalCTA = () => {
  const benefits = [
    'No setup required',
    'Start generating documents immediately',
    'Full access to all features',
    'No credit card needed',
  ];

  return (
    <section className="section-professional bg-gradient-to-r from-primary via-accent-blue to-primary relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-black/5 to-transparent" />
      <div className="container mx-auto px-4 max-w-7xl relative">
        <div className="text-center text-white">
          <h2 className="text-headline mb-6">
            Start your free demo — no setup required
          </h2>
          <p className="mx-auto mb-10 max-w-3xl text-lg leading-relaxed opacity-95 sm:mb-12 sm:text-xl lg:text-2xl">
            Experience the power of automated export compliance.
            Create your first shipment and generate documents in minutes.
          </p>

          <div className="mb-12 flex flex-col justify-center gap-4 sm:mb-16 sm:flex-row sm:gap-6">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-primary hover:bg-white/90 px-8 py-4 text-base font-semibold shadow-prominent hover:shadow-hero"
              asChild
            >
              <Link to="/login">
                Start Free Demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 px-8 py-4 text-base font-semibold border-2"
              asChild
            >
              <Link to="/app">Preview Dashboard</Link>
            </Button>
          </div>

          <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-accent-mint flex-shrink-0" />
                <span className="opacity-90">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};