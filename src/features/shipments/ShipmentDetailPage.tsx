// Shipment detail page with tabs and overview

import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
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
  
  ArrowLeft,
  Plus,
  Edit,
  Send,
  Trash2,
  Package,
  Users,
  DollarSign,
  Weight,
  CheckCircle,
  Clock,
  FileText,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { mockApi } from '@/mocks/api';
import { formatFcfa } from '@/utils/currency';
import { evaluateRules, type DocKey } from '@/utils/rules';
import { DocumentsTab } from '@/features/documents/DocumentsTab';
import { IssuesTab } from '@/features/issues/components/IssuesTab';
import { TimelineTab } from '@/features/issues/components/TimelineTab';
import { CostsTab } from '@/features/costs/CostsTab';
import { HsQuickPicker } from '@/features/hs/components/HsQuickPicker';
import { isPhytoHs } from '@/utils/hs';
import type { ShipmentWithItems, Product, ShipmentDocument, DocStatus } from '@/mocks/seeds';

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

const getStatusColor = (status: string) => {
  switch (status) {
    case 'cleared':
      return 'text-green-600';
    case 'submitted':
      return 'text-blue-600';
    case 'draft':
    default:
      return 'text-orange-600';
  }
};

const docStatusVariant = (status: DocStatus) => {
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

const docStatusLabel = (status: DocStatus) => {
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

const documentNameMap: Record<DocKey, string> = {
  INVOICE: 'Commercial Invoice',
  PACKING_LIST: 'Packing List',
  COO: 'Certificate of Origin',
  PHYTO: 'Phytosanitary Certificate',
  INSURANCE: 'Insurance Certificate',
  BILL_OF_LADING: 'Bill of Lading',
  CUSTOMS_EXPORT_DECLARATION: 'Customs Export Declaration',
};

const ComingSoonTab = ({ title }: { title: string }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="rounded-full bg-muted p-4 mb-4">
      <Clock className="h-8 w-8 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-medium mb-2">{title}</h3>
    <p className="text-muted-foreground max-w-md">
      This feature is coming soon. We're working hard to bring you comprehensive 
      shipment management tools.
    </p>
  </div>
);

export const ShipmentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam ?? 'overview');
  const [isHsPickerOpen, setIsHsPickerOpen] = useState(false);

  const { data: shipment, isLoading, error } = useQuery({
    queryKey: ['shipment', id],
    queryFn: () => mockApi.getShipment(id!),
    enabled: !!id,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: mockApi.listProducts,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['shipment-documents', id],
    queryFn: async () => {
      if (!id) return [] as ShipmentDocument[];
      return mockApi.listShipmentDocuments(id);
    },
    enabled: !!id,
  });

  const documentRequirements = useMemo(() => {
    if (!shipment) {
      return { required: [] as DocKey[], reasons: {} as Partial<Record<DocKey, string>> };
    }
    return evaluateRules(shipment, products);
  }, [shipment, products]);

  const documentChecklist = useMemo(
    () => {
      const combined: DocKey[] = ['INVOICE', 'PACKING_LIST', ...documentRequirements.required];
      const unique: DocKey[] = [];
      combined.forEach(key => {
        if (!unique.includes(key)) unique.push(key);
      });
      return unique.map(key => ({
        key,
        status: documents.find(doc => doc.doc_key === key)?.status ?? 'required',
        reason: documentRequirements.reasons[key],
      }));
    },
    [documents, documentRequirements]
  );

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const next = new URLSearchParams(searchParams);
    next.set('tab', value);
    if (value !== 'documents') {
      next.delete('highlight');
    }
    setSearchParams(next, { replace: true });
  };

  // Update shipment mutation
  const updateShipmentMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ShipmentWithItems> }) =>
      mockApi.updateShipment(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipment', id] });
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Shipment updated successfully');
    },
    onError: () => {
      toast.error('Failed to update shipment');
    },
  });

  // Delete shipment mutation
  const deleteShipmentMutation = useMutation({
    mutationFn: (id: string) => mockApi.deleteShipment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Shipment deleted successfully');
      navigate('/shipments');
    },
    onError: () => {
      toast.error('Failed to delete shipment');
    },
  });

  const handleSubmit = () => {
    if (!shipment) return;
    updateShipmentMutation.mutate({
      id: shipment.id,
      updates: { status: 'submitted' },
    });
  };

  const handleDelete = () => {
    if (!shipment) return;
    deleteShipmentMutation.mutate(shipment.id);
  };

  const handleAddAdHocProduct = (product: Product) => {
    if (!shipment) return;
    
    // Add the new product as an item to the shipment
    const newItem = {
      id: `item_${Date.now()}`,
      product_id: product.id,
      quantity: 1,
    };
    
    const updatedItems = [...(shipment.items || []), newItem];
    
    updateShipmentMutation.mutate({
      id: shipment.id,
      updates: { items: updatedItems },
    });
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
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/shipments')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Shipments
          </Button>
        </div>
        
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Shipment not found or failed to load. Please check the URL and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Calculate totals
  const totals = (shipment.items || []).reduce((acc, item) => {
    const product = products.find(p => p.id === item.product_id);
    if (product) {
      acc.value += product.unit_price_fcfa * item.quantity;
      acc.weight += (product.weight_kg || 0) * item.quantity;
      acc.items += 1;
    }
    return acc;
  }, { value: 0, weight: 0, items: 0 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/shipments')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Shipments
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{shipment.reference}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={getStatusVariant(shipment.status)} className="capitalize">
                {shipment.status}
              </Badge>
              <span className="text-sm text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">{shipment.route}</span>
              <span className="text-sm text-muted-foreground">•</span>
              <Badge variant="outline">{shipment.incoterm}</Badge>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          
          {shipment.status === 'draft' && (
            <Button 
              size="sm" 
              onClick={handleSubmit}
              disabled={updateShipmentMutation.isPending}
            >
              <Send className="mr-2 h-4 w-4" />
              Submit
            </Button>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Shipment</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete shipment {shipment.reference}? 
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">{formatFcfa(totals.value)}</p>
              </div>
              <div className="rounded-full bg-primary/10 p-3">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Weight</p>
                <p className="text-2xl font-bold">{totals.weight.toFixed(0)} kg</p>
              </div>
              <div className="rounded-full bg-secondary/10 p-3">
                <Weight className="h-6 w-6 text-secondary-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Items</p>
                <p className="text-2xl font-bold">{totals.items}</p>
              </div>
              <div className="rounded-full bg-accent/10 p-3">
                <Package className="h-6 w-6 text-accent-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Buyer</p>
                <p className="text-lg font-medium">{shipment.buyer}</p>
                <p className="text-sm text-muted-foreground">Updated {formatDate(shipment.updated_at)}</p>
              </div>
              <div className="rounded-full bg-muted p-3">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Items Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Items</CardTitle>
                <Button 
                  onClick={() => setIsHsPickerOpen(true)}
                  size="sm"
                  variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {shipment.items && shipment.items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>HS Code</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Weight (kg)</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipment.items.map((item, index) => {
                      const product = products.find(p => p.id === item.product_id);
                      if (!product) return null;
                      
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {product.hs_code}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatFcfa(product.unit_price_fcfa)}</TableCell>
                          <TableCell className="text-right">
                            {((product.weight_kg || 0) * item.quantity).toFixed(1)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatFcfa(product.unit_price_fcfa * item.quantity)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No items found for this shipment.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Required Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Required Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {documentChecklist.length > 0 ? (
                <div className="space-y-3">
                  {documentChecklist.map(item => (
                    <div key={item.key} className="flex items-center justify-between rounded-xl border p-3">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-foreground">
                          {documentNameMap[item.key] ?? item.key}
                        </span>
                        {item.reason && (
                          <span className="text-sm text-muted-foreground">{item.reason}</span>
                        )}
                      </div>
                      <Badge variant={docStatusVariant(item.status)} className="capitalize">
                        {docStatusLabel(item.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-100 p-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium">No special documents required</h3>
                  <p className="text-muted-foreground">
                    Based on the destination and products, no additional compliance documents are required.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab shipment={shipment} products={products} />
        </TabsContent>

        <TabsContent value="issues">
          <IssuesTab shipment={shipment} />
        </TabsContent>

        <TabsContent value="costs">
          <CostsTab shipment={shipment} />
        </TabsContent>

        <TabsContent value="timeline">
          <TimelineTab shipment={shipment} />
        </TabsContent>
      </Tabs>

      {/* HS Quick Picker */}
      <HsQuickPicker
        isOpen={isHsPickerOpen}
        onClose={() => setIsHsPickerOpen(false)}
        onProductCreated={handleAddAdHocProduct}
      />
    </div>
  );
};