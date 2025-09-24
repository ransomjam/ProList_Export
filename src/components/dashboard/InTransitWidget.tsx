import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  endOfWeek,
  format,
  isWithinInterval,
  parseISO,
  startOfWeek,
} from 'date-fns';
import { ArrowRight, AlertTriangle, MapPin } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import type { ShipmentWithItems } from '@/mocks/seeds';
import {
  getTrackingProfile,
  type TrackingProfile,
  type TrackingStatus,
} from '@/features/shipments/trackingDemoData';
import { cn } from '@/lib/utils';

const statusTone: Record<TrackingStatus, string> = {
  Planned: 'border-slate-200 bg-slate-50 text-slate-700',
  'In transit': 'border-sky-200 bg-sky-50 text-sky-700',
  Exception: 'border-amber-200 bg-amber-50 text-amber-800',
  Delivered: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

interface InTransitWidgetProps {
  shipments: ShipmentWithItems[];
  loading?: boolean;
  error?: unknown;
}

const formatEtaLabel = (value?: string) => {
  if (!value) return 'TBC';
  try {
    return format(parseISO(value), 'EEE d MMM');
  } catch (error) {
    return 'TBC';
  }
};

const computeCounters = (profiles: TrackingProfile[]) => {
  const active = profiles.filter(profile => profile.status === 'In transit' || profile.status === 'Exception');
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  const end = endOfWeek(new Date(), { weekStartsOn: 1 });
  const etaThisWeek = active.filter(profile => {
    if (!profile.eta.etaDate) return false;
    try {
      const etaDate = parseISO(profile.eta.etaDate);
      return isWithinInterval(etaDate, { start, end });
    } catch (error) {
      return false;
    }
  }).length;
  const exceptions = active.reduce((sum, profile) => sum + profile.exceptions.length, 0);
  return {
    shipments: active.length,
    etaThisWeek,
    exceptions,
    active,
  };
};

export const InTransitWidget = ({ shipments, loading, error }: InTransitWidgetProps) => {
  const profiles = useMemo(
    () => shipments.map(shipment => getTrackingProfile(shipment.id, shipment)),
    [shipments]
  );

  const { active, etaThisWeek, exceptions, shipments: shipmentCount } = useMemo(
    () => computeCounters(profiles),
    [profiles]
  );

  const rows = useMemo(() => {
    return active
      .slice()
      .sort((a, b) => {
        if (!a.eta.etaDate) return 1;
        if (!b.eta.etaDate) return -1;
        return parseISO(a.eta.etaDate).getTime() - parseISO(b.eta.etaDate).getTime();
      })
      .slice(0, 4)
      .map(profile => {
        const shipment = shipments.find(item => item.id === profile.shipmentId);
        const totalMilestones = profile.milestones.length || 1;
        const completed = profile.milestones.filter(milestone => milestone.actualAt).length;
        const progress = Math.round((completed / totalMilestones) * 100);
        const etaLabel = formatEtaLabel(profile.eta.etaDate);
        return { profile, shipment, progress, etaLabel };
      });
  }, [active, shipments]);

  if (error) {
    return null;
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-col items-start gap-2 space-y-0 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-lg font-semibold text-foreground">In transit</CardTitle>
        <Button variant="link" size="sm" className="px-0 text-sm" asChild>
          <Link to="/shipments?tab=tracking" className="inline-flex items-center gap-1 text-primary">
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16 rounded-xl" />
              ))}
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-20 rounded-xl" />
              ))}
            </div>
          </div>
        ) : shipmentCount === 0 ? (
          <div className="rounded-xl border border-dashed border-muted bg-muted/30 p-6 text-sm text-muted-foreground">
            All active shipments are up to date. Check back once new departures are recorded.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-muted bg-muted/40 p-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">Shipments</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{shipmentCount}</p>
              </div>
              <div className="rounded-xl border border-muted bg-muted/40 p-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">ETA this week</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{etaThisWeek}</p>
              </div>
              <div className="rounded-xl border border-muted bg-muted/40 p-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">Exceptions</p>
                <p className="mt-1 text-xl font-semibold text-foreground">{exceptions}</p>
              </div>
            </div>

            <div className="space-y-3">
              {rows.map(({ profile, shipment, progress, etaLabel }) => (
                <div key={profile.shipmentId} className="rounded-xl border border-muted/60 bg-background p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {shipment?.reference || profile.shipmentId}
                        </p>
                        <Badge className={cn('px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide', statusTone[profile.status])}>
                          {profile.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{shipment?.buyer}</p>
                      <p className="mt-1 inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {shipment?.route || 'Route pending'}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-semibold text-foreground">{etaLabel}</p>
                      <p className="text-xs text-muted-foreground">{profile.eta.variance}</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <Progress value={progress} className="h-1.5 bg-muted" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{progress}% complete</span>
                      {profile.exceptions.length > 0 && (
                        <Badge className="flex items-center gap-1 bg-amber-100 text-amber-800">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {profile.exceptions.length} exception
                          {profile.exceptions.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
