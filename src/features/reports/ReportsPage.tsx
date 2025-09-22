import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addDays,
  format,
  isSameDay,
  isWithinInterval,
  max,
  min,
  parseISO,
  startOfDay,
  startOfYear,
  subDays,
} from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coins,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Package,
  Search,
  Wallet2,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { abbreviateFcfa, formatFcfa } from '@/utils/currency';

import {
  reportDocuments,
  reportShipments,
  type Incoterm,
  type IssueStatus,
  type ReportDocument,
  type ReportShipment,
  type ShipmentMode,
  type ShipmentStatus,
} from './data';

const statusOptions: ShipmentStatus[] = ['draft', 'submitted', 'cleared'];
const modeOptions: ShipmentMode[] = ['SEA', 'AIR', 'ROAD'];
const incotermOptions: Incoterm[] = ['FOB', 'CIF', 'CIP'];

const datePresets = [
  { value: 'last30', label: 'Last 30 days' },
  { value: 'last90', label: 'Last 90 days' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'custom', label: 'Custom' },
] as const;

type DatePreset = typeof datePresets[number]['value'];

type ReportsFilters = {
  dateRange: { from: Date | null; to: Date | null };
  preset: DatePreset;
  statuses: ShipmentStatus[];
  modes: ShipmentMode[];
  destinations: string[];
  incoterms: Incoterm[];
};

type DrilldownState =
  | null
  | { type: 'status'; status: ShipmentStatus; monthKey: string; label: string }
  | { type: 'buyer'; buyer: string; label: string }
  | { type: 'docType'; docType: string; label: string }
  | { type: 'issueStatus'; issueStatus: IssueStatus; label: string }
  | { type: 'month'; monthKey: string; label: string };

type TableColumn = { key: string; label: string };

type CsvRow = Record<string, string | number>;

type MonthlyStatusData = {
  key: string;
  monthShort: string;
  monthLong: string;
  draft: number;
  submitted: number;
  cleared: number;
  total: number;
};

type MonthlyValueData = {
  key: string;
  monthShort: string;
  monthLong: string;
  value: number;
};

type BuyerValueData = {
  buyer: string;
  value: number;
};

type PieData = {
  name: string;
  value: number;
};

type ChartView = 'chart' | 'table';

type LinePointPayload = {
  payload?: {
    key: string;
    monthLong: string;
  };
};

const getStatusBadgeVariant = (status: ShipmentStatus) => {
  switch (status) {
    case 'cleared':
      return 'default';
    case 'submitted':
      return 'secondary';
    default:
      return 'outline';
  }
};

const getDateFromString = (value: string) => parseISO(value);

const computeDatasetBounds = (shipments: ReportShipment[]) => {
  const dates = shipments.map((shipment) => getDateFromString(shipment.updatedAt));
  return {
    min: min(dates),
    max: max(dates),
  };
};

const { min: datasetMinDate, max: datasetMaxDate } = computeDatasetBounds(reportShipments);

const clampDate = (date: Date) => {
  if (date < datasetMinDate) {
    return datasetMinDate;
  }
  if (date > datasetMaxDate) {
    return datasetMaxDate;
  }
  return date;
};

const createDefaultFilters = (): ReportsFilters => ({
  dateRange: {
    from: subDays(datasetMaxDate, 89),
    to: datasetMaxDate,
  },
  preset: 'last90',
  statuses: [...statusOptions],
  modes: [...modeOptions],
  destinations: [],
  incoterms: [...incotermOptions],
});

const formatRangeLabel = (range: { from: Date | null; to: Date | null }) => {
  if (range.from && range.to) {
    const sameMonth = range.from.getMonth() === range.to.getMonth();
    const fromLabel = format(range.from, sameMonth ? 'd MMM' : 'd MMM');
    const toLabel = format(range.to, 'd MMM yyyy');
    return `${fromLabel} – ${toLabel}`;
  }
  if (range.from) {
    return `${format(range.from, 'd MMM yyyy')} →`;
  }
  return 'Select range';
};

const areArraysEqual = (a: string[], b: string[]) => {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
};

const areRangesEqual = (a: { from: Date | null; to: Date | null }, b: { from: Date | null; to: Date | null }) => {
  const fromEqual = (!a.from && !b.from) || (a.from && b.from && isSameDay(a.from, b.from));
  const toEqual = (!a.to && !b.to) || (a.to && b.to && isSameDay(a.to, b.to));
  return fromEqual && toEqual;
};

const areFiltersEqual = (a: ReportsFilters, b: ReportsFilters) => {
  return (
    a.preset === b.preset &&
    areRangesEqual(a.dateRange, b.dateRange) &&
    areArraysEqual(a.statuses, b.statuses) &&
    areArraysEqual(a.modes, b.modes) &&
    areArraysEqual(a.destinations, b.destinations) &&
    areArraysEqual(a.incoterms, b.incoterms)
  );
};

const normalizeFilters = (filters: ReportsFilters): ReportsFilters => ({
  ...filters,
  dateRange: {
    from: filters.dateRange.from ? new Date(filters.dateRange.from) : null,
    to: filters.dateRange.to ? new Date(filters.dateRange.to) : null,
  },
  statuses: [...filters.statuses],
  modes: [...filters.modes],
  destinations: [...filters.destinations],
  incoterms: [...filters.incoterms],
});

const computePresetRange = (preset: DatePreset): { from: Date | null; to: Date | null } => {
  switch (preset) {
    case 'last30': {
      const to = datasetMaxDate;
      return { from: subDays(to, 29), to };
    }
    case 'last90': {
      const to = datasetMaxDate;
      return { from: subDays(to, 89), to };
    }
    case 'ytd': {
      return { from: startOfYear(datasetMaxDate), to: datasetMaxDate };
    }
    case 'custom':
    default:
      return { from: null, to: null };
  }
};

const formatDrilldownLabel = (drilldown: DrilldownState | null) => {
  if (!drilldown) return null;
  return drilldown.label;
};
const documentStatusPalette: Record<string, string> = {
  'Commercial Invoice': 'hsl(214 80% 74%)',
  'Packing List': 'hsl(199 84% 70%)',
  'Certificate of Origin': 'hsl(152 65% 68%)',
  'Phyto Certificate': 'hsl(45 90% 72%)',
  'Quality Certificate': 'hsl(18 82% 75%)',
  'Bill of Lading': 'hsl(266 65% 75%)',
  'Air Waybill': 'hsl(263 69% 68%)',
};

const issueStatusPalette: Record<IssueStatus, string> = {
  open: 'hsl(14 88% 68%)',
  in_review: 'hsl(31 92% 70%)',
  resolved: 'hsl(152 65% 60%)',
};

const valuePalette = {
  draft: 'hsl(221 83% 75%)',
  submitted: 'hsl(199 82% 72%)',
  cleared: 'hsl(152 64% 68%)',
  line: 'hsl(221 70% 60%)',
};

const toCsv = (rows: CsvRow[], columns: TableColumn[]) => {
  const header = columns.map((col) => `"${col.label}"`).join(',');
  const data = rows
    .map((row) =>
      columns
        .map((col) => {
          const value = row[col.key];
          if (value === undefined || value === null) return '""';
          const formatted = typeof value === 'string' ? value : value.toString();
          return `"${formatted.replace(/"/g, '""')}"`;
        })
        .join(','),
    )
    .join('\n');

  return [header, data].filter(Boolean).join('\n');
};

const downloadCsv = (filename: string, csvContent: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const useReportData = (filters: ReportsFilters) => {
  const normalizedRange = filters.dateRange;
  return useMemo(() => {
    const shipments = reportShipments.filter((shipment) => {
      const shipmentDate = getDateFromString(shipment.updatedAt);
      if (normalizedRange.from && normalizedRange.to) {
        if (!isWithinInterval(shipmentDate, { start: startOfDay(normalizedRange.from), end: addDays(normalizedRange.to, 1) })) {
          return false;
        }
      } else if (normalizedRange.from) {
        if (shipmentDate < startOfDay(normalizedRange.from)) {
          return false;
        }
      } else if (normalizedRange.to) {
        if (shipmentDate > addDays(normalizedRange.to, 1)) {
          return false;
        }
      }

      if (filters.statuses.length && !filters.statuses.includes(shipment.status)) {
        return false;
      }

      if (filters.modes.length && !filters.modes.includes(shipment.mode)) {
        return false;
      }

      if (filters.destinations.length && !filters.destinations.includes(shipment.destination)) {
        return false;
      }

      if (filters.incoterms.length && !filters.incoterms.includes(shipment.incoterm)) {
        return false;
      }

      return true;
    });

    const shipmentIds = new Set(shipments.map((shipment) => shipment.id));

    const documents = reportDocuments.filter((document) => {
      if (!shipmentIds.has(document.shipmentId)) {
        return false;
      }

      const documentDate = getDateFromString(document.updatedAt);
      if (normalizedRange.from && normalizedRange.to) {
        return isWithinInterval(documentDate, {
          start: startOfDay(normalizedRange.from),
          end: addDays(normalizedRange.to, 1),
        });
      }

      if (normalizedRange.from) {
        return documentDate >= startOfDay(normalizedRange.from);
      }

      if (normalizedRange.to) {
        return documentDate <= addDays(normalizedRange.to, 1);
      }

      return true;
    });

    return { shipments, documents };
  }, [filters.destinations, filters.incoterms, filters.modes, filters.statuses, normalizedRange.from, normalizedRange.to]);
};

const extractDestinations = () =>
  Array.from(new Set(reportShipments.map((shipment) => shipment.destination))).sort((a, b) => a.localeCompare(b));
export const ReportsPage = () => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [isInitialising, setIsInitialising] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(!isMobile);
  const [pendingFilters, setPendingFilters] = useState<ReportsFilters>(() => normalizeFilters(createDefaultFilters()));
  const [appliedFilters, setAppliedFilters] = useState<ReportsFilters>(() => normalizeFilters(createDefaultFilters()));
  const [activeTab, setActiveTab] = useState<'shipments' | 'documents'>('shipments');
  const [shipmentsSearch, setShipmentsSearch] = useState('');
  const [documentsSearch, setDocumentsSearch] = useState('');
  const [shipmentsPage, setShipmentsPage] = useState(1);
  const [documentsPage, setDocumentsPage] = useState(1);
  const [shipmentsPageSize, setShipmentsPageSize] = useState(10);
  const [documentsPageSize, setDocumentsPageSize] = useState(10);
  const [drilldown, setDrilldown] = useState<DrilldownState>(null);
  const [chartViews, setChartViews] = useState<Record<'status' | 'value' | 'buyers' | 'documents' | 'issues', ChartView>>({
    status: 'chart',
    value: 'chart',
    buyers: 'chart',
    documents: 'chart',
    issues: 'chart',
  });

  const drilldownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setFiltersOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsInitialising(false);
    }, 450);
    return () => window.clearTimeout(timer);
  }, []);

  const destinations = useMemo(() => extractDestinations(), []);

  const filtersDirty = useMemo(
    () => !areFiltersEqual(pendingFilters, appliedFilters),
    [pendingFilters, appliedFilters],
  );

  const selectedRange: DateRange | undefined = pendingFilters.dateRange.from || pendingFilters.dateRange.to
    ? {
        from: pendingFilters.dateRange.from ?? undefined,
        to: pendingFilters.dateRange.to ?? undefined,
      }
    : undefined;

  const { shipments: filteredShipments, documents: filteredDocuments } = useReportData(appliedFilters);

  const totalShipmentsValue = filteredShipments.reduce((sum, shipment) => sum + shipment.value, 0);
  const totalDocumentsGenerated = filteredDocuments.filter(
    (document) => document.status === 'Generated' || document.status === 'Approved',
  ).length;
  const totalOpenIssues = filteredShipments.reduce(
    (sum, shipment) => sum + shipment.issues.filter((issue) => issue.status !== 'resolved').length,
    0,
  );
  const totalBalanceDue = filteredShipments.reduce((sum, shipment) => sum + shipment.balanceDue, 0);
  const balanceFormatted = totalBalanceDue < 0
    ? `-${abbreviateFcfa(Math.abs(totalBalanceDue)).replace(' FCFA', '')} FCFA`
    : abbreviateFcfa(totalBalanceDue);

  const shipmentsByMonth: MonthlyStatusData[] = useMemo(() => {
    const map = new Map<string, MonthlyStatusData>();

    filteredShipments.forEach((shipment) => {
      const date = getDateFromString(shipment.updatedAt);
      const key = format(date, 'yyyy-MM');
      if (!map.has(key)) {
        map.set(key, {
          key,
          monthShort: format(date, 'MMM'),
          monthLong: format(date, 'MMMM yyyy'),
          draft: 0,
          submitted: 0,
          cleared: 0,
          total: 0,
        });
      }

      const entry = map.get(key)!;
      entry[shipment.status] += 1;
      entry.total += 1;
    });

    return Array.from(map.values()).sort((a, b) => (a.key < b.key ? -1 : 1));
  }, [filteredShipments]);

  const valueByMonth: MonthlyValueData[] = useMemo(() => {
    const map = new Map<string, MonthlyValueData>();

    filteredShipments.forEach((shipment) => {
      const date = getDateFromString(shipment.updatedAt);
      const key = format(date, 'yyyy-MM');
      if (!map.has(key)) {
        map.set(key, {
          key,
          monthShort: format(date, 'MMM'),
          monthLong: format(date, 'MMMM yyyy'),
          value: 0,
        });
      }

      const entry = map.get(key)!;
      entry.value += shipment.value;
    });

    return Array.from(map.values()).sort((a, b) => (a.key < b.key ? -1 : 1));
  }, [filteredShipments]);

  const topBuyers: BuyerValueData[] = useMemo(() => {
    const map = new Map<string, number>();
    filteredShipments.forEach((shipment) => {
      map.set(shipment.buyer, (map.get(shipment.buyer) ?? 0) + shipment.value);
    });

    return Array.from(map.entries())
      .map(([buyer, value]) => ({ buyer, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredShipments]);

  const documentsByType: PieData[] = useMemo(() => {
    const map = new Map<string, number>();
    filteredDocuments.forEach((document) => {
      map.set(document.type, (map.get(document.type) ?? 0) + 1);
    });

    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredDocuments]);

  const issuesByStatus: PieData[] = useMemo(() => {
    const map = new Map<IssueStatus, number>();
    filteredShipments.forEach((shipment) => {
      shipment.issues.forEach((issue) => {
        map.set(issue.status, (map.get(issue.status) ?? 0) + 1);
      });
    });

    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filteredShipments]);

  const formatAxisValue = (value: number) => {
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)}B`;
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(0)}K`;
    }
    return value.toString();
  };

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (appliedFilters.dateRange.from && appliedFilters.dateRange.to) {
      const from = appliedFilters.dateRange.from;
      const to = appliedFilters.dateRange.to;
      const sameMonth = from.getMonth() === to.getMonth();
      const label = sameMonth
        ? `${format(from, 'MMM d')}–${format(to, 'd')}`
        : `${format(from, 'MMM d')}–${format(to, 'MMM d')}`;
      parts.push(label);
    } else if (appliedFilters.preset !== 'custom') {
      const presetLabel = datePresets.find((preset) => preset.value === appliedFilters.preset)?.label;
      if (presetLabel) {
        parts.push(presetLabel);
      }
    }

    if (appliedFilters.modes.length && appliedFilters.modes.length !== modeOptions.length) {
      parts.push(`Mode ${appliedFilters.modes.join('/')}`);
    }

    if (appliedFilters.destinations.length) {
      parts.push(`Destination ${appliedFilters.destinations.join('/')}`);
    }

    if (appliedFilters.incoterms.length && appliedFilters.incoterms.length !== incotermOptions.length) {
      parts.push(`Incoterm ${appliedFilters.incoterms.join('/')}`);
    }

    if (!parts.length) {
      return 'Filtered by: All activity';
    }

    return `Filtered by: ${parts.join(', ')}`;
  }, [appliedFilters]);

  const shipmentsForTable = useMemo(() => {
    const matchesDrilldown = (shipment: ReportShipment) => {
      if (!drilldown) return true;
      const shipmentDate = getDateFromString(shipment.updatedAt);
      const monthKey = format(shipmentDate, 'yyyy-MM');

      if (drilldown.type === 'status') {
        return shipment.status === drilldown.status && monthKey === drilldown.monthKey;
      }

      if (drilldown.type === 'buyer') {
        return shipment.buyer === drilldown.buyer;
      }

      if (drilldown.type === 'issueStatus') {
        return shipment.issues.some((issue) => issue.status === drilldown.issueStatus);
      }

      if (drilldown.type === 'month') {
        return monthKey === drilldown.monthKey;
      }

      return true;
    };

    return filteredShipments
      .filter(matchesDrilldown)
      .filter((shipment) => {
        if (!shipmentsSearch) return true;
        const query = shipmentsSearch.toLowerCase();
        return (
          shipment.reference.toLowerCase().includes(query) ||
          shipment.buyer.toLowerCase().includes(query) ||
          shipment.destination.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1));
  }, [drilldown, filteredShipments, shipmentsSearch]);

  const documentsForTable = useMemo(() => {
    const matchesDrilldown = (document: ReportDocument) => {
      if (!drilldown) return true;
      if (drilldown.type === 'docType') {
        return document.type === drilldown.docType;
      }
      return true;
    };

    const shipmentLookup = new Map(filteredShipments.map((shipment) => [shipment.id, shipment]));

    return filteredDocuments
      .filter((document) => shipmentLookup.has(document.shipmentId))
      .filter(matchesDrilldown)
      .filter((document) => {
        if (!documentsSearch) return true;
        const query = documentsSearch.toLowerCase();
        return (
          document.shipmentReference.toLowerCase().includes(query) ||
          document.type.toLowerCase().includes(query) ||
          document.status.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => (a.updatedAt > b.updatedAt ? -1 : 1));
  }, [documentsSearch, drilldown, filteredDocuments, filteredShipments]);

  useEffect(() => {
    setShipmentsPage(1);
  }, [shipmentsForTable.length, appliedFilters, drilldown, shipmentsSearch]);

  useEffect(() => {
    setDocumentsPage(1);
  }, [documentsForTable.length, appliedFilters, drilldown, documentsSearch]);

  const shipmentsTotalPages = Math.max(1, Math.ceil(shipmentsForTable.length / shipmentsPageSize));
  const documentsTotalPages = Math.max(1, Math.ceil(documentsForTable.length / documentsPageSize));

  const paginatedShipments = shipmentsForTable.slice(
    (shipmentsPage - 1) * shipmentsPageSize,
    shipmentsPage * shipmentsPageSize,
  );
  const paginatedDocuments = documentsForTable.slice(
    (documentsPage - 1) * documentsPageSize,
    documentsPage * documentsPageSize,
  );
  const handleApplyFilters = () => {
    setAppliedFilters(normalizeFilters(pendingFilters));
    setDrilldown(null);
    setShipmentsSearch('');
    setDocumentsSearch('');
    setShipmentsPage(1);
    setDocumentsPage(1);
    toast({ title: 'Filters applied', description: filterSummary });
  };

  const handleResetFilters = () => {
    const defaults = normalizeFilters(createDefaultFilters());
    setPendingFilters(defaults);
    setAppliedFilters(defaults);
    setDrilldown(null);
    setShipmentsSearch('');
    setDocumentsSearch('');
    setShipmentsPage(1);
    setDocumentsPage(1);
    toast({ title: 'Filters reset', description: 'Showing last 90 days of activity' });
  };

  const handlePresetChange = (value: DatePreset) => {
    const range = computePresetRange(value);
    setPendingFilters((prev) => ({
      ...prev,
      preset: value,
      dateRange: {
        from: range.from ? clampDate(range.from) : prev.dateRange.from,
        to: range.to ? clampDate(range.to) : prev.dateRange.to,
      },
    }));
  };

  const handleDateSelect = (range: DateRange | undefined) => {
    setPendingFilters((prev) => ({
      ...prev,
      preset: 'custom',
      dateRange: {
        from: range?.from ?? null,
        to: range?.to ?? null,
      },
    }));
  };

  const handleDestinationToggle = (value: string) => {
    setPendingFilters((prev) => {
      const exists = prev.destinations.includes(value);
      return {
        ...prev,
        destinations: exists
          ? prev.destinations.filter((destination) => destination !== value)
          : [...prev.destinations, value],
      };
    });
  };

  const handleIncotermToggle = (value: Incoterm) => {
    setPendingFilters((prev) => {
      const exists = prev.incoterms.includes(value);
      return {
        ...prev,
        incoterms: exists ? prev.incoterms.filter((incoterm) => incoterm !== value) : [...prev.incoterms, value],
      };
    });
  };

  const handleShipmentsCsv = () => {
    const columns: TableColumn[] = [
      { key: 'reference', label: 'Reference' },
      { key: 'buyer', label: 'Buyer' },
      { key: 'incoterm', label: 'Incoterm' },
      { key: 'mode', label: 'Mode' },
      { key: 'route', label: 'Route' },
      { key: 'value', label: 'Value (FCFA)' },
      { key: 'status', label: 'Status' },
      { key: 'updated', label: 'Updated' },
    ];

    const rows: CsvRow[] = paginatedShipments.map((shipment) => ({
      reference: shipment.reference,
      buyer: shipment.buyer,
      incoterm: shipment.incoterm,
      mode: shipment.mode,
      route: shipment.route,
      value: formatFcfa(shipment.value),
      status: shipment.status,
      updated: format(getDateFromString(shipment.updatedAt), 'dd MMM yyyy'),
    }));

    downloadCsv('shipments-report.csv', toCsv(rows, columns));
  };

  const handleDocumentsCsv = () => {
    const columns: TableColumn[] = [
      { key: 'reference', label: 'Shipment Ref' },
      { key: 'document', label: 'Document' },
      { key: 'version', label: 'Version' },
      { key: 'status', label: 'Status' },
      { key: 'updated', label: 'Updated' },
    ];

    const rows: CsvRow[] = paginatedDocuments.map((document) => ({
      reference: document.shipmentReference,
      document: document.type,
      version: document.version,
      status: document.status,
      updated: format(getDateFromString(document.updatedAt), 'dd MMM yyyy'),
    }));

    downloadCsv('documents-report.csv', toCsv(rows, columns));
  };

  const scrollToDrilldown = () => {
    if (drilldownRef.current) {
      drilldownRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const activateStatusDrilldown = (status: ShipmentStatus, monthKey: string, monthLong: string) => {
    setActiveTab('shipments');
    setDrilldown({ type: 'status', status, monthKey, label: `${status} · ${monthLong}` });
    scrollToDrilldown();
  };

  const activateMonthDrilldown = (monthKey: string, monthLong: string) => {
    setActiveTab('shipments');
    setDrilldown({ type: 'month', monthKey, label: `Shipments in ${monthLong}` });
    scrollToDrilldown();
  };

  const activateBuyerDrilldown = (buyer: string) => {
    setActiveTab('shipments');
    setDrilldown({ type: 'buyer', buyer, label: `Top buyer · ${buyer}` });
    scrollToDrilldown();
  };

  const activateDocumentTypeDrilldown = (docType: string) => {
    setActiveTab('documents');
    setDrilldown({ type: 'docType', docType, label: `Document type · ${docType}` });
    scrollToDrilldown();
  };

  const activateIssueDrilldown = (status: IssueStatus) => {
    setActiveTab('shipments');
    setDrilldown({ type: 'issueStatus', issueStatus: status, label: `Issues · ${status.replace('_', ' ')}` });
    scrollToDrilldown();
  };

  const clearDrilldown = () => setDrilldown(null);

  const handleDownloadReport = () => {
    toast({ title: 'Report download', description: 'A branded PDF export is coming soon.' });
  };

  const toggleChartView = (key: 'status' | 'value' | 'buyers' | 'documents' | 'issues') => {
    setChartViews((prev) => ({
      ...prev,
      [key]: prev[key] === 'chart' ? 'table' : 'chart',
    }));
  };

  const renderSkeletonCards = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Card key={`skeleton-${index}`} className="rounded-2xl shadow-sm border-muted/40">
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderSkeletonCharts = () => (
    <div className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <Card key={`chart-skeleton-${index}`} className="rounded-2xl shadow-sm border-muted/40">
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-56 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderSkeletonTables = () => (
    <Card className="rounded-2xl shadow-sm border-muted/40">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-40 w-full" />
      </CardContent>
    </Card>
  );
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Analytics and exports for your workspace.</p>
      </div>

      <div className="sticky top-[3.75rem] z-30 space-y-3 rounded-2xl border border-border/60 bg-background/95 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filters
          </div>
          <div className="flex items-center gap-2">
            {filtersDirty && (
              <div className="flex items-center gap-1 text-xs text-amber-600">
                <Clock3 className="h-3.5 w-3.5" />
                Changes not applied
              </div>
            )}
            <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setFiltersOpen((prev) => !prev)}>
              {filtersOpen ? 'Hide filters' : 'Show filters'}
              <ChevronDown className={cn('ml-2 h-4 w-4 transition-transform', filtersOpen ? 'rotate-180' : '')} />
            </Button>
            <div className="hidden md:flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={handleDownloadReport}>
                <Download className="mr-2 h-4 w-4" />
                Download report (PDF)
              </Button>
              <Button variant="link" size="sm" onClick={handleResetFilters}>
                Reset
              </Button>
              <Button size="sm" onClick={handleApplyFilters} disabled={!filtersDirty}>
                Apply
              </Button>
            </div>
          </div>
        </div>

        {filtersOpen && (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 rounded-xl border-muted/50"
                  >
                    <CalendarIcon className="h-4 w-4" />
                    <span className="truncate text-sm font-medium">
                      {formatRangeLabel(pendingFilters.dateRange)}
                    </span>
                    <ChevronDown className="ml-auto h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] space-y-4 p-4" align="start">
                  <div>
                    <p className="text-sm font-medium">Date range</p>
                    <p className="text-xs text-muted-foreground">Quickly focus the period you care about.</p>
                  </div>
                  <ToggleGroup
                    type="single"
                    value={pendingFilters.preset}
                    onValueChange={(value) => value && handlePresetChange(value as DatePreset)}
                    className="flex flex-wrap gap-2"
                  >
                    {datePresets.map((preset) => (
                      <ToggleGroupItem
                        key={preset.value}
                        value={preset.value}
                        className="rounded-full px-3 py-1 text-xs data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                      >
                        {preset.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  <Calendar
                    mode="range"
                    numberOfMonths={isMobile ? 1 : 2}
                    selected={selectedRange}
                    defaultMonth={pendingFilters.dateRange.from ?? datasetMaxDate}
                    onSelect={handleDateSelect}
                    weekStartsOn={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Selecting days switches the preset to Custom. Range is clamped to available data.
                  </p>
                  <div className="flex justify-end gap-2 md:hidden">
                    <Button variant="secondary" size="sm" onClick={handleDownloadReport}>
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                    <Button variant="link" size="sm" onClick={handleResetFilters}>
                      Reset
                    </Button>
                    <Button size="sm" onClick={handleApplyFilters} disabled={!filtersDirty}>
                      Apply
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Status</p>
                <ToggleGroup
                  type="multiple"
                  value={pendingFilters.statuses}
                  onValueChange={(values) =>
                    setPendingFilters((prev) => ({ ...prev, statuses: (values as ShipmentStatus[]) ?? [] }))
                  }
                  className="flex flex-wrap gap-2"
                >
                  {statusOptions.map((status) => (
                    <ToggleGroupItem
                      key={status}
                      value={status}
                      className="rounded-full px-3 py-1 text-xs capitalize data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                    >
                      {status}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Mode</p>
                <ToggleGroup
                  type="multiple"
                  value={pendingFilters.modes}
                  onValueChange={(values) =>
                    setPendingFilters((prev) => ({ ...prev, modes: (values as ShipmentMode[]) ?? [] }))
                  }
                  className="flex flex-wrap gap-2"
                >
                  {modeOptions.map((mode) => (
                    <ToggleGroupItem
                      key={mode}
                      value={mode}
                      className="rounded-full px-3 py-1 text-xs data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                    >
                      {mode}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Destination</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between rounded-xl border-muted/50 text-sm"
                    >
                      <span className="truncate">
                        {pendingFilters.destinations.length
                          ? `${pendingFilters.destinations.length} selected`
                          : 'All destinations'}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[240px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search countries" />
                      <CommandList>
                        <CommandEmpty>No match found.</CommandEmpty>
                        <CommandGroup>
                          {destinations.map((destination) => {
                            const checked = pendingFilters.destinations.includes(destination);
                            return (
                              <CommandItem
                                key={destination}
                                onSelect={() => handleDestinationToggle(destination)}
                                className="flex items-center gap-2"
                              >
                                <span
                                  className={cn(
                                    'flex h-4 w-4 items-center justify-center rounded border',
                                    checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40',
                                  )}
                                >
                                  {checked && <Check className="h-3 w-3" />}
                                </span>
                                <span>{destination}</span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2 md:col-span-2 xl:col-span-1">
                <p className="text-xs font-medium text-muted-foreground">Incoterms</p>
                <div className="flex flex-wrap gap-2">
                  {incotermOptions.map((incoterm) => {
                    const active = pendingFilters.incoterms.includes(incoterm);
                    return (
                      <Button
                        key={incoterm}
                        variant={active ? 'secondary' : 'outline'}
                        size="sm"
                        className="rounded-full"
                        onClick={() => handleIncotermToggle(incoterm)}
                      >
                        {incoterm}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 md:hidden">
              <Button variant="secondary" size="sm" onClick={handleDownloadReport}>
                <Download className="mr-2 h-4 w-4" />
                Download report (PDF)
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="link" size="sm" onClick={handleResetFilters}>
                  Reset
                </Button>
                <Button size="sm" onClick={handleApplyFilters} disabled={!filtersDirty}>
                  Apply
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{filterSummary}</span>
        <span className="hidden sm:flex items-center gap-1">
          <CalendarIcon className="h-3.5 w-3.5" />
          Data refreshed instantly when filters update.
        </span>
      </div>

      {isInitialising ? (
        renderSkeletonCards()
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardContent className="flex flex-col gap-3 p-6">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Package className="h-4 w-4" />
                Shipments
              </div>
              <div className="text-3xl font-semibold tracking-tight">{filteredShipments.length}</div>
              <p className="text-xs text-muted-foreground">Count in selected period.</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardContent className="flex flex-col gap-3 p-6">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Coins className="h-4 w-4" />
                Total Value
              </div>
              <div className="text-3xl font-semibold tracking-tight">{abbreviateFcfa(totalShipmentsValue)}</div>
              <p className="text-xs text-muted-foreground">Shipment value in FCFA.</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardContent className="flex flex-col gap-3 p-6">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <FileText className="h-4 w-4" />
                Documents Generated
              </div>
              <div className="text-3xl font-semibold tracking-tight">{totalDocumentsGenerated}</div>
              <p className="text-xs text-muted-foreground">Generated or approved.</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardContent className="flex flex-col gap-3 p-6">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                Open Issues
              </div>
              <div className={cn('text-3xl font-semibold tracking-tight', totalOpenIssues > 0 ? 'text-amber-600' : 'text-foreground')}>
                {totalOpenIssues}
              </div>
              <p className="text-xs text-muted-foreground">Requires attention.</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardContent className="flex flex-col gap-3 p-6">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Wallet2 className="h-4 w-4" />
                Balance Due
              </div>
              <div
                className={cn(
                  'text-3xl font-semibold tracking-tight',
                  totalBalanceDue <= 0 ? 'text-emerald-600' : 'text-foreground',
                )}
              >
                {balanceFormatted}
              </div>
              <p className="text-xs text-muted-foreground">Total costs minus recorded payments.</p>
            </CardContent>
          </Card>
        </div>
      )}

      {isInitialising ? (
        renderSkeletonCharts()
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader className="space-y-1">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-base">Shipments by status (monthly)</CardTitle>
                  <CardDescription>Stacked view of draft, submitted, and cleared shipments each month.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => toggleChartView('status')}>
                  {chartViews.status === 'chart' ? 'View as table' : 'View chart'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {chartViews.status === 'chart' ? (
                shipmentsByMonth.length ? (
                  <ChartContainer
                    config={{
                      draft: { label: 'Draft', color: valuePalette.draft },
                      submitted: { label: 'Submitted', color: valuePalette.submitted },
                      cleared: { label: 'Cleared', color: valuePalette.cleared },
                    }}
                    className="h-[260px]"
                    aria-label="Shipments by status stacked column chart"
                  >
                    <BarChart data={shipmentsByMonth}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted)/0.4)" />
                      <XAxis dataKey="monthShort" axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: 'hsl(var(--muted)/0.2)' }} />
                      <ChartLegend verticalAlign="top" content={<ChartLegendContent />} />
                      <Bar
                        dataKey="draft"
                        stackId="shipments"
                        fill="var(--color-draft)"
                        radius={[8, 8, 0, 0]}
                        onClick={(data) =>
                          activateStatusDrilldown('draft', data.payload.key, data.payload.monthLong)
                        }
                        cursor="pointer"
                      />
                      <Bar
                        dataKey="submitted"
                        stackId="shipments"
                        fill="var(--color-submitted)"
                        radius={[8, 8, 0, 0]}
                        onClick={(data) =>
                          activateStatusDrilldown('submitted', data.payload.key, data.payload.monthLong)
                        }
                        cursor="pointer"
                      />
                      <Bar
                        dataKey="cleared"
                        stackId="shipments"
                        fill="var(--color-cleared)"
                        radius={[8, 8, 0, 0]}
                        onClick={(data) =>
                          activateStatusDrilldown('cleared', data.payload.key, data.payload.monthLong)
                        }
                        cursor="pointer"
                      />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                    No shipments for this filter.
                  </div>
                )
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background">Month</TableHead>
                        <TableHead>Draft</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Cleared</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shipmentsByMonth.map((row) => (
                        <TableRow key={row.key}>
                          <TableCell className="sticky left-0 bg-background font-medium">{row.monthLong}</TableCell>
                          <TableCell>{row.draft}</TableCell>
                          <TableCell>{row.submitted}</TableCell>
                          <TableCell>{row.cleared}</TableCell>
                          <TableCell>{row.total}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader className="space-y-1">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-base">Shipment value by month</CardTitle>
                  <CardDescription>Shows how cleared value trends over the selected period.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => toggleChartView('value')}>
                  {chartViews.value === 'chart' ? 'View as table' : 'View chart'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {chartViews.value === 'chart' ? (
                valueByMonth.length ? (
                  <ChartContainer
                    config={{ value: { label: 'Value', color: valuePalette.line } }}
                    className="h-[260px]"
                    aria-label="Shipment value line chart"
                  >
                    <LineChart data={valueByMonth}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted)/0.4)" />
                      <XAxis dataKey="monthShort" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={formatAxisValue} />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value: number) => [formatFcfa(value), 'Value']}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="var(--color-value)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{
                          r: 6,
                          onClick: (_event: unknown, point: LinePointPayload) => {
                            if (point.payload) {
                              activateMonthDrilldown(point.payload.key, point.payload.monthLong);
                            }
                          },
                          className: 'cursor-pointer fill-[var(--color-value)]',
                        }}
                      />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                    No value recorded for this selection.
                  </div>
                )
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background">Month</TableHead>
                        <TableHead>Total value (FCFA)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {valueByMonth.map((row) => (
                        <TableRow key={row.key}>
                          <TableCell className="sticky left-0 bg-background font-medium">{row.monthLong}</TableCell>
                          <TableCell>{formatFcfa(row.value)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader className="space-y-1">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-base">Top buyers by value</CardTitle>
                  <CardDescription>Highlights the five buyers driving the most cleared value.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => toggleChartView('buyers')}>
                  {chartViews.buyers === 'chart' ? 'View as table' : 'View chart'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {chartViews.buyers === 'chart' ? (
                topBuyers.length ? (
                  <ChartContainer
                    config={{ value: { label: 'Value', color: valuePalette.line } }}
                    className="h-[260px]"
                    aria-label="Top buyers horizontal bar chart"
                  >
                    <BarChart data={[...topBuyers].reverse()} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--muted)/0.4)" />
                      <XAxis type="number" tickFormatter={formatAxisValue} axisLine={false} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="buyer"
                        axisLine={false}
                        tickLine={false}
                        width={160}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value: number, name: string) => [formatFcfa(value), name]}
                      />
                      <Bar
                        dataKey="value"
                        fill="var(--color-value)"
                        radius={[0, 8, 8, 0]}
                        onClick={(data) => activateBuyerDrilldown(data.payload.buyer)}
                        cursor="pointer"
                      />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                    No buyers match these filters.
                  </div>
                )
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background">Buyer</TableHead>
                        <TableHead>Total value (FCFA)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topBuyers.map((row) => (
                        <TableRow key={row.buyer}>
                          <TableCell className="sticky left-0 bg-background font-medium">{row.buyer}</TableCell>
                          <TableCell>{formatFcfa(row.value)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader className="space-y-1">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-base">Documents by type</CardTitle>
                  <CardDescription>See which documents were produced most often.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => toggleChartView('documents')}>
                  {chartViews.documents === 'chart' ? 'View as table' : 'View chart'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {chartViews.documents === 'chart' ? (
                documentsByType.length ? (
                  <ChartContainer
                    config={Object.fromEntries(
                      documentsByType.map((item) => [item.name, { label: item.name, color: documentStatusPalette[item.name] }]),
                    )}
                    className="h-[260px]"
                    aria-label="Documents by type donut chart"
                  >
                    <PieChart>
                      <Pie
                        data={documentsByType}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="55%"
                        outerRadius="80%"
                        stroke="transparent"
                      >
                        {documentsByType.map((entry) => (
                          <Cell key={entry.name} fill={documentStatusPalette[entry.name] ?? 'hsl(var(--primary))'} />
                        ))}
                      </Pie>
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value: number, name: string) => [`${value} documents`, name]}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                    </PieChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                    No documents generated in this range.
                  </div>
                )
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background">Document</TableHead>
                        <TableHead>Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documentsByType.map((row) => (
                        <TableRow key={row.name}>
                          <TableCell className="sticky left-0 bg-background font-medium">{row.name}</TableCell>
                          <TableCell>{row.value}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 shadow-sm">
            <CardHeader className="space-y-1">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-base">Issues by status</CardTitle>
                  <CardDescription>Track outstanding work across compliance and operations.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => toggleChartView('issues')}>
                  {chartViews.issues === 'chart' ? 'View as table' : 'View chart'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {chartViews.issues === 'chart' ? (
                issuesByStatus.length ? (
                  <ChartContainer
                    config={Object.fromEntries(
                      issuesByStatus.map((item) => [item.name, { label: item.name, color: issueStatusPalette[item.name as IssueStatus] }]),
                    )}
                    className="h-[260px]"
                    aria-label="Issues by status chart"
                  >
                    <PieChart>
                      <Pie
                        data={issuesByStatus}
                        dataKey="value"
                        nameKey="name"
                        innerRadius="45%"
                        outerRadius="75%"
                        stroke="transparent"
                        onClick={(data) => activateIssueDrilldown(data.name as IssueStatus)}
                      >
                        {issuesByStatus.map((entry) => (
                          <Cell key={entry.name} fill={issueStatusPalette[entry.name as IssueStatus]} className="cursor-pointer" />
                        ))}
                      </Pie>
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value: number, name: string) => [`${value} issues`, name.replace('_', ' ') ]}
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                    </PieChart>
                  </ChartContainer>
                ) : (
                  <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                    No issues captured in this range.
                  </div>
                )
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background">Status</TableHead>
                        <TableHead>Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {issuesByStatus.map((row) => (
                        <TableRow key={row.name}>
                          <TableCell className="sticky left-0 bg-background font-medium">{row.name.replace('_', ' ')}</TableCell>
                          <TableCell>{row.value}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div ref={drilldownRef} className="space-y-4">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'shipments' | 'documents')} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="rounded-full bg-muted/60 p-1">
              <TabsTrigger value="shipments" className="rounded-full px-4 py-2 text-sm">
                Shipments
              </TabsTrigger>
              <TabsTrigger value="documents" className="rounded-full px-4 py-2 text-sm">
                Documents
              </TabsTrigger>
            </TabsList>
            {drilldown && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline" className="rounded-full bg-muted/60 px-3 py-1">
                  {formatDrilldownLabel(drilldown)}
                </Badge>
                <Button variant="link" size="sm" onClick={clearDrilldown}>
                  Clear focus
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="shipments" className="space-y-4">
            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">Shipments</CardTitle>
                    <CardDescription>Detailed list of shipments that match the applied filters.</CardDescription>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={shipmentsSearch}
                        onChange={(event) => setShipmentsSearch(event.target.value)}
                        placeholder="Search reference or buyer"
                        className="pl-9"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShipmentsCsv}
                      disabled={!paginatedShipments.length}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {shipmentsForTable.length ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-background">Reference</TableHead>
                          <TableHead>Buyer</TableHead>
                          <TableHead>Incoterm</TableHead>
                          <TableHead>Mode</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead>Value (FCFA)</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Updated</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedShipments.map((shipment) => {
                          const shipmentDate = getDateFromString(shipment.updatedAt);
                          return (
                            <TableRow
                              key={shipment.id}
                              className="cursor-pointer transition-colors hover:bg-muted/60"
                              role="button"
                              tabIndex={0}
                              onClick={() => navigate(`/shipments/${shipment.id}`)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  navigate(`/shipments/${shipment.id}`);
                                }
                              }}
                            >
                              <TableCell className="sticky left-0 bg-background font-medium">{shipment.reference}</TableCell>
                              <TableCell>{shipment.buyer}</TableCell>
                              <TableCell>{shipment.incoterm}</TableCell>
                              <TableCell>{shipment.mode}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{shipment.route}</TableCell>
                              <TableCell>{formatFcfa(shipment.value)}</TableCell>
                              <TableCell>
                                <Badge variant={getStatusBadgeVariant(shipment.status)} className="capitalize">
                                  {shipment.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{format(shipmentDate, 'dd MMM yyyy')}</TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                <ExternalLink className="h-4 w-4" />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 text-sm text-muted-foreground">
                    No results for this period. Try widening your date range.
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Show</span>
                    <Select
                      value={shipmentsPageSize.toString()}
                      onValueChange={(value) => {
                        setShipmentsPageSize(Number(value));
                        setShipmentsPage(1);
                      }}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                      </SelectContent>
                    </Select>
                    <span>
                      of {shipmentsForTable.length} shipment{shipmentsForTable.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShipmentsPage((prev) => Math.max(1, prev - 1))}
                      disabled={shipmentsPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {shipmentsPage} of {shipmentsTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShipmentsPage((prev) => Math.min(shipmentsTotalPages, prev + 1))}
                      disabled={shipmentsPage === shipmentsTotalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card className="rounded-2xl border-border/60 shadow-sm">
              <CardHeader>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">Documents</CardTitle>
                    <CardDescription>Documents generated for the filtered shipments.</CardDescription>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={documentsSearch}
                        onChange={(event) => setDocumentsSearch(event.target.value)}
                        placeholder="Search document or status"
                        className="pl-9"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDocumentsCsv}
                      disabled={!paginatedDocuments.length}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {documentsForTable.length ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-background">Shipment Ref</TableHead>
                          <TableHead>Document</TableHead>
                          <TableHead>Version</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Updated</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedDocuments.map((document) => {
                          const documentDate = getDateFromString(document.updatedAt);
                          return (
                            <TableRow
                              key={document.id}
                              className="cursor-pointer transition-colors hover:bg-muted/60"
                              role="button"
                              tabIndex={0}
                              onClick={() => navigate(`/shipments/${document.shipmentId}`)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  navigate(`/shipments/${document.shipmentId}`);
                                }
                              }}
                            >
                              <TableCell className="sticky left-0 bg-background font-medium">{document.shipmentReference}</TableCell>
                              <TableCell>{document.type}</TableCell>
                              <TableCell>{document.version}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="capitalize">
                                  {document.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{format(documentDate, 'dd MMM yyyy')}</TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                <ExternalLink className="h-4 w-4" />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 text-sm text-muted-foreground">
                    No documents available for the current filters.
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Show</span>
                    <Select
                      value={documentsPageSize.toString()}
                      onValueChange={(value) => {
                        setDocumentsPageSize(Number(value));
                        setDocumentsPage(1);
                      }}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                      </SelectContent>
                    </Select>
                    <span>
                      of {documentsForTable.length} document{documentsForTable.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDocumentsPage((prev) => Math.max(1, prev - 1))}
                      disabled={documentsPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {documentsPage} of {documentsTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDocumentsPage((prev) => Math.min(documentsTotalPages, prev + 1))}
                      disabled={documentsPage === documentsTotalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
