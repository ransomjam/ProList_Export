// Landing page hero section

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, FileText, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Hero = () => {
  return (
    <section className="relative section-professional overflow-hidden">
      {/* Enhanced background gradient */}
      <div className="absolute inset-0 bg-gradient-hero -z-10" />
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] -z-10" />
      
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Content */}
          <div className="hero-content">
            <Badge variant="secondary" className="mb-8 shadow-soft">
              🚀 Now in Beta - Start Free Demo
            </Badge>
            
            <h1 className="text-display text-foreground mb-8 leading-tight">
              Generate export compliance documents{' '}
              <span className="bg-gradient-to-r from-primary to-accent-blue bg-clip-text text-transparent">
                in minutes
              </span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-muted-foreground mb-10 leading-relaxed max-w-2xl">
              A fully automated workspace for cross-border compliance — create shipments, 
              get required documents, and stay audit-ready.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 mb-16">
              <Button size="lg" className="px-8 py-4 text-base font-semibold shadow-elevated hover:shadow-prominent" asChild>
                <Link to="/login">
                  Start Demo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="px-8 py-4 text-base font-semibold border-2" asChild>
                <Link to="/app">Preview Dashboard</Link>
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-accent-green" />
                <span>No setup required</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent-blue" />
                <span>Ready in 2 minutes</span>
              </div>
            </div>
          </div>

          {/* Visual */}
          <div className="hero-visual">
            <Card className="p-8 shadow-hero card-professional backdrop-blur-sm">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Recent Shipments</h3>
                  <Badge variant="secondary">Live Demo</Badge>
                </div>
                
                <div className="space-y-3">
                  {[
                    { ref: 'PL-2025-EX-0001', buyer: 'EuroFoods SARL', status: 'draft', value: '54.0M FCFA' },
                    { ref: 'PL-2025-EX-0002', buyer: 'Nordic Trade AB', status: 'submitted', value: '18.5M FCFA' },
                    { ref: 'PL-2025-EX-0003', buyer: 'Mediterraneo SpA', status: 'cleared', value: '33.3M FCFA' },
                  ].map((shipment, index) => (
                    <div 
                      key={shipment.ref} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      style={{ animationDelay: `${index * 150}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-sm">{shipment.ref}</div>
                          <div className="text-xs text-muted-foreground">{shipment.buyer}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={shipment.status === 'cleared' ? 'default' : 'secondary'}
                          className={`mb-1 ${
                            shipment.status === 'cleared' ? 'status-cleared' : 
                            shipment.status === 'submitted' ? 'status-submitted' : 
                            'status-draft'
                          }`}
                        >
                          {shipment.status}
                        </Badge>
                        <div className="text-xs font-medium">{shipment.value}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-border">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-primary">1</div>
                      <div className="text-xs text-muted-foreground">Draft</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-accent-blue">1</div>
                      <div className="text-xs text-muted-foreground">Submitted</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-accent-green">1</div>
                      <div className="text-xs text-muted-foreground">Cleared</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};