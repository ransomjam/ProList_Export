import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { DocStatusBadge } from "@/components/documents/DocStatusBadge";
import { useComplianceStore } from "@/stores/compliance";
import {
  docStatusLabel,
  normalizeDocStatus,
  isAttentionStatus,
  isBlockedStatus,
  isReadyStatus,
  type NormalizedDocStatus,
} from "@/utils/docStatus";
import { differenceInCalendarDays, format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Filter,
  Search,
  ShieldCheck,
  MoveRight,
  FileText,
} from "lucide-react";

const readinessLegend = [
  {
    key: "ready" as const,
    label: "Ready",
    description: "All documents clear",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  {
    key: "attention" as const,
    label: "Needs attention",
    description: "In progress or waiting",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
  },
  {
    key: "blocked" as const,
    label: "Blocked",
    description: "Missing or rejected",
    badgeClass: "bg-rose-100 text-rose-700 border-rose-200",
  },
];

type ShipmentReadiness = "ready" | "attention" | "blocked";

type ActiveFilters = {
  search: string;
  readiness?: ShipmentReadiness;
  destination?: string;
  dueWindow?: "7" | "30" | "60" | "90";
};

type PendingFilters = ActiveFilters;

const classifyShipment = (statuses: NormalizedDocStatus[]): ShipmentReadiness => {
  if (statuses.some(status => isBlockedStatus(status))) {
    return "blocked";
  }
  if (statuses.some(status => isAttentionStatus(status))) {
    return "attention";
  }
  return "ready";
};

const formatDueLabel = (isoDate: string) => {
  const parsed = new Date(isoDate);
  const diff = differenceInCalendarDays(parsed, new Date());
  if (Number.isNaN(diff)) return "--";
  if (diff > 0) return `in ${diff}d`;
  if (diff === 0) return "today";
  return `overdue ${Math.abs(diff)}d`;
};

interface ShipmentRow {
  id: string;
  reference: string;
  buyer: string;
  route: string;
  incoterm: string;
  owner: string;
  ownerInitials: string;
  dueDate: string;
  dueLabel: string;
  readiness: ShipmentReadiness;
  issues: number;
  costStatus: "balanced" | "due";
  costNote: string;
  documents: {
    id: string;
    docKey: string;
    status: NormalizedDocStatus;
    title: string;
  }[];
}

const buildShipmentRows = (
  shipments: ReturnType<typeof useComplianceStore.getState>["shipments"],
  documents: ReturnType<typeof useComplianceStore.getState>["documents"]
): ShipmentRow[] => {
  return shipments.map(shipment => {
    const docSummaries = shipment.documents
      .map(docId => documents[docId])
      .filter(Boolean)
      .map(doc => ({
        id: doc.id,
        docKey: doc.docKey,
        status: normalizeDocStatus(doc.status),
        title: doc.title,
      }));

    const readiness = classifyShipment(docSummaries.map(doc => doc.status));

    return {
      id: shipment.id,
      reference: shipment.reference,
      buyer: shipment.buyer,
      route: shipment.route,
      incoterm: shipment.incoterm,
      owner: shipment.owner,
      ownerInitials: shipment.ownerInitials,
      dueDate: shipment.dueDate,
      dueLabel: shipment.dueLabel,
      readiness,
      issues: shipment.issues,
      costStatus: shipment.costStatus,
      costNote: shipment.costNote,
      documents: docSummaries,
    } satisfies ShipmentRow;
  });
};

const filterShipments = (
  rows: ShipmentRow[],
  filters: ActiveFilters
) => {
  return rows.filter(row => {
    const matchesSearch = filters.search
      ? `${row.reference} ${row.buyer}`
          .toLowerCase()
          .includes(filters.search.toLowerCase())
      : true;

    const matchesReadiness = filters.readiness ? row.readiness === filters.readiness : true;

    const matchesDestination = filters.destination
      ? row.route.toLowerCase().includes(filters.destination.toLowerCase())
      : true;

    const matchesDueWindow = filters.dueWindow
      ? (() => {
          const days = Number.parseInt(filters.dueWindow ?? "", 10);
          if (Number.isNaN(days)) return true;
          const diff = differenceInCalendarDays(new Date(row.dueDate), new Date());
          return diff <= days;
        })()
      : true;

    return matchesSearch && matchesReadiness && matchesDestination && matchesDueWindow;
  });
};

const computeExpiries = (
  documents: ReturnType<typeof useComplianceStore.getState>["documents"],
  withinDays = 60
) => {
  const now = new Date();
  return Object.values(documents)
    .filter(doc => doc.expiryDate)
    .map(doc => ({
      ...doc,
      expiryDiff: differenceInCalendarDays(new Date(doc.expiryDate as string), now),
    }))
    .filter(doc => doc.expiryDiff >= 0 && doc.expiryDiff <= withinDays)
    .sort((a, b) => a.expiryDiff - b.expiryDiff)
    .slice(0, 6);
};

const readinessKpis = (rows: ShipmentRow[]) => {
  const ready = rows.filter(row => row.readiness === "ready").length;
  const attention = rows.filter(row => row.readiness === "attention").length;
  const blocked = rows.filter(row => row.readiness === "blocked").length;
  return [
    {
      key: "ready",
      label: "Ready to submit",
      value: ready,
      icon: ShieldCheck,
      tone: "text-emerald-600",
    },
    {
      key: "attention",
      label: "Needs attention",
      value: attention,
      icon: Clock3,
      tone: "text-amber-600",
    },
    {
      key: "blocked",
      label: "Blocked",
      value: blocked,
      icon: AlertTriangle,
      tone: "text-rose-600",
    },
  ] as const;
};

const destinationOptions = (
  shipments: ReturnType<typeof useComplianceStore.getState>["shipments"]
) => {
  const set = new Set<string>();
  shipments.forEach(shipment => {
    const destination = shipment.destination.trim();
    if (destination) set.add(destination);
  });
  return Array.from(set).sort();
};

export const ComplianceOverviewPage = () => {
  const shipments = useComplianceStore(state => state.shipments);
  const documents = useComplianceStore(state => state.documents);
  const initialize = useComplianceStore(state => state.initialize);
  const initialized = useComplianceStore(state => state.initialized);
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [pendingFilters, setPendingFilters] = useState<PendingFilters>({ search: "" });
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({ search: "" });

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    const timeout = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(timeout);
  }, []);

  const shipmentRows = useMemo(
    () => buildShipmentRows(shipments, documents),
    [shipments, documents]
  );

  const filteredRows = useMemo(
    () => filterShipments(shipmentRows, activeFilters),
    [shipmentRows, activeFilters]
  );

  const kpis = useMemo(() => readinessKpis(shipmentRows), [shipmentRows]);

  const expiringDocuments = useMemo(() => computeExpiries(documents, 45), [documents]);

  const destinationChoices = useMemo(() => destinationOptions(shipments), [shipments]);

  const handleApplyFilters = () => {
    setActiveFilters(pendingFilters);
  };

  const handleResetFilters = () => {
    setPendingFilters({ search: "" });
    setActiveFilters({ search: "" });
  };

  const getActionLabel = (row: ShipmentRow) => {
    if (row.documents.some(doc => doc.status === "rejected")) {
      return "Review rejection";
    }
    if (row.documents.some(doc => isBlockedStatus(doc.status))) {
      return "Fix docs";
    }
    if (row.documents.some(doc => doc.status === "submitted" || doc.status === "under_review")) {
      return "Track submission";
    }
    if (row.documents.every(doc => isReadyStatus(doc.status))) {
      return "Submit pack";
    }
    return "Review";
  };

  const handleNavigateToDoc = (docId: string) => {
    navigate(`/compliance/documents/${docId}`);
  };

  const handleOpenShipment = (row: ShipmentRow) => {
    navigate(`/shipments/${row.id}?tab=documents`);
  };

  const renderFilters = () => (
    <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card/50 p-4 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-4">
        <div className="w-full md:w-64">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Reference or buyer"
              value={pendingFilters.search}
              onChange={event => setPendingFilters(prev => ({ ...prev, search: event.target.value }))}
              className="pl-9"
            />
          </div>
        </div>
        <div className="w-full md:w-48">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Readiness</label>
          <Select
            value={pendingFilters.readiness ?? "all"}
            onValueChange={value =>
              setPendingFilters(prev => ({ ...prev, readiness: value === "all" ? undefined : (value as ShipmentReadiness) }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {readinessLegend.map(item => (
                <SelectItem key={item.key} value={item.key}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-48">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Destination</label>
          <Select
            value={pendingFilters.destination ?? "all"}
            onValueChange={value =>
              setPendingFilters(prev => ({ ...prev, destination: value === "all" ? undefined : value }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All destinations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All destinations</SelectItem>
              {destinationChoices.map(destination => (
                <SelectItem key={destination} value={destination}>
                  {destination}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-40">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Due window</label>
          <Select
            value={pendingFilters.dueWindow ?? "all"}
            onValueChange={value =>
              setPendingFilters(prev => ({ ...prev, dueWindow: value === "all" ? undefined : (value as ActiveFilters["dueWindow"]) }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All dates</SelectItem>
              <SelectItem value="7">Next 7 days</SelectItem>
              <SelectItem value="30">Next 30 days</SelectItem>
              <SelectItem value="60">Next 60 days</SelectItem>
              <SelectItem value="90">Next 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleResetFilters}>
          Reset
        </Button>
        <Button onClick={handleApplyFilters}>
          <Filter className="mr-2 h-4 w-4" /> Apply
        </Button>
      </div>
    </div>
  );

  if (!initialized && isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Compliance</h1>
          <p className="text-muted-foreground">Readiness, official docs, submissions, and expiries.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {readinessLegend.map(item => (
            <div key={item.key} className="flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1">
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${item.badgeClass}`}
              >
                {item.label}
              </span>
              <span className="text-xs text-muted-foreground">{item.description}</span>
            </div>
          ))}
        </div>
      </header>

      {renderFilters()}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map(kpi => (
          <Card key={kpi.key} className="border border-border/70 shadow-sm">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="mt-2 text-3xl font-semibold text-foreground">{kpi.value}</p>
              </div>
              <div className={`rounded-full bg-muted p-3 ${kpi.tone}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
        <Card className="border border-border/70 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Expiring docs (30d)</p>
            <p className="mt-2 text-3xl font-semibold text-foreground">
              {computeExpiries(documents, 30).length}
            </p>
            <p className="text-xs text-muted-foreground">Track renewals early.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="border border-border/70">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold">Readiness matrix</CardTitle>
              <p className="text-sm text-muted-foreground">All official documents per shipment.</p>
            </div>
            <Button variant="ghost" className="text-sm" onClick={() => navigate("/compliance/inbox")}>
              Compliance inbox <MoveRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shipment</TableHead>
                    <TableHead>Official documents</TableHead>
                    <TableHead>Issues</TableHead>
                    <TableHead>Costs</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        No shipments match your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map(row => (
                      <TableRow key={row.id} className="align-top">
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => handleOpenShipment(row)}
                            className="text-left text-sm font-semibold text-primary hover:underline"
                          >
                            {row.reference}
                          </button>
                          <p className="text-xs text-muted-foreground">{row.buyer}</p>
                          <p className="text-xs text-muted-foreground">{row.route}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {row.documents.map(doc => (
                              <button
                                key={doc.id}
                                type="button"
                                onClick={() => handleNavigateToDoc(doc.id)}
                                className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background px-3 py-1 text-xs shadow-sm transition-colors hover:border-primary"
                              >
                                <span className="font-medium text-foreground">{doc.docKey}</span>
                                <DocStatusBadge status={doc.status} muted />
                              </button>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {row.issues === 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                              <CheckCircle2 className="h-4 w-4" /> None
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                              <AlertTriangle className="h-4 w-4" /> {row.issues} open
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.costStatus === "balanced" ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                              <ShieldCheck className="h-4 w-4" /> Cleared
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-rose-600">
                              <AlertTriangle className="h-4 w-4" /> {row.costNote}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-medium text-foreground">{row.dueLabel || formatDueLabel(row.dueDate)}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7 text-xs">
                              <AvatarFallback>{row.ownerInitials}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">{row.owner}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => handleOpenShipment(row)}>
                            {getActionLabel(row)}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock3 className="h-5 w-5 text-muted-foreground" /> Upcoming expiries
            </CardTitle>
            <p className="text-sm text-muted-foreground">Renew ahead to avoid disruption.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {expiringDocuments.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No upcoming expiries.
              </div>
            ) : (
              expiringDocuments.map(doc => (
                <div
                  key={doc.id}
                  className="rounded-lg border border-border/60 bg-background/50 p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{doc.shipmentRef}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs"
                      onClick={() => handleNavigateToDoc(doc.id)}
                    >
                      View
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />
                    <span>
                      Expires {doc.expiryDate ? format(new Date(doc.expiryDate), "dd MMM yyyy") : "soon"} (
                      {doc.expiryDiff}d)
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
