// Landing page value propositions section

import { Card, CardContent } from '@/components/ui/card';
import { FileCheck, Shield, Zap, Globe } from 'lucide-react';

const valueProps = [
  {
    icon: Zap,
    title: 'Document automation',
    description: 'Generate compliance documents automatically based on shipment details and destination requirements.',
    color: 'text-accent-blue',
  },
  {
    icon: Shield,
    title: 'Rules-driven checks',
    description: 'Built-in compliance rules ensure you never miss required documents or certificates.',
    color: 'text-accent-green',
  },
  {
    icon: FileCheck,
    title: 'Secure workspace',
    description: 'Centralized document management with audit trails and role-based access control.',
    color: 'text-accent-teal',
  },
  {
    icon: Globe,
    title: 'Cameroon-to-EU ready',
    description: 'Pre-configured for Cameroon export regulations and EU import requirements.',
    color: 'text-accent-mint',
  },
];

export const ValueProps = () => {
  return (
    <section className="section-professional section-alt">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-14 text-center sm:mb-16 lg:mb-20">
          <h2 className="text-headline text-foreground mb-6">
            Everything you need for export compliance
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground leading-relaxed sm:text-xl lg:text-2xl">
            Streamline your export operations with automated document generation,
            compliance checks, and secure collaboration.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          {valueProps.map((prop, index) => (
            <Card key={prop.title} className="card-professional card-hover group border-0">
              <CardContent className="p-6 sm:p-8">
                <div className="mb-6">
                  <div className={`inline-flex p-4 rounded-2xl bg-background shadow-soft group-hover:shadow-elevated transition-all duration-300`}>
                    <prop.icon className={`h-7 w-7 ${prop.color}`} />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-3">{prop.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {prop.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};