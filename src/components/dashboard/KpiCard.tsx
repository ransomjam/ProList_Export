// KPI card component for dashboard

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import * as Icons from 'lucide-react';
import type { KPI } from '@/mocks/seeds';

interface KpiCardProps {
  kpi: KPI;
}

export const KpiCard = ({ kpi }: KpiCardProps) => {
  // Dynamically get the icon component
  const IconComponent = Icons[kpi.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>;

  return (
    <Card className="card-hover">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {kpi.label}
            </p>
            <p className="text-2xl font-bold text-foreground">
              {kpi.value}
            </p>
          </div>
          <div className="p-3 bg-primary-light rounded-2xl">
            {IconComponent && <IconComponent className="h-6 w-6 text-primary" />}
          </div>
        </div>
        <div className="mt-4">
          <Badge variant="secondary" className="text-xs">
            {kpi.trend}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};