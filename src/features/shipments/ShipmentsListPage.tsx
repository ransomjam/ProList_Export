// Shipments list page with table, search, filter, sort, and pagination

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowUpDown,
  AlertTriangle,
  ArrowRight,
  MapPin,
  MoreHorizontal,
} from 'lucide-react';
import { mockApi } from '@/mocks/api';
import { abbreviateFcfa } from '@/utils/currency';
import type { ShipmentWithItems, Product } from '@/mocks/seeds';

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'cleared':
      return 'default';
    case 'submitted':
      return 'secondary';
    case 'draft':
    default:
      return 'outline';
  }
};

export const ShipmentsListPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'value'>('updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const {
    data: shipments,
    isLoading,
    error
  } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => mockApi.listShipments(),
  });

  const {
    data: products,
    isLoading: isLoadingProducts,
    error: productsError,
  } = useQuery({
    queryKey: ['products'],
    queryFn: () => mockApi.listProducts(),
  });

  const productLookup = useMemo(() => {
    const lookup = new Map<string, Product>();
    (products || []).forEach(product => {
      lookup.set(product.id, product);
    });
    return lookup;
  }, [products]);

  // Filter and sort shipments
  const filteredShipments = (shipments || [])
    .filter(shipment => {
      const matchesSearch = 
        shipment.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shipment.buyer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;
      const matchesMode = modeFilter === 'all' || shipment.mode === modeFilter;
      
      return matchesSearch && matchesStatus && matchesMode;
    })
    .sort((a, b) => {
      let compareValue = 0;
      
      if (sortBy === 'updated') {
        compareValue = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      } else if (sortBy === 'value') {
        compareValue = a.value_fcfa - b.value_fcfa;
      }
      
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

  // Pagination
  const totalPages = Math.ceil(filteredShipments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedShipments = filteredShipments.slice(startIndex, startIndex + itemsPerPage);

  const formatDisplayDate = (dateString: string | Date | undefined | null) => {
    if (!dateString) {
      return '';
    }

    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const day = date.getDate();
    const month = date.toLocaleString('en-GB', { month: 'short' });
    const normalizedMonth = month === 'Sep' ? 'Sept' : month;
    const year = date.getFullYear();

    return `${day} ${normalizedMonth} ${year}`;
  };

  const getRouteParts = (route?: string) => {
    if (!route) {
      return { origin: '—', destination: '—' };
    }

    const [originRaw, destinationRaw] = route.split('→').map(part => part.trim());
    return {
      origin: originRaw || '—',
      destination: destinationRaw || '—',
    };
  };

  const statusPillStyles: Record<string, string> = {
    draft: 'bg-amber-50 text-amber-700 border border-amber-200',
    submitted: 'bg-sky-50 text-sky-700 border border-sky-200',
    cleared: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  };

  const productAliases: Record<string, string> = {
    p_1: 'Cocoa Beans',
    p_2: 'Coffee 60kg',
    p_3: 'Sawn Timber',
  };

  const getInternalCode = (shipment: ShipmentWithItems) => {
    const { destination } = getRouteParts(shipment.route);
    const destCode = destination.replace(/[^A-Z]/gi, '').slice(0, 3).toUpperCase() || 'RTE';
    const refTail = shipment.reference.slice(-3);
    return `EXP-${destCode}-${refTail}`;
  };

  const getShipmentWeight = (shipment: ShipmentWithItems) => {
    if (!shipment.items?.length) {
      return null;
    }

    const total = shipment.items.reduce((acc, item) => {
      const product = item.product_id ? productLookup.get(item.product_id) : undefined;
      const weight = product?.weight_kg ?? 0;
      const quantity = item.quantity ?? 0;
      return acc + weight * quantity;
    }, 0);

    return total > 0 ? total : null;
  };

  const getProductChips = (shipment: ShipmentWithItems) => {
    if (!shipment.items?.length) {
      return [] as string[];
    }

    const labels = shipment.items
      .map(item => {
        if (!item.product_id) {
          return null;
        }
        const product = productLookup.get(item.product_id);
        if (!product) {
          return null;
        }

        return productAliases[item.product_id] ?? product.name;
      })
      .filter((label): label is string => Boolean(label));

    return Array.from(new Set(labels));
  };

  const getProgressDetails = (shipment: ShipmentWithItems) => {
    const seedValue = Number.parseInt(shipment.id.replace(/\D/g, ''), 10) || 0;
    const baseByStatus: Record<ShipmentWithItems['status'], { base: number; hint: string }> = {
      draft: { base: 38, hint: 'Documents pending' },
      submitted: { base: 72, hint: 'Awaiting approval' },
      cleared: { base: 100, hint: 'Ready to submit' },
    };

    const statusMeta = baseByStatus[shipment.status] ?? baseByStatus.draft;
    const offset = shipment.status === 'cleared' ? 0 : (seedValue % 6) * 3;
    const percent = shipment.status === 'cleared'
      ? 100
      : Math.min(96, statusMeta.base + offset);

    const updatedDate = shipment.updated_at ? new Date(shipment.updated_at) : null;
    let statusLabel = 'In progress';

    if (shipment.status === 'draft') {
      statusLabel = 'Awaiting docs';
    } else if (shipment.status === 'submitted') {
      const eta = updatedDate ? new Date(updatedDate) : new Date();
      eta.setDate(eta.getDate() + 6 + (seedValue % 4));
      statusLabel = `ETA ${formatDisplayDate(eta)}`;
    } else if (shipment.status === 'cleared') {
      statusLabel = `Cleared ${formatDisplayDate(updatedDate ?? new Date())}`;
    }

    return {
      percent,
      hint: statusMeta.hint,
      statusLabel,
    };
  };

  const handleRowClick = (shipmentId: string) => {
    navigate(`/shipments/${shipmentId}`);
  };

  const toggleSort = (newSortBy: 'updated' | 'value') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  const isLoadingState = isLoading || (viewMode === 'cards' && isLoadingProducts);

  if (error || productsError) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Shipments</h1>
            <p className="text-muted-foreground">Manage your export shipments</p>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load shipments data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Shipments</h1>
          <p className="text-muted-foreground">Manage your export shipments</p>
        </div>
        <Button onClick={() => navigate('/shipments/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New Shipment
        </Button>
      </div>

      <Card className="overflow-hidden border-none bg-transparent shadow-none">
        <CardHeader className="space-y-4 rounded-3xl border border-border/60 bg-muted/10 p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl font-semibold">All Shipments</CardTitle>
              <p className="text-sm text-muted-foreground">
                Showing {filteredShipments.length} {filteredShipments.length === 1 ? 'result' : 'results'}
              </p>
            </div>

            <ToggleGroup
              type="single"
              size="sm"
              variant="outline"
              value={viewMode}
              onValueChange={(value) => {
                if (value) {
                  setViewMode(value as 'cards' | 'table');
                }
              }}
              className="self-stretch rounded-full border border-border/60 bg-background/80 p-1 shadow-sm sm:self-auto"
            >
              <ToggleGroupItem
                value="cards"
                className="rounded-full px-4 py-2 text-sm font-medium data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
              >
                Cards
              </ToggleGroupItem>
              <ToggleGroupItem
                value="table"
                className="rounded-full px-4 py-2 text-sm font-medium data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
              >
                Table
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search and filters */}
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap lg:w-auto">
              <div className="relative w-full sm:max-w-[18rem]">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search shipments"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-11 w-full rounded-full border border-border/60 bg-background/70 pl-11 text-sm shadow-inner"
                  aria-label="Search shipments"
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-11 w-full rounded-full border border-border/60 bg-background/70 text-sm sm:w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="cleared">Cleared</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={modeFilter}
                onValueChange={(value) => {
                  setModeFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-11 w-full rounded-full border border-border/60 bg-background/70 text-sm sm:w-28">
                  <SelectValue placeholder="Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All modes</SelectItem>
                  <SelectItem value="SEA">Sea</SelectItem>
                  <SelectItem value="AIR">Air</SelectItem>
                  <SelectItem value="ROAD">Road</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {isLoadingState ? (
            viewMode === 'cards' ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: Math.max(3, Math.min(itemsPerPage, 6)) }).map((_, index) => (
                  <div
                    key={index}
                    className="flex flex-col gap-5 rounded-3xl border border-border/50 bg-background/80 p-6 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <Skeleton className="h-5 w-2/5" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-2 w-full rounded-full" />
                        <Skeleton className="h-3 w-20 rounded-full" />
                      </div>
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {Array.from({ length: 4 }).map((_, statIndex) => (
                        <div
                          key={statIndex}
                          className="rounded-2xl border border-border/40 bg-white/70 p-3 shadow-inner"
                        >
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="mt-2 h-3 w-1/2" />
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-6 w-28 rounded-full" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-12 rounded-full" />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <Skeleton className="h-10 w-full rounded-full sm:w-40" />
                      <Skeleton className="h-10 w-10 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {Array.from({ length: Math.max(3, Math.min(itemsPerPage, 6)) }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-full rounded-2xl" />
                  </div>
                ))}
              </div>
            )
          ) : filteredShipments.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border/60 bg-background/70 py-12 text-center shadow-inner">
              <p className="max-w-sm text-base text-muted-foreground">
                {searchQuery || statusFilter !== 'all' || modeFilter !== 'all'
                  ? 'No shipments match your filters. Try adjusting your search or clearing the filters.'
                  : 'You do not have any shipments yet. Create your first shipment to start tracking every milestone.'}
              </p>
              <Button
                size="sm"
                className="rounded-full px-5"
                onClick={() => navigate('/shipments/new')}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Shipment
              </Button>
            </div>
          ) : (
            <>
              {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {paginatedShipments.map(shipment => {
                    const { origin, destination } = getRouteParts(shipment.route);
                    const statusStyles = statusPillStyles[shipment.status] ?? statusPillStyles.draft;
                    const progress = getProgressDetails(shipment);
                    const weight = getShipmentWeight(shipment);
                    const chips = getProductChips(shipment);
                    const extraChips = chips.length > 2 ? chips.length - 2 : 0;

                    return (
                      <div
                        key={shipment.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`View details for shipment ${shipment.reference}`}
                        onClick={() => handleRowClick(shipment.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleRowClick(shipment.id);
                          }
                        }}
                        className="group relative flex h-full flex-col gap-6 rounded-3xl border border-border/60 bg-gradient-to-br from-white via-background/80 to-muted/40 p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <p className="text-sm uppercase tracking-wide text-muted-foreground">Reference</p>
                            <h3 className="text-lg font-semibold text-foreground">{shipment.reference}</h3>
                          </div>
                          <span className={`capitalize rounded-full px-3 py-1 text-xs font-medium ${statusStyles}`}>
                            {shipment.status}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-muted-foreground">
                            <span className="inline-flex items-center gap-1 text-foreground">
                              <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                              {origin}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            <span className="inline-flex items-center gap-1 text-foreground">
                              <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
                              {destination}
                            </span>
                          </div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {getInternalCode(shipment)}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-start gap-4">
                            <div
                              className="relative h-2 flex-1 rounded-full bg-primary/10"
                              role="progressbar"
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={progress.percent}
                            >
                              <span
                                className="absolute left-0 top-0 h-full rounded-full bg-primary/80"
                                style={{ width: `${progress.percent}%` }}
                                aria-hidden="true"
                              />
                            </div>
                            <div className="flex min-w-[5.5rem] flex-col items-end text-xs">
                              <span className="font-semibold text-foreground">{progress.percent}%</span>
                              <span className="text-muted-foreground">{progress.statusLabel}</span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground">{progress.hint}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <div className="rounded-2xl border border-border/60 bg-white/70 p-3 shadow-inner">
                            <p className="text-right text-sm font-semibold text-foreground">{abbreviateFcfa(shipment.value_fcfa)}</p>
                            <p className="text-right text-xs text-muted-foreground">Value</p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-white/70 p-3 shadow-inner">
                            <p className="text-right text-sm font-semibold text-foreground">
                              {weight ? `${weight.toLocaleString('en-US')} kg` : '—'}
                            </p>
                            <p className="text-right text-xs text-muted-foreground">Weight</p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-white/70 p-3 shadow-inner">
                            <p className="text-right text-sm font-semibold text-foreground">{shipment.incoterm}</p>
                            <p className="text-right text-xs text-muted-foreground">Incoterm</p>
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-white/70 p-3 shadow-inner">
                            <p className="text-right text-sm font-semibold text-foreground">
                              {shipment.status === 'submitted' ? progress.statusLabel : formatDisplayDate(shipment.updated_at) || '—'}
                            </p>
                            <p className="text-right text-xs text-muted-foreground">
                              {shipment.status === 'submitted' ? 'ETA' : 'Updated'}
                            </p>
                          </div>
                        </div>

                        {chips.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {chips.slice(0, 2).map(chip => (
                              <span
                                key={chip}
                                className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                              >
                                {chip}
                              </span>
                            ))}
                            {extraChips > 0 && (
                              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                                +{extraChips}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
                          <Button
                            variant="secondary"
                            className="rounded-full px-4 py-2 text-sm shadow-sm transition-colors hover:bg-secondary/80"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRowClick(shipment.id);
                            }}
                          >
                            View details
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full border border-transparent bg-muted/60 text-muted-foreground transition-colors hover:bg-muted"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open shipment actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 rounded-2xl">
                              <DropdownMenuItem onSelect={() => {}}>View details</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => {}}>Duplicate</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => {}}>Delete</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => {}}>Open Documents</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => {}}>Create Issue</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-3xl border border-border/60 bg-background/80 shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reference</TableHead>
                        <TableHead>Buyer</TableHead>
                        <TableHead className="hidden sm:table-cell">Incoterm</TableHead>
                        <TableHead className="hidden md:table-cell">Mode</TableHead>
                        <TableHead className="hidden lg:table-cell">Route</TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSort('value')}
                            className="h-auto p-0 font-medium"
                          >
                            Value
                            <ArrowUpDown className="ml-1 h-3 w-3" />
                          </Button>
                        </TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden sm:table-cell">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSort('updated')}
                            className="h-auto p-0 font-medium"
                          >
                            Updated
                            <ArrowUpDown className="ml-1 h-3 w-3" />
                          </Button>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedShipments.map((shipment) => (
                        <TableRow
                          key={shipment.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleRowClick(shipment.id)}
                        >
                          <TableCell className="font-medium">{shipment.reference}</TableCell>
                          <TableCell>
                            <div className="max-w-[180px] truncate">{shipment.buyer}</div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline" className="font-mono text-xs">
                              {shipment.incoterm}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="secondary" className="text-xs">
                              {shipment.mode}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                            {shipment.route}
                          </TableCell>
                          <TableCell className="font-medium">{abbreviateFcfa(shipment.value_fcfa)}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(shipment.status)} className="capitalize">
                              {shipment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                            {formatDisplayDate(shipment.updated_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Show</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>of {filteredShipments.length} shipments</span>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};