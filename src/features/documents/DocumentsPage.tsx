// Global Documents index page with search and filter

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Download, Eye, Search, Filter } from 'lucide-react';
import { mockApi } from '@/mocks/api';
import type { ShipmentDocument, DocStatus } from '@/mocks/seeds';
import type { DocKey } from '@/utils/rules';

const getStatusVariant = (status: DocStatus) => {
  switch (status) {
    case 'approved':
      return 'default';
    case 'generated':
      return 'secondary';
    case 'required':
    default:
      return 'outline';
  }
};

const getStatusColor = (status: DocStatus) => {
  switch (status) {
    case 'approved':
      return 'text-green-600';
    case 'generated':
      return 'text-blue-600';
    case 'required':
    default:
      return 'text-orange-600';
  }
};

const getDocumentName = (docKey: DocKey): string => {
  switch (docKey) {
    case 'COO':
      return 'Certificate of Origin';
    case 'PHYTO':
      return 'Phytosanitary Certificate';
    case 'INSURANCE':
      return 'Insurance Certificate';
    case 'INVOICE':
      return 'Commercial Invoice';
    case 'PACKING_LIST':
      return 'Packing List';
    default:
      return docKey;
  }
};

export const DocumentsPage = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all');

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['all-documents'],
    queryFn: mockApi.listAllDocuments,
  });

  const { data: shipments = [] } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => mockApi.listShipments(),
  });

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const shipment = shipments.find(s => s.id === doc.shipment_id);
    const matchesSearch = !searchTerm || 
      (shipment?.reference.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    const matchesDocType = docTypeFilter === 'all' || doc.doc_key === docTypeFilter;
    
    return matchesSearch && matchesStatus && matchesDocType;
  });

  const handlePreview = (doc: ShipmentDocument) => {
    if (doc.current_version && doc.versions.length > 0) {
      const currentVersion = doc.versions.find(v => v.version === doc.current_version);
      if (currentVersion) {
        // Open PDF in new window
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head><title>${currentVersion.fileName}</title></head>
              <body style="margin:0;">
                <embed src="${currentVersion.fileDataUrl}" type="application/pdf" width="100%" height="100%" />
              </body>
            </html>
          `);
        }
      }
    }
  };

  const handleDownload = (doc: ShipmentDocument) => {
    if (doc.current_version && doc.versions.length > 0) {
      const currentVersion = doc.versions.find(v => v.version === doc.current_version);
      if (currentVersion) {
        const link = document.createElement('a');
        link.href = currentVersion.fileDataUrl;
        link.download = currentVersion.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  const handleRowClick = (doc: ShipmentDocument) => {
    navigate(`/shipments/${doc.shipment_id}?tab=documents&highlight=${doc.doc_key}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
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
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Documents</h1>
          <p className="text-muted-foreground">
            Manage all shipment documents across your organisation
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Shipments</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by shipment reference..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Document Type</label>
              <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="INVOICE">Commercial Invoice</SelectItem>
                  <SelectItem value="PACKING_LIST">Packing List</SelectItem>
                  <SelectItem value="COO">Certificate of Origin</SelectItem>
                  <SelectItem value="PHYTO">Phytosanitary Certificate</SelectItem>
                  <SelectItem value="INSURANCE">Insurance Certificate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="required">Required</SelectItem>
                  <SelectItem value="generated">Generated</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Documents ({filteredDocuments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDocuments.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shipment Ref</TableHead>
                    <TableHead>Document</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => {
                    const shipment = shipments.find(s => s.id === doc.shipment_id);
                    const currentVersion = doc.current_version && doc.versions.length > 0
                      ? doc.versions.find(v => v.version === doc.current_version)
                      : null;
                    
                    return (
                      <TableRow 
                        key={doc.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRowClick(doc)}
                      >
                        <TableCell className="font-medium">
                          {shipment?.reference || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            {getDocumentName(doc.doc_key)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {doc.current_version ? `v${doc.current_version}` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(doc.status)} className="capitalize">
                            {doc.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {currentVersion ? formatDate(currentVersion.created_at) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {currentVersion && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePreview(doc);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownload(doc);
                                  }}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="rounded-full bg-muted p-4 w-16 h-16 mx-auto mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No Documents Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || docTypeFilter !== 'all'
                  ? 'Try adjusting your filters to see more results.'
                  : 'Documents will appear here once you start creating shipments.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};