// Global Documents index page with search and filter

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  FileText,
  Download,
  Eye,
  Search,
  Filter,
  Calendar as CalendarIcon,
} from 'lucide-react';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { mockApi } from '@/mocks/api';
import type { ShipmentDocument, DocStatus } from '@/mocks/seeds';
import type { DocKey } from '@/utils/rules';

const documentNameMap: Record<DocKey, string> = {
  INVOICE: 'Commercial Invoice',
  PACKING_LIST: 'Packing List',
  COO: 'Certificate of Origin',
  PHYTO: 'Phytosanitary Certificate',
  INSURANCE: 'Insurance Certificate',
  BILL_OF_LADING: 'Bill of Lading',
  CUSTOMS_EXPORT_DECLARATION: 'Customs Export Declaration',
};

const statusVariant = (status: DocStatus) => {
  switch (status) {
    case 'approved':
      return 'default';
    case 'generated':
    case 'draft':
      return 'secondary';
    default:
      return 'outline';
  }
};

const statusLabel = (status: DocStatus) => {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'generated':
      return 'Ready';
    case 'draft':
      return 'Draft';
    default:
      return 'Required';
  }
};

const docTypeOptions: { label: string; value: DocKey }[] = [
  { label: 'Commercial Invoice', value: 'INVOICE' },
  { label: 'Packing List', value: 'PACKING_LIST' },
  { label: 'Certificate of Origin', value: 'COO' },
  { label: 'Phytosanitary Certificate', value: 'PHYTO' },
  { label: 'Insurance Certificate', value: 'INSURANCE' },
  { label: 'Bill of Lading', value: 'BILL_OF_LADING' },
  { label: 'Customs Declaration', value: 'CUSTOMS_EXPORT_DECLARATION' },
];

const statusOptions: { label: string; value: DocStatus }[] = [
  { label: 'Required', value: 'required' },
  { label: 'Draft', value: 'draft' },
  { label: 'Ready', value: 'generated' },
  { label: 'Approved', value: 'approved' },
];

const formatDate = (value?: string) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatRangeLabel = (range: DateRange | undefined) => {
  if (!range?.from && !range?.to) return 'All dates';
  if (range?.from && range?.to) {
    return `${format(range.from, 'dd MMM yyyy')} - ${format(range.to, 'dd MMM yyyy')}`;
  }
  if (range?.from) {
    return `From ${format(range.from, 'dd MMM yyyy')}`;
  }
  if (range?.to) {
    return `Until ${format(range.to, 'dd MMM yyyy')}`;
  }
  return 'All dates';
};

export const DocumentsPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocTypes, setSelectedDocTypes] = useState<DocKey[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<DocStatus[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['all-documents'],
    queryFn: mockApi.listAllDocuments,
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => mockApi.listShipments(),
  });

  const shipmentsMap = useMemo(() => {
    return new Map(shipments.map(shipment => [shipment.id, shipment.reference]));
  }, [shipments]);

  const filteredDocuments = useMemo(() => {
    const fromTime = dateRange?.from ? new Date(dateRange.from).setHours(0, 0, 0, 0) : undefined;
    const toTime = dateRange?.to ? new Date(dateRange.to).setHours(23, 59, 59, 999) : undefined;
    const search = searchTerm.trim().toLowerCase();

    return documents.filter(doc => {
      const shipmentRef = shipmentsMap.get(doc.shipment_id) ?? '';
      const matchesSearch = !search || shipmentRef.toLowerCase().includes(search);
      const matchesDocType = selectedDocTypes.length === 0 || selectedDocTypes.includes(doc.doc_key);
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(doc.status);
      const currentVersion = doc.current_version ? doc.versions.find(v => v.version === doc.current_version) : undefined;
      const updatedAt = currentVersion ? new Date(currentVersion.created_at).getTime() : undefined;
      const withinRange =
        !fromTime && !toTime
          ? true
          : updatedAt
            ? (!fromTime || updatedAt >= fromTime) && (!toTime || updatedAt <= toTime)
            : false;

      return matchesSearch && matchesDocType && matchesStatus && withinRange;
    });
  }, [documents, shipmentsMap, searchTerm, selectedDocTypes, selectedStatuses, dateRange]);

  const handlePreview = (doc: ShipmentDocument) => {
    if (!doc.current_version) return;
    const currentVersion = doc.versions.find(v => v.version === doc.current_version);
    if (!currentVersion) return;

    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head><title>${currentVersion.fileName}</title></head>
          <body style="margin:0">
            <embed src="${currentVersion.fileDataUrl}" type="application/pdf" width="100%" height="100%" />
          </body>
        </html>
      `);
    }
  };

  const handleDownload = (doc: ShipmentDocument) => {
    if (!doc.current_version) return;
    const currentVersion = doc.versions.find(v => v.version === doc.current_version);
    if (!currentVersion) return;

    const link = document.createElement('a');
    link.href = currentVersion.fileDataUrl;
    link.download = currentVersion.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRowClick = (doc: ShipmentDocument) => {
    navigate(`/shipments/${doc.shipment_id}?tab=documents&highlight=${doc.doc_key}`);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedDocTypes([]);
    setSelectedStatuses([]);
    setDateRange(undefined);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground">Monitor every document generated across your shipments.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Search shipments</p>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by reference…"
                  value={searchTerm}
                  onChange={event => setSearchTerm(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Document types</p>
              <ToggleGroup
                type="multiple"
                value={selectedDocTypes}
                onValueChange={value => setSelectedDocTypes((value as DocKey[]) ?? [])}
                className="flex flex-wrap gap-2"
              >
                {docTypeOptions.map(option => (
                  <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    className="rounded-full px-3 py-1 text-xs data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                  >
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Status</p>
              <ToggleGroup
                type="multiple"
                value={selectedStatuses}
                onValueChange={value => setSelectedStatuses((value as DocStatus[]) ?? [])}
                className="flex flex-wrap gap-2"
              >
                {statusOptions.map(option => (
                  <ToggleGroupItem
                    key={option.value}
                    value={option.value}
                    className="rounded-full px-3 py-1 text-xs capitalize data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                  >
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Updated</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between text-left">
                    <span>{formatRangeLabel(dateRange)}</span>
                    <CalendarIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="start">
                  <Calendar
                    mode="range"
                    numberOfMonths={2}
                    selected={dateRange}
                    onSelect={setDateRange}
                    weekStartsOn={1}
                  />
                  <div className="mt-3 flex justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setDateRange(undefined)}>
                      Clear
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              Reset filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Documents ({filteredDocuments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted p-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No documents found</h3>
              <p className="text-muted-foreground">Adjust your filters to see more results.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shipment ref</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map(doc => {
                    const shipmentRef = shipmentsMap.get(doc.shipment_id) ?? 'Unknown shipment';
                    const currentVersion = doc.current_version
                      ? doc.versions.find(v => v.version === doc.current_version)
                      : undefined;

                    return (
                      <TableRow
                        key={doc.id}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => handleRowClick(doc)}
                      >
                        <TableCell className="font-medium">{shipmentRef}</TableCell>
                        <TableCell>{documentNameMap[doc.doc_key] ?? doc.doc_key}</TableCell>
                        <TableCell>{doc.current_version ? `v${doc.current_version}` : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(doc.status)} className="capitalize">
                            {statusLabel(doc.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{currentVersion ? formatDate(currentVersion.created_at) : '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={event => {
                                event.stopPropagation();
                                handlePreview(doc);
                              }}
                              disabled={!currentVersion}
                              aria-label="Preview document"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={event => {
                                event.stopPropagation();
                                handleDownload(doc);
                              }}
                              disabled={!currentVersion}
                              aria-label="Download document"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
