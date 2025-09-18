// Documents tab component for shipment detail page

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
  Clock,
  Plus,
  History,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { mockApi } from '@/mocks/api';
import { evaluateRules } from '@/utils/rules';
import type { ShipmentWithItems, Product, ShipmentDocument, DocVersion, DocStatus } from '@/mocks/seeds';
import type { DocKey } from '@/utils/rules';

interface DocumentsTabProps {
  shipment: ShipmentWithItems;
  products: Product[];
}

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

const getIssuedBy = (docKey: DocKey): string => {
  switch (docKey) {
    case 'COO':
      return 'Chamber of Commerce';
    case 'PHYTO':
      return 'Ministry of Agriculture';
    case 'INSURANCE':
      return 'Insurance Company';
    case 'INVOICE':
    case 'PACKING_LIST':
      return 'ProList Manufacturing';
    default:
      return 'External Authority';
  }
};

const canGenerate = (docKey: DocKey): boolean => {
  return docKey === 'INVOICE' || docKey === 'PACKING_LIST';
};

export const DocumentsTab = ({ shipment, products }: DocumentsTabProps) => {
  const queryClient = useQueryClient();
  const [generateSheetOpen, setGenerateSheetOpen] = useState(false);
  const [currentDocKey, setCurrentDocKey] = useState<DocKey | null>(null);
  const [previewDoc, setPreviewDoc] = useState<ShipmentDocument | null>(null);
  const [versionsDoc, setVersionsDoc] = useState<ShipmentDocument | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Form states
  const [generateForm, setGenerateForm] = useState({
    number: '',
    date: new Date().toISOString().split('T')[0],
    signatureName: 'ProList Manufacturing Ltd',
  });
  const [approveNote, setApproveNote] = useState('');

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['shipment-documents', shipment.id],
    queryFn: () => mockApi.listShipmentDocuments(shipment.id),
  });

  // Generate document mutation
  const generateMutation = useMutation({
    mutationFn: (params: { docKey: DocKey; payload: any }) =>
      mockApi.generateDocument(shipment.id, params.docKey, params.payload),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['shipment-documents', shipment.id] });
      setGenerateSheetOpen(false);
      setCurrentDocKey(null);
      resetGenerateForm();
      
      toast.success(`${getDocumentName(doc.doc_key)} generated successfully`, {
        action: {
          label: 'Preview',
          onClick: () => setPreviewDoc(doc),
        },
      });
    },
    onError: () => {
      toast.error('Failed to generate document');
    },
  });

  // Upload document mutation
  const uploadMutation = useMutation({
    mutationFn: (params: { docKey: DocKey; file: File; note?: string }) =>
      mockApi.uploadDocumentVersion(shipment.id, params.docKey, params.file, params.note),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['shipment-documents', shipment.id] });
      setUploadFile(null);
      toast.success(`${getDocumentName(doc.doc_key)} uploaded successfully`);
    },
    onError: () => {
      toast.error('Failed to upload document');
    },
  });

  // Approve document mutation
  const approveMutation = useMutation({
    mutationFn: (params: { docKey: DocKey; note: string }) =>
      mockApi.setDocumentStatus(shipment.id, params.docKey, 'approved', params.note),
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['shipment-documents', shipment.id] });
      setApproveNote('');
      toast.success(`${getDocumentName(doc.doc_key)} approved`);
    },
    onError: () => {
      toast.error('Failed to approve document');
    },
  });

  const resetGenerateForm = () => {
    setGenerateForm({
      number: '',
      date: new Date().toISOString().split('T')[0],
      signatureName: 'ProList Manufacturing Ltd',
    });
  };

  const handleGenerate = () => {
    if (!currentDocKey) return;
    
    generateMutation.mutate({
      docKey: currentDocKey,
      payload: generateForm,
    });
  };

  const handleUpload = (docKey: DocKey) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        uploadMutation.mutate({ docKey, file });
      }
    };
    input.click();
  };

  const handlePreview = (doc: ShipmentDocument) => {
    if (doc.current_version && doc.versions.length > 0) {
      const currentVersion = doc.versions.find(v => v.version === doc.current_version);
      if (currentVersion) {
        setPreviewDoc(doc);
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

  const handleApprove = (doc: ShipmentDocument) => {
    if (!approveNote.trim()) {
      toast.error('Please provide an approval note');
      return;
    }
    
    approveMutation.mutate({
      docKey: doc.doc_key,
      note: approveNote,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Evaluate document requirements
  const documentRequirements = evaluateRules(shipment, products);

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
      {/* Required Documents Panel */}
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
              {documentRequirements.required.map((docKey) => (
                <Badge key={docKey} variant="outline" className="text-orange-600 border-orange-600">
                  {getDocumentName(docKey)}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              These documents are required based on your destination and products.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Shipment Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length > 0 ? (
            <div className="rounded-md border">
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
                  {documents.map((doc) => {
                    const currentVersion = doc.current_version && doc.versions.length > 0
                      ? doc.versions.find(v => v.version === doc.current_version)
                      : null;
                    
                    return (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{getDocumentName(doc.doc_key)}</p>
                              {currentVersion && (
                                <p className="text-xs text-muted-foreground">
                                  v{currentVersion.version} • {currentVersion.fileName}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getIssuedBy(doc.doc_key)}</TableCell>
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
                            {/* Generate Button */}
                            {canGenerate(doc.doc_key) && doc.status === 'required' && (
                              <Sheet open={generateSheetOpen && currentDocKey === doc.doc_key} onOpenChange={(open) => {
                                setGenerateSheetOpen(open);
                                if (open) {
                                  setCurrentDocKey(doc.doc_key);
                                } else {
                                  setCurrentDocKey(null);
                                  resetGenerateForm();
                                }
                              }}>
                                <SheetTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Plus className="h-4 w-4 mr-1" />
                                    Generate
                                  </Button>
                                </SheetTrigger>
                                <SheetContent>
                                  <SheetHeader>
                                    <SheetTitle>Generate {getDocumentName(doc.doc_key)}</SheetTitle>
                                    <SheetDescription>
                                      Complete the form to generate a new document version.
                                    </SheetDescription>
                                  </SheetHeader>
                                  <div className="space-y-4 mt-6">
                                    <div className="space-y-2">
                                      <Label htmlFor="number">Document Number</Label>
                                      <Input
                                        id="number"
                                        placeholder="Auto-generated if empty"
                                        value={generateForm.number}
                                        onChange={(e) => setGenerateForm(prev => ({ ...prev, number: e.target.value }))}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="date">Date</Label>
                                      <Input
                                        id="date"
                                        type="date"
                                        value={generateForm.date}
                                        onChange={(e) => setGenerateForm(prev => ({ ...prev, date: e.target.value }))}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label htmlFor="signature">Signature Name</Label>
                                      <Input
                                        id="signature"
                                        value={generateForm.signatureName}
                                        onChange={(e) => setGenerateForm(prev => ({ ...prev, signatureName: e.target.value }))}
                                      />
                                    </div>
                                    <Button 
                                      onClick={handleGenerate}
                                      disabled={generateMutation.isPending}
                                      className="w-full"
                                    >
                                      {generateMutation.isPending ? 'Generating...' : 'Generate Document'}
                                    </Button>
                                  </div>
                                </SheetContent>
                              </Sheet>
                            )}

                            {/* Preview Button */}
                            {currentVersion && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePreview(doc)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}

                            {/* Download Button */}
                            {currentVersion && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(doc)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}

                            {/* Upload Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpload(doc.doc_key)}
                              disabled={uploadMutation.isPending}
                            >
                              <Upload className="h-4 w-4" />
                            </Button>

                            {/* Approve Button */}
                            {doc.status === 'generated' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Approve Document</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Please provide an approval note for {getDocumentName(doc.doc_key)}.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <div className="space-y-2">
                                    <Label htmlFor="approve-note">Approval Note</Label>
                                    <Textarea
                                      id="approve-note"
                                      placeholder="Enter approval note..."
                                      value={approveNote}
                                      onChange={(e) => setApproveNote(e.target.value)}
                                    />
                                  </div>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setApproveNote('')}>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleApprove(doc)}
                                      disabled={!approveNote.trim() || approveMutation.isPending}
                                    >
                                      Approve
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}

                            {/* History Button */}
                            {doc.versions.length > 0 && (
                              <Drawer>
                                <DrawerTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <History className="h-4 w-4" />
                                  </Button>
                                </DrawerTrigger>
                                <DrawerContent>
                                  <DrawerHeader>
                                    <DrawerTitle>Version History</DrawerTitle>
                                    <DrawerDescription>
                                      {getDocumentName(doc.doc_key)} versions for {shipment.reference}
                                    </DrawerDescription>
                                  </DrawerHeader>
                                  <div className="p-4 max-h-96 overflow-y-auto">
                                    <div className="space-y-4">
                                      {doc.versions.map((version) => (
                                        <div key={version.id} className="flex items-center justify-between p-3 border rounded-lg">
                                          <div>
                                            <p className="font-medium">
                                              Version {version.version}
                                              {doc.current_version === version.version && (
                                                <Badge variant="default" className="ml-2">Current</Badge>
                                              )}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                              {version.fileName} • {formatDate(version.created_at)}
                                            </p>
                                            {version.note && (
                                              <p className="text-xs text-muted-foreground mt-1">{version.note}</p>
                                            )}
                                          </div>
                                          <div className="flex gap-2">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                const link = document.createElement('a');
                                                link.href = version.fileDataUrl;
                                                link.download = version.fileName;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                              }}
                                            >
                                              <Download className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </DrawerContent>
                              </Drawer>
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
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No Documents Yet</h3>
              <p className="text-muted-foreground">
                Documents will be automatically catalogued once you submit this shipment.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      {previewDoc && (
        <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{getDocumentName(previewDoc.doc_key)} Preview</DialogTitle>
              <DialogDescription>
                Version {previewDoc.current_version} of {previewDoc.versions.find(v => v.version === previewDoc.current_version)?.fileName}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-[500px]">
              {previewDoc.current_version && previewDoc.versions.length > 0 && (
                <embed
                  src={previewDoc.versions.find(v => v.version === previewDoc.current_version)?.fileDataUrl}
                  type="application/pdf"
                  width="100%"
                  height="500px"
                  className="rounded-md"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};