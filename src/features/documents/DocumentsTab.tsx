// Documents tab component for shipment detail page

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Download,
  Eye,
  Upload,
  CheckCircle,
  Plus,
  History,
  AlertTriangle,
  MoreVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { mockApi } from '@/mocks/api';
import { evaluateRules, type DocKey } from '@/utils/rules';
import { previewInvoiceNumber, previewPackingListNumber } from '@/utils/numbering';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import type {
  ShipmentWithItems,
  Product,
  ShipmentDocument,
  DocVersion,
  DocStatus,
} from '@/mocks/seeds';

interface DocumentsTabProps {
  shipment: ShipmentWithItems;
  products: Product[];
  onOpenDownloadCentre?: () => void;
}

const statusVariant = (status: DocStatus) => {
  switch (status) {
    case 'approved':
      return 'default';
    case 'generated':
      return 'secondary';
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

const documentNames: Record<DocKey, string> = {
  COO: 'Certificate of Origin',
  PHYTO: 'Phytosanitary Certificate',
  INSURANCE: 'Insurance Certificate',
  INVOICE: 'Commercial Invoice',
  PACKING_LIST: 'Packing List',
  BILL_OF_LADING: 'Bill of Lading',
  CUSTOMS_EXPORT_DECLARATION: 'Customs Export Declaration',
};

const docOrder: DocKey[] = [
  'INVOICE',
  'PACKING_LIST',
  'COO',
  'PHYTO',
  'INSURANCE',
  'BILL_OF_LADING',
  'CUSTOMS_EXPORT_DECLARATION',
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

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatFileSize = (dataUrl: string) => {
  const base64 = dataUrl.split(',')[1] ?? '';
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const size = Math.max(0, (base64.length * 3) / 4 - padding);
  if (size > 1_048_576) {
    return `${(size / 1_048_576).toFixed(2)} MB`;
  }
  if (size > 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${Math.round(size)} B`;
};

const getDocumentName = (docKey: DocKey) => documentNames[docKey] ?? docKey;

const canGenerate = (docKey: DocKey) => docKey === 'INVOICE' || docKey === 'PACKING_LIST';

const findVersion = (doc: ShipmentDocument) =>
  doc.current_version ? doc.versions.find(v => v.version === doc.current_version) : undefined;

export const DocumentsTab = ({ shipment, products, onOpenDownloadCentre }: DocumentsTabProps) => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const highlightParam = searchParams.get('highlight') as DocKey | null;
  const { user } = useAuthStore();
  const signatureDefault = user?.name ?? 'ProList Manufacturing Ltd';

  const [generateSheetOpen, setGenerateSheetOpen] = useState(false);
  const [currentDocKey, setCurrentDocKey] = useState<DocKey | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ShipmentDocument | null>(null);
  const [historyDoc, setHistoryDoc] = useState<ShipmentDocument | null>(null);
  const [approvingDoc, setApprovingDoc] = useState<ShipmentDocument | null>(null);
  const [approveNote, setApproveNote] = useState('');
  const [uploadDoc, setUploadDoc] = useState<ShipmentDocument | null>(null);
  const [uploadNote, setUploadNote] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [highlightedDocKey, setHighlightedDocKey] = useState<DocKey | null>(highlightParam);

  const [generateForm, setGenerateForm] = useState({
    number: '',
    date: new Date().toISOString().split('T')[0],
    signatureName: signatureDefault,
  });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['shipment-documents', shipment.id],
    queryFn: () => mockApi.listShipmentDocuments(shipment.id),
  });

  const documentRequirements = useMemo(
    () => evaluateRules(shipment, products),
    [shipment, products]
  );

  useEffect(() => {
    setHighlightedDocKey(highlightParam);
  }, [highlightParam]);

  useEffect(() => {
    if (highlightedDocKey) {
      const row = document.getElementById(`doc-row-${highlightedDocKey}`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('ring-2', 'ring-primary/40');
        const timeout = window.setTimeout(() => {
          row.classList.remove('ring-2', 'ring-primary/40');
        }, 2400);
        return () => window.clearTimeout(timeout);
      }
    }
    return undefined;
  }, [highlightedDocKey, documents]);

  useEffect(() => {
    if (generateSheetOpen && currentDocKey && canGenerate(currentDocKey)) {
      setGenerateForm(prev => ({
        ...prev,
        number:
          prev.number ||
          (currentDocKey === 'INVOICE' ? previewInvoiceNumber() : previewPackingListNumber()),
        signatureName: prev.signatureName || signatureDefault,
      }));
    }
  }, [generateSheetOpen, currentDocKey, signatureDefault]);

  const resetGenerateForm = () => {
    setGenerateForm({
      number: '',
      date: new Date().toISOString().split('T')[0],
      signatureName: signatureDefault,
    });
  };

  const sortedDocuments = useMemo(() => {
    const list = [...documents];
    list.sort((a, b) => {
      const aIndex = docOrder.indexOf(a.doc_key);
      const bIndex = docOrder.indexOf(b.doc_key);
      if (aIndex === -1 && bIndex === -1) return a.doc_key.localeCompare(b.doc_key);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
    return list;
  }, [documents]);

  const downloadVersion = (version: DocVersion) => {
    const link = document.createElement('a');
    link.href = version.fileDataUrl;
    link.download = version.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateMutation = useMutation({
    mutationFn: (params: { docKey: DocKey; payload: { number?: string; date: string; signatureName?: string } }) =>
      mockApi.generateDocument(shipment.id, params.docKey, params.payload),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['shipment-documents', shipment.id] });
      setGenerateSheetOpen(false);
      setCurrentDocKey(null);
      resetGenerateForm();
      const version = findVersion(doc);
      toast.success(`${getDocumentName(doc.doc_key)} generated`, {
        description: version ? `Version v${version.version} ready to preview.` : undefined,
        action: {
          label: 'Open',
          onClick: () => setPreviewDoc(doc),
        },
        cancel: version
          ? {
              label: 'Download',
              onClick: () => downloadVersion(version),
            }
          : undefined,
      });
    },
    onError: () => {
      toast.error('Failed to generate document');
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ docKey, file, note }: { docKey: DocKey; file: File; note?: string }) =>
      mockApi.uploadDocumentVersion(shipment.id, docKey, file, note),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['shipment-documents', shipment.id] });
      setUploadDoc(null);
      setUploadFile(null);
      setUploadNote('');
      toast.success(`${getDocumentName(doc.doc_key)} version uploaded`);
    },
    onError: () => {
      toast.error('Failed to upload document');
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({ docKey, note }: { docKey: DocKey; note: string }) =>
      mockApi.setDocumentStatus(shipment.id, docKey, 'approved', note),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['shipment-documents', shipment.id] });
      setApprovingDoc(null);
      setApproveNote('');
      toast.success(`${getDocumentName(doc.doc_key)} approved`);
    },
    onError: () => {
      toast.error('Failed to approve document');
    },
  });

  const setCurrentMutation = useMutation({
    mutationFn: ({ docKey, version }: { docKey: DocKey; version: number }) =>
      mockApi.setDocumentCurrentVersion(shipment.id, docKey, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment-documents', shipment.id] });
      toast.success('Current version updated');
    },
    onError: () => {
      toast.error('Could not set current version');
    },
  });

  const handleGenerate = () => {
    if (!currentDocKey) return;
    const payload = {
      number: generateForm.number.trim() || undefined,
      date: generateForm.date,
      signatureName: generateForm.signatureName.trim() || undefined,
    };
    generateMutation.mutate({ docKey: currentDocKey, payload });
  };

  const handleApprove = () => {
    if (!approvingDoc) return;
    if (!approveNote.trim()) {
      toast.error('Please provide an approval note');
      return;
    }
    approveMutation.mutate({ docKey: approvingDoc.doc_key, note: approveNote.trim() });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Submission packs</p>
          <p className="text-sm text-muted-foreground">Latest approved versions are included.</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="self-start border-slate-300 text-foreground hover:bg-slate-100 sm:self-auto"
          onClick={onOpenDownloadCentre}
          disabled={!onOpenDownloadCentre}
        >
          <Download className="mr-2 h-4 w-4" /> Download Centre
        </Button>
      </div>

      {documentRequirements.required.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Required Compliance Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {documentRequirements.required.map(docKey => (
                <Badge key={docKey} variant="outline" className="border-orange-500 text-orange-600">
                  {getDocumentName(docKey)}
                </Badge>
              ))}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              These documents are determined by the shipment route and product HS codes.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Shipment Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedDocuments.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted p-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No documents yet</h3>
              <p className="text-muted-foreground">
                Documents will appear here once this shipment is processed.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Issued By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedDocuments.map(doc => {
                    const currentVersion = findVersion(doc);
                    return (
                      <TableRow
                        key={doc.id}
                        id={`doc-row-${doc.doc_key}`}
                        className={cn(
                          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                          highlightedDocKey === doc.doc_key ? 'bg-primary/5' : undefined
                        )}
                        tabIndex={-1}
                      >
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-foreground">{getDocumentName(doc.doc_key)}</span>
                            </div>
                            {currentVersion && (
                              <span className="text-xs text-muted-foreground">
                                v{currentVersion.version} · {currentVersion.fileName}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {doc.doc_key === 'INVOICE' || doc.doc_key === 'PACKING_LIST'
                            ? 'ProList Manufacturing'
                            : 'External Authority'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(doc.status)} className="capitalize">
                            {statusLabel(doc.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {currentVersion ? formatDate(currentVersion.created_at) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canGenerate(doc.doc_key) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setCurrentDocKey(doc.doc_key);
                                  setGenerateSheetOpen(true);
                                  resetGenerateForm();
                                }}
                              >
                                <Plus className="mr-1 h-4 w-4" />
                                Generate
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" aria-label="Document actions">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  disabled={!currentVersion}
                                  onSelect={() => currentVersion && setPreviewDoc(doc)}
                                >
                                  <Eye className="mr-2 h-4 w-4" /> Preview
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={!currentVersion}
                                  onSelect={() => currentVersion && downloadVersion(currentVersion)}
                                >
                                  <Download className="mr-2 h-4 w-4" /> Download
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => setUploadDoc(doc)}>
                                  <Upload className="mr-2 h-4 w-4" /> Upload new version
                                </DropdownMenuItem>
                                {doc.status === 'generated' && (
                                  <DropdownMenuItem onSelect={() => {
                                    setApprovingDoc(doc);
                                    setApproveNote('');
                                  }}>
                                    <CheckCircle className="mr-2 h-4 w-4" /> Approve
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => setHistoryDoc(doc)}>
                                  <History className="mr-2 h-4 w-4" /> Version history
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

      <Sheet open={generateSheetOpen} onOpenChange={(open) => {
        setGenerateSheetOpen(open);
        if (!open) {
          setCurrentDocKey(null);
          resetGenerateForm();
        }
      }}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              Generate {currentDocKey ? getDocumentName(currentDocKey) : 'document'}
            </SheetTitle>
            <SheetDescription>
              Fill in the details to create a new PDF version. Numbers are prefilled but can be overridden.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-number">Document number</Label>
              <Input
                id="doc-number"
                value={generateForm.number}
                onChange={event => setGenerateForm(prev => ({ ...prev, number: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-date">Issue date</Label>
              <Input
                id="doc-date"
                type="date"
                value={generateForm.date}
                onChange={event => setGenerateForm(prev => ({ ...prev, date: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-signature">Signature name</Label>
              <Input
                id="doc-signature"
                value={generateForm.signatureName}
                onChange={event => setGenerateForm(prev => ({ ...prev, signatureName: event.target.value }))}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={generateMutation.isPending || !currentDocKey}
            >
              {generateMutation.isPending ? 'Generating…' : 'Generate PDF'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {previewDoc ? getDocumentName(previewDoc.doc_key) : 'Document'} preview
            </DialogTitle>
            <DialogDescription>
              {previewDoc && previewDoc.current_version
                ? `Version v${previewDoc.current_version}`
                : 'Latest version'}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-[500px]">
            {previewDoc && previewDoc.current_version && (
              <embed
                src={findVersion(previewDoc)?.fileDataUrl}
                type="application/pdf"
                width="100%"
                height="500px"
                className="rounded-md"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!uploadDoc} onOpenChange={(open) => {
        if (!open) {
          setUploadDoc(null);
          setUploadFile(null);
          setUploadNote('');
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload new version</DialogTitle>
            <DialogDescription>
              {uploadDoc ? getDocumentName(uploadDoc.doc_key) : 'Document'} for {shipment.reference}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-file">PDF file</Label>
              <Input
                id="doc-file"
                type="file"
                accept="application/pdf"
                onChange={event => setUploadFile(event.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-note">Note</Label>
              <Textarea
                id="doc-note"
                placeholder="Optional note for this version"
                value={uploadNote}
                onChange={event => setUploadNote(event.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={!uploadDoc || !uploadFile || uploadMutation.isPending}
              onClick={() => {
                if (uploadDoc && uploadFile) {
                  uploadMutation.mutate({ docKey: uploadDoc.doc_key, file: uploadFile, note: uploadNote.trim() || undefined });
                }
              }}
            >
              {uploadMutation.isPending ? 'Uploading…' : 'Upload version'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!approvingDoc} onOpenChange={(open) => {
        if (!open) {
          setApprovingDoc(null);
          setApproveNote('');
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve document</AlertDialogTitle>
            <AlertDialogDescription>
              Provide a short note to confirm approval of {approvingDoc ? getDocumentName(approvingDoc.doc_key) : 'document'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="approval-note">Approval note</Label>
            <Textarea
              id="approval-note"
              placeholder="e.g. Matches signed commercial terms"
              value={approveNote}
              onChange={event => setApproveNote(event.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!approveNote.trim() || approveMutation.isPending}
              onClick={handleApprove}
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Drawer open={!!historyDoc} onOpenChange={(open) => {
        if (!open) {
          setHistoryDoc(null);
        }
      }}>
        <DrawerContent className="max-h-[80vh] overflow-y-auto">
          <DrawerHeader>
            <DrawerTitle>
              {historyDoc ? getDocumentName(historyDoc.doc_key) : 'Document'} versions
            </DrawerTitle>
            <DrawerDescription>{shipment.reference}</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-4 p-4">
            {historyDoc?.versions.map(version => (
              <div
                key={version.id}
                className={cn(
                  'flex flex-col gap-2 rounded-xl border p-4 md:flex-row md:items-center md:justify-between',
                  historyDoc.current_version === version.version ? 'border-primary/50 bg-primary/5' : undefined
                )}
              >
                <div className="space-y-1">
                  <p className="font-medium text-foreground">
                    Version v{version.version}
                    {historyDoc.current_version === version.version && (
                      <Badge className="ml-2" variant="secondary">
                        Current
                      </Badge>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(version.created_at)} · {formatFileSize(version.fileDataUrl)}
                  </p>
                  {version.note && (
                    <p className="text-sm text-muted-foreground">{version.note}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => downloadVersion(version)}>
                    <Download className="mr-1 h-4 w-4" /> Download
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={historyDoc.current_version === version.version || setCurrentMutation.isPending}
                    onClick={() =>
                      setCurrentMutation.mutate({ docKey: historyDoc.doc_key, version: version.version })
                    }
                  >
                    Make current
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};
