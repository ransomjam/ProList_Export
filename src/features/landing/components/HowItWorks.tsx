// Landing page how it works section

import { Card, CardContent } from '@/components/ui/card';
import { Plus, FileText, Download } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Plus,
    title: 'Create shipment',
    description: 'Enter your shipment details including destination, products, and buyer information.',
    color: 'text-primary',
  },
  {
    number: '02',
    icon: FileText,
    title: 'See required documents',
    description: 'Our system automatically determines which documents are required based on your shipment.',
    color: 'text-accent-blue',
  },
  {
    number: '03',
    icon: Download,
    title: 'Download & share',
    description: 'Generate PDF documents instantly and share them securely with your team and partners.',
    color: 'text-accent-green',
  },
];

export const HowItWorks = () => {
  return (
    <section className="section-professional">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-20">
          <h2 className="text-headline text-foreground mb-6">
            How it works
          </h2>
          <p className="text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Get from shipment details to compliance documents in three simple steps.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connection line - hidden on mobile */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-16 left-full w-full h-px bg-border -translate-x-6 z-0">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-border rounded-full" />
                </div>
              )}

              <Card className="relative z-10 card-professional card-hover border-0">
                <CardContent className="p-10 text-center">
                  <div className="mb-8">
                    <div className="inline-flex p-5 rounded-2xl bg-background shadow-elevated">
                      <step.icon className={`h-10 w-10 ${step.color}`} />
                    </div>
                  </div>
                  
                  <div className={`text-sm font-bold ${step.color} mb-3 tracking-wide`}>
                    STEP {step.number}
                  </div>
                  
                  <h3 className="text-2xl font-bold text-foreground mb-5">
                    {step.title}
                  </h3>
                  
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};