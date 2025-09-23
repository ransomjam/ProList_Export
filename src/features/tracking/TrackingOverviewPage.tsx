import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  addDays,
  differenceInCalendarDays,
  format,
  formatDistanceToNow,
  isAfter,
  isBefore,
  isWithinInterval,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
} from 'date-fns';
import { mockApi } from '@/mocks/api';
import type { ShipmentWithItems } from '@/mocks/seeds';
import { seedShipments } from '@/mocks/seeds';
import {
  listTrackingProfiles,
  type TrackingProfile,
  type TrackingExceptionSeed,
} from '@/features/shipments/trackingDemoData';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  ArrowUpRight,
  Filter,
  LayoutGrid,
  List,
  Map as MapIcon,
  Plane,
  Ship,
  Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterState {
  search: string;
  mode: 'ALL' | 'SEA' | 'AIR' | 'ROAD';
  carrier: 'ALL' | string;
  windowType: 'arriving' | 'departing';
  windowRange: 'today' | 'next7' | 'next14' | 'month';
  exceptionsOnly: boolean;
  lane: string | null;
}

type BoardColumnKey =
  | 'planned'
  | 'inTransit'
  | 'arriving'
  | 'arrivedPod'
  | 'delivered';

type BoardColumn = {
  key: BoardColumnKey;
  title: string;
  subtitle: string;
};

type AugmentedTracking = TrackingProfile & {
  shipment: ShipmentWithItems | undefined;
  boardStatus: BoardColumnKey;
  boardLabel: string;
  etaDate?: Date;
  etdDate?: Date;
  arrivalDate?: Date;
  deliveryDate?: Date;
  progress: number;
  latestTimestamp: Date | undefined;
  hasException: boolean;
  upcomingMilestoneCopy: string | null;
  timingCopy: string | null;
  etaVarianceCopy: string | null;
};

type ExceptionListItem = {
  id: string;
  severity: TrackingExceptionSeed['severity'];
  message: string;
  occurredAt?: Date;
  shipmentRef: string;
  shipmentId: string;
};

const defaultFilters: FilterState = {
  search: '',
  mode: 'ALL',
  carrier: 'ALL',
  windowType: 'arriving',
  windowRange: 'next7',
  exceptionsOnly: false,
  lane: null,
};

const columnConfig: BoardColumn[] = [
  { key: 'planned', title: 'Planned', subtitle: 'Bookings confirmed, awaiting departure' },
  { key: 'inTransit', title: 'In transit', subtitle: 'Moving between origin and destination' },
  { key: 'arriving', title: 'Arriving ≤7d', subtitle: 'Landing or docking this week' },
  { key: 'arrivedPod', title: 'Arrived POD', subtitle: 'On ground, pending final delivery' },
  { key: 'delivered', title: 'Delivered', subtitle: 'Completed with proof of delivery' },
];

const statusTone: Record<string, string> = {
  Planned: 'bg-sky-50 text-sky-700 border border-sky-200',
  'In transit': 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  Exception: 'bg-amber-50 text-amber-700 border border-amber-200',
  Delivered: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
};

const severityTone: Record<TrackingExceptionSeed['severity'], string> = {
  low: 'bg-muted text-muted-foreground border border-muted-foreground/20',
  medium: 'bg-amber-50 text-amber-700 border border-amber-200',
  high: 'bg-rose-50 text-rose-700 border border-rose-200',
};

const severityWeight: Record<TrackingExceptionSeed['severity'], number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const formatDate = (value?: Date, fallback = '—') => {
  if (!value || Number.isNaN(value.getTime())) {
    return fallback;
  }
  return format(value, 'd MMM');
};

const parseDate = (value?: string | null) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const computeBoardStatus = (
  profile: TrackingProfile,
  now: Date,
): {
  key: BoardColumnKey;
  etaDate?: Date;
  etdDate?: Date;
  arrivalDate?: Date;
  deliveryDate?: Date;
} => {
  const etaDate = parseDate(profile.eta?.etaDate ?? profile.plannedDates?.eta);
  const etdDate = parseDate(profile.plannedDates?.etd);
  const arrivalMilestone = profile.milestones.find(m => m.label.toLowerCase().includes('arrived pod'));
  const arrivalDate = arrivalMilestone?.actualAt ? parseDate(arrivalMilestone.actualAt) : undefined;
  const deliveredMilestone = profile.milestones.find(m => m.label.toLowerCase().includes('delivered'));
  const deliveryDate = deliveredMilestone?.actualAt ? parseDate(deliveredMilestone.actualAt) : undefined;

  if (deliveryDate && isBefore(deliveryDate, now)) {
    return { key: 'delivered', etaDate, etdDate, arrivalDate, deliveryDate };
  }

  if (arrivalDate && isBefore(arrivalDate, now)) {
    return { key: 'arrivedPod', etaDate, etdDate, arrivalDate, deliveryDate };
  }

  if (etaDate && !isBefore(etaDate, now) && differenceInCalendarDays(etaDate, now) <= 7) {
    return { key: 'arriving', etaDate, etdDate, arrivalDate, deliveryDate };
  }

  if (etdDate && isAfter(etdDate, now)) {
    return { key: 'planned', etaDate, etdDate, arrivalDate, deliveryDate };
  }

  return { key: 'inTransit', etaDate, etdDate, arrivalDate, deliveryDate };
};

const getModeIcon = (mode: TrackingProfile['mode']) => {
  switch (mode) {
    case 'AIR':
      return Plane;
    case 'ROAD':
      return Truck;
    case 'SEA':
    default:
      return Ship;
  }
};

const computeProgress = (profile: TrackingProfile) => {
  if (!profile.milestones?.length) {
    return 0;
  }
  const completed = profile.milestones.filter(m => m.actualAt).length;
  return Math.round((completed / profile.milestones.length) * 100);
};

const computeNextMilestoneCopy = (profile: TrackingProfile, now: Date) => {
  const nextMilestone = profile.milestones.find(m => !m.actualAt);
  if (!nextMilestone) {
    return null;
  }
  const plannedAt = parseDate(nextMilestone.plannedAt);
  if (!plannedAt) {
    return nextMilestone.label;
  }
  if (isBefore(plannedAt, now)) {
    const daysLate = Math.max(1, differenceInCalendarDays(now, plannedAt));
    return `Late: +${daysLate} day${daysLate > 1 ? 's' : ''} vs plan`;
  }
  const distance = formatDistanceToNow(plannedAt, { addSuffix: false });
  return `${nextMilestone.label} in ${distance}`;
};

const computeEtaCopy = (etaDate: Date | undefined, now: Date) => {
  if (!etaDate) return null;
  if (differenceInCalendarDays(etaDate, now) === 0) {
    return 'Arriving today';
  }
  if (isAfter(etaDate, now)) {
    const daysAway = differenceInCalendarDays(etaDate, now);
    if (daysAway <= 7) {
      return `Arriving in ${daysAway} day${daysAway === 1 ? '' : 's'}`;
    }
    return `Arriving ${formatDistanceToNow(etaDate, { addSuffix: true })}`;
  }
  const daysLate = Math.max(1, differenceInCalendarDays(now, etaDate));
  return `Late: +${daysLate} day${daysLate > 1 ? 's' : ''} vs plan`;
};

const computeDepartureCopy = (etdDate: Date | undefined, now: Date) => {
  if (!etdDate) return null;
  if (differenceInCalendarDays(etdDate, now) === 0) {
    return 'Departing today';
  }
  if (isAfter(etdDate, now)) {
    const daysAway = differenceInCalendarDays(etdDate, now);
    return `Departing in ${daysAway} day${daysAway === 1 ? '' : 's'}`;
  }
  const daysLate = Math.max(1, differenceInCalendarDays(now, etdDate));
  return `Departure overdue by ${daysLate} day${daysLate > 1 ? 's' : ''}`;
};

const applyWindowFilter = (shipment: AugmentedTracking, filters: FilterState, now: Date) => {
  const { windowType, windowRange } = filters;
  const referenceDate = windowType === 'departing' ? shipment.etdDate : shipment.etaDate;
  if (!referenceDate) {
    return true;
  }

  let range: { start: Date; end: Date } | null = null;

  switch (windowRange) {
    case 'today': {
      range = { start: startOfDay(now), end: endOfDay(now) };
      break;
    }
    case 'next7': {
      range = { start: startOfDay(now), end: endOfDay(addDays(now, 7)) };
      break;
    }
    case 'next14': {
      range = { start: startOfDay(now), end: endOfDay(addDays(now, 14)) };
      break;
    }
    case 'month': {
      range = { start: startOfMonth(now), end: endOfMonth(now) };
      break;
    }
    default:
      range = null;
  }

  if (!range) {
    return true;
  }

  return isWithinInterval(referenceDate, range);
};

const deriveLegendStatus = (profile: TrackingProfile) => {
  if (profile.status === 'Exception') {
    return 'Exception';
  }
  if (profile.status === 'Delivered') {
    return 'Delivered';
  }
  if (profile.status === 'Planned') {
    return 'Planned';
  }
  return 'In transit';
};

export const TrackingOverviewPage = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [filtersDraft, setFiltersDraft] = useState<FilterState>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(defaultFilters);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const now = useMemo(() => new Date(), []);

  const { data: shipments = [] } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => mockApi.listShipments(),
  });

  const trackingProfiles = useMemo(() => listTrackingProfiles(), []);

  const shipmentsMap = useMemo(() => {
    const map = new Map<string, ShipmentWithItems>();
    seedShipments.forEach(shipment => {
      map.set(shipment.id, shipment);
    });
    shipments.forEach(shipment => {
      map.set(shipment.id, shipment);
    });
    return map;
  }, [shipments]);

  const augmented = useMemo<AugmentedTracking[]>(() => {
    return trackingProfiles.map(profile => {
      const shipment = shipmentsMap.get(profile.shipmentId);
      const boardInfo = computeBoardStatus(profile, now);
      const progress = computeProgress(profile);
      const upcomingMilestoneCopy = computeNextMilestoneCopy(profile, now);
      const timingCopy =
        boardInfo.key === 'planned'
          ? computeDepartureCopy(boardInfo.etdDate, now)
          : computeEtaCopy(boardInfo.etaDate, now);
      const latestTimestamp = parseDate(profile.lastUpdated ?? profile.eta?.etaDate ?? profile.plannedDates?.eta);
      const etaVarianceCopy = profile.eta?.variance ?? null;

      return {
        ...profile,
        shipment,
        boardStatus: boardInfo.key,
        boardLabel:
          boardInfo.key === 'planned'
            ? 'Planned'
            : boardInfo.key === 'inTransit'
            ? 'In transit'
            : boardInfo.key === 'arriving'
            ? 'Arriving ≤7d'
            : boardInfo.key === 'arrivedPod'
            ? 'Arrived POD'
            : 'Delivered',
        etaDate: boardInfo.etaDate,
        etdDate: boardInfo.etdDate,
        arrivalDate: boardInfo.arrivalDate,
        deliveryDate: boardInfo.deliveryDate,
        progress,
        latestTimestamp,
        hasException: profile.exceptions?.length > 0,
        upcomingMilestoneCopy,
        timingCopy,
        etaVarianceCopy,
      };
    });
  }, [trackingProfiles, shipmentsMap, now]);

  const carriers = useMemo(() => {
    const unique = new Set<string>();
    trackingProfiles.forEach(profile => {
      if (profile.carrier?.name) {
        unique.add(profile.carrier.name);
      }
    });
    return Array.from(unique).sort();
  }, [trackingProfiles]);

  const filteredShipments = useMemo(() => {
    return augmented
      .filter(item => {
        if (!item.shipment) return false;
        const { shipment } = item;
        const matchesSearch = [shipment.reference, shipment.buyer]
          .join(' ')
          .toLowerCase()
          .includes(appliedFilters.search.trim().toLowerCase());
        if (!matchesSearch) return false;

        const matchesMode =
          appliedFilters.mode === 'ALL' || shipment.mode === appliedFilters.mode;
        if (!matchesMode) return false;

        const matchesCarrier =
          appliedFilters.carrier === 'ALL' || item.carrier.name === appliedFilters.carrier;
        if (!matchesCarrier) return false;

        if (appliedFilters.exceptionsOnly && !item.hasException) {
          return false;
        }

        if (appliedFilters.lane) {
          const lane = `${shipment.route}`.trim();
          if (lane !== appliedFilters.lane) {
            return false;
          }
        }

        if (!applyWindowFilter(item, appliedFilters, now)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const aTime = a.latestTimestamp ? a.latestTimestamp.getTime() : 0;
        const bTime = b.latestTimestamp ? b.latestTimestamp.getTime() : 0;
        return bTime - aTime;
      });
  }, [augmented, appliedFilters, now]);

  const kpiCounts = useMemo(() => {
    const inTransit = filteredShipments.filter(item => item.boardStatus === 'inTransit').length;
    const arrivingSoon = filteredShipments.filter(item => item.boardStatus === 'arriving').length;
    const runningLate = filteredShipments.filter(item => {
      if (!item.etaDate) return false;
      return isBefore(item.etaDate, now) && item.boardStatus !== 'delivered';
    }).length;
    const exceptions = filteredShipments.filter(item => item.hasException).length;

    return {
      inTransit,
      arrivingSoon,
      runningLate,
      exceptions,
    };
  }, [filteredShipments, now]);

  const exceptionsList = useMemo<ExceptionListItem[]>(() => {
    const items: ExceptionListItem[] = [];
    filteredShipments.forEach(item => {
      item.exceptions?.forEach(exception => {
        items.push({
          id: exception.id,
          severity: exception.severity,
          message: exception.message,
          occurredAt: parseDate(exception.occurredAt),
          shipmentRef: item.shipment?.reference ?? item.shipmentId,
          shipmentId: item.shipmentId,
        });
      });
    });

    return items
      .sort((a, b) => {
        const severityDiff = severityWeight[b.severity] - severityWeight[a.severity];
        if (severityDiff !== 0) {
          return severityDiff;
        }
        const aTime = a.occurredAt ? a.occurredAt.getTime() : 0;
        const bTime = b.occurredAt ? b.occurredAt.getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 6);
  }, [filteredShipments]);

  const availableLanes = useMemo(() => {
    const lanes = new Set<string>();
    augmented.forEach(item => {
      if (item.shipment?.route) {
        lanes.add(item.shipment.route);
      }
    });
    return Array.from(lanes).sort();
  }, [augmented]);

  const handleApplyFilters = () => {
    setAppliedFilters(filtersDraft);
    setMobileFiltersOpen(false);
  };

  const handleResetFilters = () => {
    setFiltersDraft(defaultFilters);
    setAppliedFilters(defaultFilters);
    setMobileFiltersOpen(false);
  };

  const handleExceptionsToggle = (checked: boolean) => {
    setFiltersDraft(prev => ({ ...prev, exceptionsOnly: checked }));
    setAppliedFilters(prev => ({ ...prev, exceptionsOnly: checked }));
  };

  const handleLaneToggle = (lane: string) => {
    setFiltersDraft(prev => ({ ...prev, lane: prev.lane === lane ? null : lane }));
    setAppliedFilters(prev => ({ ...prev, lane: prev.lane === lane ? null : lane }));
  };

  const renderFilters = (isMobile = false) => (
    <div className={cn('flex flex-col gap-4', isMobile ? 'pb-4' : 'md:flex-row md:items-end md:gap-6')}> 
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
        <div>
          <label className="text-xs uppercase tracking-wide text-muted-foreground block mb-2">
            Search (ref / buyer)
          </label>
          <Input
            placeholder="PL-2025-EX-0008"
            value={filtersDraft.search}
            onChange={event =>
              setFiltersDraft(prev => ({ ...prev, search: event.target.value }))
            }
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-muted-foreground block mb-2">
            Mode
          </label>
          <ToggleGroup
            type="single"
            value={filtersDraft.mode}
            onValueChange={value =>
              value && setFiltersDraft(prev => ({ ...prev, mode: value as FilterState['mode'] }))
            }
            className="w-full"
          >
            <ToggleGroupItem value="ALL" className="flex-1">All</ToggleGroupItem>
            <ToggleGroupItem value="SEA" className="flex-1">Sea</ToggleGroupItem>
            <ToggleGroupItem value="AIR" className="flex-1">Air</ToggleGroupItem>
            <ToggleGroupItem value="ROAD" className="flex-1">Road</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-muted-foreground block mb-2">
            Carrier
          </label>
          <Select
            value={filtersDraft.carrier}
            onValueChange={value =>
              setFiltersDraft(prev => ({ ...prev, carrier: value as FilterState['carrier'] }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All carriers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All carriers</SelectItem>
              {carriers.map(carrier => (
                <SelectItem key={carrier} value={carrier}>
                  {carrier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground block mb-2">
              Window
            </label>
            <Select
              value={filtersDraft.windowType}
              onValueChange={value =>
                setFiltersDraft(prev => ({ ...prev, windowType: value as FilterState['windowType'] }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="arriving">Arriving</SelectItem>
                <SelectItem value="departing">Departing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-muted-foreground block mb-2">
              Range
            </label>
            <Select
              value={filtersDraft.windowRange}
              onValueChange={value =>
                setFiltersDraft(prev => ({ ...prev, windowRange: value as FilterState['windowRange'] }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="next7">Next 7</SelectItem>
                <SelectItem value="next14">Next 14</SelectItem>
                <SelectItem value="month">This month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Switch
            id={isMobile ? 'exceptions-mobile' : 'exceptions-desktop'}
            checked={filtersDraft.exceptionsOnly}
            onCheckedChange={handleExceptionsToggle}
          />
          <div>
            <label htmlFor={isMobile ? 'exceptions-mobile' : 'exceptions-desktop'} className="text-sm font-medium text-foreground">
              Show exceptions only
            </label>
            <p className="text-xs text-muted-foreground">Instantly focus on problem shipments</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleResetFilters}>
            Reset
          </Button>
          <Button onClick={handleApplyFilters}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  );

  const renderBoard = () => {
    const byColumn = columnConfig.map(column => ({
      ...column,
      shipments: filteredShipments.filter(item => item.boardStatus === column.key),
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 2xl:grid-cols-5">
          {byColumn.map(column => (
            <div key={column.key} className="rounded-2xl border border-border bg-muted/10 p-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-foreground">{column.title}</h3>
                <p className="text-xs text-muted-foreground">{column.subtitle}</p>
              </div>
              <div className="space-y-3">
                {column.shipments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                    Nothing here yet.
                  </div>
                ) : (
                  column.shipments.map(item => {
                    const ModeIcon = getModeIcon(item.mode);
                    const lane = item.shipment?.route ?? '—';
                    const reference = item.shipment?.reference ?? item.shipmentId;
                    const buyer = item.shipment?.buyer ?? '—';
                    const etaLabel = item.boardStatus === 'planned' ? item.etdDate : item.etaDate;
                    const legendStatus = deriveLegendStatus(item);
                    const exceptionLabel = item.exceptions?.[0]?.message;

                    return (
                      <div
                        key={`${item.shipmentId}-${column.key}`}
                        className="rounded-2xl border border-border bg-card/80 p-4 shadow-sm transition hover:border-primary/60 hover:shadow-md"
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/shipments/${item.shipmentId}?tab=tracking`)}
                        onKeyDown={event => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            navigate(`/shipments/${item.shipmentId}?tab=tracking`);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-muted-foreground">{reference}</p>
                            <p className="text-base font-semibold text-foreground">{buyer}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={event => {
                              event.stopPropagation();
                              navigate(`/shipments/${item.shipmentId}?tab=tracking`);
                            }}
                          >
                            Open tracking
                            <ArrowUpRight className="ml-1 h-4 w-4" />
                          </Button>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                          <ModeIcon className="h-4 w-4 text-primary" />
                          <span>{lane}</span>
                          <span>•</span>
                          <span>{item.carrier?.name}</span>
                        </div>
                        <div className="mt-4">
                          <Progress value={item.progress} className="h-1.5" />
                          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span>{item.progress}% complete</span>
                            <span>{item.upcomingMilestoneCopy ?? 'Milestones on track'}</span>
                          </div>
                        </div>
                        <TooltipProvider>
                          <div className="mt-4 flex items-center justify-between text-sm">
                            <Tooltip>
                              <TooltipTrigger className="flex items-center gap-2 text-foreground">
                                <span className="font-medium">{item.boardStatus === 'planned' ? 'ETD' : 'ETA'}:</span>
                                <span>{formatDate(etaLabel)}</span>
                              </TooltipTrigger>
                              {item.etaVarianceCopy ? (
                                <TooltipContent>{item.etaVarianceCopy}</TooltipContent>
                              ) : null}
                            </Tooltip>
                            <Badge className={cn('text-xs font-medium', statusTone[legendStatus] ?? '')}>
                              {legendStatus}
                            </Badge>
                          </div>
                        </TooltipProvider>
                        <p className="mt-1 text-xs text-muted-foreground">{item.timingCopy ?? 'Timeline to be confirmed'}</p>
                        {exceptionLabel ? (
                          <div className="mt-3 flex items-center gap-2">
                            <Badge className="bg-rose-50 text-rose-700 border border-rose-200">
                              Exception
                            </Badge>
                            <span className="text-xs text-rose-700">{exceptionLabel}</span>
                          </div>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {item.keyIds?.map(id => (
                            <span key={`${id.label}-${id.value}`} className="rounded-full bg-muted px-2 py-1">
                              {id.label}: {id.value}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTable = () => (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Shipments list</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sortable list of live milestones and exceptions
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ref</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>ETD</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Exceptions</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShipments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-10 text-center text-sm text-muted-foreground">
                    No shipments match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredShipments.map(item => {
                  const reference = item.shipment?.reference ?? item.shipmentId;
                  const ModeIcon = getModeIcon(item.mode);
                  const legendStatus = deriveLegendStatus(item);
                  const exceptionCount = item.exceptions?.length ?? 0;

                  return (
                    <TableRow
                      key={`row-${item.shipmentId}`}
                      className="cursor-pointer"
                      onClick={() => navigate(`/shipments/${item.shipmentId}?tab=tracking`)}
                    >
                      <TableCell className="font-medium text-foreground">{reference}</TableCell>
                      <TableCell>{item.shipment?.buyer ?? '—'}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          <ModeIcon className="h-4 w-4 text-primary" />
                          {item.mode}
                        </span>
                      </TableCell>
                      <TableCell>{item.carrier?.name}</TableCell>
                      <TableCell>{item.shipment?.route ?? '—'}</TableCell>
                      <TableCell>{formatDate(item.etdDate)}</TableCell>
                      <TableCell>{formatDate(item.etaDate)}</TableCell>
                      <TableCell>
                        <Badge className={cn('text-xs font-medium', statusTone[legendStatus] ?? '')}>
                          {legendStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {exceptionCount > 0 ? (
                          <Badge className="bg-rose-50 text-rose-700 border border-rose-200">
                            {exceptionCount} issue{exceptionCount > 1 ? 's' : ''}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.latestTimestamp ? format(item.latestTimestamp, 'd MMM HH:mm') : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={event => {
                            event.stopPropagation();
                            navigate(`/shipments/${item.shipmentId}?tab=tracking`);
                          }}
                        >
                          Open tracking
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Tracking</h1>
          <p className="text-muted-foreground">Live milestones, ETA, and exceptions across shipments.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {['Planned', 'In transit', 'Exception', 'Delivered'].map(label => (
            <span
              key={label}
              className={cn('inline-flex items-center rounded-full px-3 py-1 font-medium', statusTone[label] ?? 'bg-muted text-muted-foreground border border-border')}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="sticky top-14 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-y border-border">
        <div className="hidden md:block p-4">
          <div className="flex items-center gap-3 pb-4 text-sm font-medium text-foreground">
            <Filter className="h-4 w-4" /> Filters
          </div>
          {renderFilters(false)}
        </div>
        <div className="md:hidden p-4">
          <Button variant="outline" className="w-full" onClick={() => setMobileFiltersOpen(true)}>
            <Filter className="mr-2 h-4 w-4" /> Filters
          </Button>
        </div>
      </div>

      <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
          <SheetHeader className="space-y-1 text-left">
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>Search and refine live shipments.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            {renderFilters(true)}
          </div>
        </SheetContent>
      </Sheet>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/80 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">In transit</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{kpiCounts.inTransit}</p>
            <p className="text-xs text-muted-foreground">Actively moving shipments</p>
          </CardContent>
        </Card>
        <Card className="bg-card/80 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Arriving this week</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{kpiCounts.arrivingSoon}</p>
            <p className="text-xs text-muted-foreground">Due in the next 7 days</p>
          </CardContent>
        </Card>
        <Card className="bg-card/80 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Running late</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{kpiCounts.runningLate}</p>
            <p className="text-xs text-muted-foreground">Past ETA but not delivered</p>
          </CardContent>
        </Card>
        <Card className="bg-card/80 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">Exceptions</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{kpiCounts.exceptions}</p>
            <p className="text-xs text-muted-foreground">Shipments needing attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Tracking board</h2>
              <p className="text-sm text-muted-foreground">Monitor every milestone and jump into the right shipment fast.</p>
            </div>
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={value => value && setViewMode(value as 'board' | 'list')}
              className="border border-border rounded-full p-1"
            >
              <ToggleGroupItem value="board" className="rounded-full px-3">
                <LayoutGrid className="mr-2 h-4 w-4" /> Board
              </ToggleGroupItem>
              <ToggleGroupItem value="list" className="rounded-full px-3">
                <List className="mr-2 h-4 w-4" /> List
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {viewMode === 'board' ? renderBoard() : renderTable()}
        </div>

        <div className="space-y-6">
          <Card className="bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle>Exceptions</CardTitle>
              <p className="text-sm text-muted-foreground">Most urgent holds and delays</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {exceptionsList.length === 0 ? (
                <p className="text-sm text-muted-foreground">All clear. No exceptions in view.</p>
              ) : (
                exceptionsList.map(item => (
                  <div key={item.id} className="rounded-xl border border-border/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.message}</p>
                        <p className="text-xs text-muted-foreground">{item.shipmentRef}</p>
                        {item.occurredAt ? (
                          <p className="text-xs text-muted-foreground mt-1">
                            Logged {formatDistanceToNow(item.occurredAt, { addSuffix: true })}
                          </p>
                        ) : null}
                      </div>
                      <Badge className={cn('text-xs font-medium', severityTone[item.severity])}>
                        {item.severity === 'high'
                          ? 'High'
                          : item.severity === 'medium'
                          ? 'Medium'
                          : 'Low'}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                      <Button
                        variant="link"
                        size="sm"
                        className="px-0"
                        onClick={() => navigate(`/shipments/${item.shipmentId}?tab=tracking`)}
                      >
                        View
                      </Button>
                      <span className="text-muted-foreground">•</span>
                      <Button
                        variant="link"
                        size="sm"
                        className="px-0"
                        onClick={() => navigate('/issues')}
                      >
                        Create issue
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle>Global lanes</CardTitle>
              <p className="text-sm text-muted-foreground">Tap a corridor to focus the board.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-sky-100 via-background to-indigo-100 p-6 text-center text-sm text-muted-foreground">
                <MapIcon className="mx-auto h-16 w-16 text-sky-400 opacity-60" />
                <p className="mt-3 text-muted-foreground">Quiet global view — zoom into a lane below.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableLanes.map(lane => (
                  <button
                    key={lane}
                    type="button"
                    onClick={() => handleLaneToggle(lane)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-sm transition',
                      filtersDraft.lane === lane
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                    )}
                  >
                    {lane}
                  </button>
                ))}
              </div>
              {filtersDraft.lane ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2"
                  onClick={() => handleLaneToggle(filtersDraft.lane!)}
                >
                  Clear lane filter
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      {filteredShipments.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No shipments match your filters.
          </CardContent>
        </Card>
      )}
    </div>
  );
};
