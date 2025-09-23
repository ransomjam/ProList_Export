import { useEffect, useMemo, useState } from 'react';
import {
  format,
  formatDistanceToNow,
  parseISO,
  isBefore,
  differenceInCalendarDays,
} from 'date-fns';
import {
  AlertTriangle,
  Anchor,
  BadgeCheck,
  Boxes,
  CalendarDays,
  CheckCircle2,
  Circle,
  CircleDot,
  FileText,
  Link2,
  MapPin,
  Navigation2,
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  Route,
  ShieldCheck,
  Ship,
  Truck,
  Warehouse,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ShipmentWithItems } from '@/mocks/seeds';
import {
  getTrackingProfile,
  type TrackingActivitySeed,
  type TrackingMilestoneSeed,
  type TrackingProfile,
  type TrackingStatus,
  type TrackingExceptionSeed,
} from '../trackingDemoData';

const modeIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  SEA: Ship,
  AIR: Plane,
  ROAD: Truck,
};

const milestoneIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'gate-in': Warehouse,
  'cargo-received': Warehouse,
  'booking-confirmed': CalendarDays,
  'loaded-on-vessel': Boxes,
  'flight-departed': PlaneTakeoff,
  'flight-departed-dla': PlaneTakeoff,
  'flight-departed-addis': PlaneTakeoff,
  'flight-departed-douala': PlaneTakeoff,
  'vessel-departed': Ship,
  'transhipment': Route,
  'transit-addis': Navigation2,
  'arrived-pod': Anchor,
  'arrived-destination': PlaneLanding,
  'arrived-frankfurt': PlaneLanding,
  'arrived-berlin': PlaneLanding,
  'customs-cleared': ShieldCheck,
  'out-for-delivery': Truck,
  'delivered': BadgeCheck,
};

const severityTone: Record<TrackingExceptionSeed['severity'], string> = {
  low: 'border-sky-200 bg-sky-50 text-sky-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-800',
  high: 'border-rose-200 bg-rose-50 text-rose-700',
};

const statusTone: Record<TrackingStatus, string> = {
  Planned: 'border-slate-200 bg-slate-50 text-slate-700',
  'In transit': 'border-sky-200 bg-sky-50 text-sky-700',
  Exception: 'border-amber-200 bg-amber-50 text-amber-900',
  Delivered: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const milestoneChipTone = {
  planned: 'border-slate-200 bg-white text-slate-600',
  done: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  overdue: 'border-amber-200 bg-amber-50 text-amber-800',
};

type TrackingMilestone = TrackingMilestoneSeed;
type TrackingActivity = TrackingActivitySeed;

const formatDateTime = (value?: string) => {
  if (!value) return '';
  try {
    return format(parseISO(value), 'dd MMM yyyy · HH:mm');
  } catch (error) {
    return value;
  }
};

const formatDate = (value?: string) => {
  if (!value) return '';
  try {
    return format(parseISO(value), 'EEE d MMM');
  } catch (error) {
    return value;
  }
};

const formatRelative = (value?: string) => {
  if (!value) return '';
  try {
    return formatDistanceToNow(parseISO(value), { addSuffix: true });
  } catch (error) {
    return value;
  }
};

const computeDelayDays = (milestone: TrackingMilestone): number => {
  if (milestone.actualAt) return 0;
  if (typeof milestone.delayDays === 'number') return milestone.delayDays;
  try {
    const planned = parseISO(milestone.plannedAt);
    if (isBefore(planned, new Date())) {
      return Math.max(differenceInCalendarDays(new Date(), planned), 0);
    }
  } catch (error) {
    return 0;
  }
  return 0;
};

const computeStatus = (
  milestones: TrackingMilestone[],
  exceptions: TrackingExceptionSeed[],
  base: TrackingStatus
): TrackingStatus => {
  if (milestones.length > 0 && milestones.every(m => m.actualAt)) {
    return 'Delivered';
  }
  if (exceptions.some(exception => exception.severity === 'high')) {
    return 'Exception';
  }
  if (milestones.some(milestone => !milestone.actualAt && computeDelayDays(milestone) > 0)) {
    return 'Exception';
  }
  if (base === 'Planned' && milestones.some(milestone => milestone.actualAt)) {
    return 'In transit';
  }
  if (base === 'Delivered') {
    return 'Delivered';
  }
  return base;
};

const resolveMilestoneIcon = (
  milestone: TrackingMilestone
): React.ComponentType<{ className?: string }> => {
  if (milestoneIconMap[milestone.id]) {
    return milestoneIconMap[milestone.id];
  }
  if (milestone.label.toLowerCase().includes('flight')) {
    return Plane;
  }
  if (milestone.label.toLowerCase().includes('vessel')) {
    return Ship;
  }
  if (milestone.label.toLowerCase().includes('delivery')) {
    return Truck;
  }
  return Circle;
};

const getMilestoneChip = (milestone: TrackingMilestone) => {
  const delayDays = computeDelayDays(milestone);
  if (milestone.actualAt) {
    return (
      <Badge className={cn('px-3 py-1 text-xs font-semibold', milestoneChipTone.done)}>Done</Badge>
    );
  }
  if (delayDays > 0) {
    return (
      <Badge className={cn('px-3 py-1 text-xs font-semibold', milestoneChipTone.overdue)}>
        Overdue
      </Badge>
    );
  }
  return (
    <Badge className={cn('px-3 py-1 text-xs font-semibold', milestoneChipTone.planned)}>Planned</Badge>
  );
};

const getEtaStatusBadgeTone = (statusText: string, status: TrackingStatus) => {
  if (status === 'Delivered' || statusText === 'Delivered') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  if (status === 'Exception' || statusText.toLowerCase().includes('delayed')) {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }
  return 'border-sky-200 bg-sky-50 text-sky-700';
};

interface TrackingTabProps {
  shipment: ShipmentWithItems;
}

export const TrackingTab = ({ shipment }: TrackingTabProps) => {
  const profile = useMemo<TrackingProfile>(() => getTrackingProfile(shipment.id, shipment), [shipment]);

  const [status, setStatus] = useState<TrackingStatus>(profile.status);
  const [lastUpdated, setLastUpdated] = useState<string>(profile.lastUpdated);
  const [milestones, setMilestones] = useState<TrackingMilestone[]>(() =>
    profile.milestones.map(milestone => ({ ...milestone }))
  );
  const [eta, setEta] = useState(profile.eta);
  const [activity, setActivity] = useState<TrackingActivity[]>(() =>
    [...profile.activity].sort(
      (a, b) => parseISO(b.at).getTime() - parseISO(a.at).getTime()
    )
  );
  const [note, setNote] = useState('');

  useEffect(() => {
    setStatus(profile.status);
    setLastUpdated(profile.lastUpdated);
    setMilestones(profile.milestones.map(milestone => ({ ...milestone })));
    setEta(profile.eta);
    setActivity(
      [...profile.activity].sort(
        (a, b) => parseISO(b.at).getTime() - parseISO(a.at).getTime()
      )
    );
    setNote('');
  }, [profile]);

  const handleMarkDone = (milestoneId: string) => {
    const now = new Date().toISOString();
    setMilestones(prevMilestones => {
      const updatedMilestones = prevMilestones.map(milestone =>
        milestone.id === milestoneId ? { ...milestone, actualAt: now, delayDays: 0 } : milestone
      );
      const nextStatus = computeStatus(updatedMilestones, profile.exceptions, profile.status);
      setStatus(nextStatus);
      return updatedMilestones;
    });

    const currentMilestone = milestones.find(milestone => milestone.id === milestoneId);
    const milestoneLabel = currentMilestone?.label ?? 'Milestone';

    setEta(prevEta => ({
      ...prevEta,
      etaDate: milestoneId === 'delivered' ? now : prevEta.etaDate,
      variance: milestoneId === 'delivered' ? 'Confirmed' : prevEta.variance,
      statusText: milestoneId === 'delivered' ? 'Delivered' : prevEta.statusText,
      basedOn: `${milestoneLabel} — ${formatDateTime(now)}`,
    }));

    setActivity(prev => [
      {
        id: `manual-${milestoneId}-${now}`,
        actor: 'You',
        actorInitials: 'YOU',
        at: now,
        message: `Marked “${milestoneLabel}” as done.`,
        type: 'milestone',
      },
      ...prev,
    ]);

    setLastUpdated(now);
  };

  const handlePostNote = () => {
    const trimmed = note.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    setActivity(prev => [
      {
        id: `note-${now}`,
        actor: 'You',
        actorInitials: 'YOU',
        at: now,
        message: trimmed,
        type: 'note',
      },
      ...prev,
    ]);
    setNote('');
    setLastUpdated(now);
  };

  const modeIcon = modeIconMap[profile.mode] ?? Ship;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Tracking</h2>
          <p className="text-muted-foreground">Milestones, ETA, and transport details.</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
          <Badge className={cn('px-3 py-1.5 text-xs font-semibold uppercase tracking-wide', statusTone[status])}>
            {status}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Last updated {formatDateTime(lastUpdated)}
          </span>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Card className="order-3 xl:order-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Transport details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <modeIcon className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Mode</p>
                  <p className="text-lg font-semibold text-foreground">{profile.mode}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-muted-foreground/40 bg-muted text-sm font-semibold uppercase text-muted-foreground">
                  {profile.carrierLogoText}
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Carrier</p>
                  <p className="text-sm font-semibold text-foreground">{profile.carrier.name}</p>
                  {profile.carrier.code && (
                    <p className="text-xs text-muted-foreground">SCAC {profile.carrier.code}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">Key IDs</p>
                <div className="space-y-2">
                  {profile.keyIds.map(key => (
                    <div key={key.label} className="flex items-center justify-between rounded-lg border border-dashed border-muted p-2 text-sm">
                      <span className="text-muted-foreground">{key.label}</span>
                      <span className="font-medium text-foreground">{key.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">Transport plan</p>
                <div className="rounded-xl border border-muted bg-muted/40 p-4 text-sm">
                  {profile.vessel && (
                    <div className="mb-3 flex items-center gap-2">
                      <Ship className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">{profile.vessel}</span>
                    </div>
                  )}
                  {profile.flight && (
                    <div className="mb-3 flex items-center gap-2">
                      <Plane className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">{profile.flight}</span>
                    </div>
                  )}
                  {profile.vehicle && (
                    <div className="mb-3 flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">{profile.vehicle}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium text-foreground">{profile.route.origin}</span>
                    <span>→</span>
                    {profile.route.waypoints?.map(waypoint => (
                      <span key={waypoint.name} className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{waypoint.name}</span>
                        <span className="text-muted-foreground">•</span>
                      </span>
                    ))}
                    <span className="font-medium text-foreground">{profile.route.destination}</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {(
                [
                  { label: 'Gate in', value: profile.plannedDates.gateIn },
                  { label: 'ETD', value: profile.plannedDates.etd },
                  { label: 'ETA', value: profile.plannedDates.eta },
                  { label: 'Delivery', value: profile.plannedDates.delivery },
                ] as const
              ).map(item => (
                <div key={item.label} className="rounded-xl border border-muted bg-muted/30 p-3">
                  <p className="text-xs font-medium uppercase text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {item.value ? formatDateTime(item.value) : 'TBC'}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Attachments</p>
              <div className="flex flex-wrap gap-2">
                {profile.attachments.map(attachment => (
                  <Button
                    key={attachment.id}
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-full border-dashed bg-background"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {attachment.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">
                Edit transport details
              </Button>
              <Button variant="outline" size="sm">
                Add attachment
              </Button>
              <Button variant="ghost" size="sm" className="gap-2 text-primary">
                <Link2 className="h-4 w-4" />
                Link external tracking
              </Button>
              <Badge className="border border-dashed border-muted px-2 py-1 text-[11px] text-muted-foreground">
                Demo only
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="order-1 xl:order-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Milestones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-6">
              {milestones.map((milestone, index) => {
                const Icon = resolveMilestoneIcon(milestone);
                const delay = computeDelayDays(milestone);
                const isLast = index === milestones.length - 1;
                return (
                  <div key={milestone.id} className="relative pl-12">
                    {!isLast && (
                      <span className="absolute left-[22px] top-12 h-[calc(100%-8px)] w-px bg-muted" />
                    )}
                    <div
                      className={cn(
                        'absolute left-0 top-2 flex h-11 w-11 items-center justify-center rounded-full border bg-background shadow-sm',
                        milestone.actualAt
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : delay > 0
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-muted bg-background text-muted-foreground'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="rounded-xl border border-muted bg-card/60 p-4 shadow-sm">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">{milestone.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {(milestone.actualAt ? formatDateTime(milestone.actualAt) : formatDateTime(milestone.plannedAt)) || 'TBC'} · {milestone.location}
                          </p>
                          {milestone.actualAt ? (
                            <p className="text-xs font-medium text-emerald-600">Stamped manually • {formatRelative(milestone.actualAt)}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Planned for {formatDateTime(milestone.plannedAt)}
                              {delay > 0 && (
                                <span className="ml-2 font-semibold text-amber-600">+{delay} days</span>
                              )}
                            </p>
                          )}
                          {milestone.note && !milestone.actualAt && (
                            <p className="text-xs text-muted-foreground">{milestone.note}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 self-start md:self-auto">
                          {getMilestoneChip(milestone)}
                          {!milestone.actualAt && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-9 px-4"
                              onClick={() => handleMarkDone(milestone.id)}
                            >
                              Mark done
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="order-4 xl:order-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Route overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-dashed border-muted bg-gradient-to-br from-muted/40 via-background to-muted/60 p-6">
              <div className="relative">
                <div className="absolute left-6 right-6 top-[26px] h-px bg-muted" />
                <div className="flex justify-between">
                  {[profile.routeLine.origin, ...profile.routeLine.stops, profile.routeLine.destination].map(
                    point => {
                      const iconClass = cn(
                        'flex h-12 w-12 items-center justify-center rounded-full border bg-background shadow-sm',
                        point.status === 'completed'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : point.status === 'in_transit'
                            ? 'border-sky-200 bg-sky-50 text-sky-700'
                            : 'border-muted text-muted-foreground'
                      );
                      const Icon = point.status === 'completed'
                        ? CheckCircle2
                        : point.status === 'in_transit'
                          ? Navigation2
                          : CircleDot;
                      return (
                        <div key={`${point.code}-${point.name}`} className="flex flex-1 flex-col items-center text-center">
                          <div className={iconClass}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="mt-3 text-sm font-medium text-foreground">{point.name}</div>
                          <div className="text-xs text-muted-foreground">{point.code}</div>
                          {point.eta && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {point.status === 'completed' ? 'Completed ' : 'ETA '} {formatDate(point.eta)}
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
              <div className="mt-6 rounded-xl border border-muted bg-background/80 p-4 text-sm text-muted-foreground">
                {profile.route.originDetail} → {profile.route.destinationDetail} • {profile.routeLine.distance}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Path is an estimate for demo purposes.</p>
          </CardContent>
        </Card>

        <Card className="order-2 xl:order-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">ETA & exceptions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-2xl border border-muted bg-background/90 p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Estimated arrival</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {eta.etaDate ? formatDateTime(eta.etaDate) : 'Awaiting milestone'}
                  </p>
                  <p className="text-xs text-muted-foreground">{eta.variance}</p>
                </div>
                <Badge className={cn('px-3 py-1 text-xs font-semibold uppercase tracking-wide', getEtaStatusBadgeTone(eta.statusText, status))}>
                  {eta.statusText}
                </Badge>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Based on {eta.basedOn || 'latest milestone update'}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Exceptions</h4>
                <span className="text-xs text-muted-foreground">Escalate when severity rises</span>
              </div>
              <div className="space-y-3">
                {profile.exceptions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-muted bg-muted/30 p-4 text-sm text-muted-foreground">
                    No exceptions reported.
                  </div>
                ) : (
                  profile.exceptions.map(exception => (
                    <div
                      key={exception.id}
                      className={cn('rounded-xl border p-4 shadow-sm', severityTone[exception.severity])}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            <AlertTriangle className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{exception.message}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(exception.occurredAt)}
                            </p>
                            {exception.detail && (
                              <p className="mt-1 text-xs text-muted-foreground">{exception.detail}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="border border-white/60 bg-white/30 px-2 py-1 text-[11px] uppercase tracking-wide">
                            {exception.severity === 'low'
                              ? 'Low'
                              : exception.severity === 'medium'
                                ? 'Medium'
                                : 'High'}
                          </Badge>
                          <Button variant="link" size="sm" className="px-0 text-xs text-foreground">
                            Create issue
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="order-5 xl:order-3 xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Activity & notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-5">
              {activity.map(item => (
                <div key={item.id} className="flex items-start gap-3">
                  <Avatar className="h-9 w-9 border border-muted bg-muted/60 text-xs font-semibold uppercase text-muted-foreground">
                    <AvatarFallback>{item.actorInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-semibold text-foreground">{item.actor}</p>
                      <span className="text-xs text-muted-foreground">{formatDateTime(item.at)}</span>
                    </div>
                    <p className="text-sm text-foreground">{item.message}</p>
                  </div>
                </div>
              ))}
              {activity.length === 0 && (
                <div className="rounded-xl border border-dashed border-muted bg-muted/30 p-4 text-sm text-muted-foreground">
                  No tracking activity recorded yet.
                </div>
              )}
            </div>
            <Separator />
            <div className="space-y-3">
              <Textarea
                value={note}
                onChange={event => setNote(event.target.value)}
                placeholder="Add a quick note for your team…"
                rows={3}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Notes are internal to the export team.</span>
                <Button size="sm" onClick={handlePostNote} disabled={!note.trim()}>
                  Post
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
