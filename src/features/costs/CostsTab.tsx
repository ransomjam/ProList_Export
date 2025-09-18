// Costs tab for shipment with cost lines, payments, and PDF generation

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Edit,
  Trash2,
  Download,
  FileText,
  Receipt,
  DollarSign,
  TrendingUp,
  CreditCard,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { mockApi } from '@/mocks/api';
import { formatFcfa, abbreviateFcfa } from '@/utils/currency';
import { renderProformaPDF, renderReceiptPDF } from '@/utils/pdf';
import { nextInvoiceNumber } from '@/utils/numbering';
import type { 
  ShipmentWithItems, 
  CostLine, 
  CostType, 
  Payment, 
  PaymentMethod,
  Partner,
  Company
} from '@/mocks/types';

interface CostsTabProps {
  shipment: ShipmentWithItems;
}

interface CostLineFormData {
  type: CostType;
  label: string;
  amount_fcfa: number;
  taxable: boolean;
  tax_rate_pct: number;
}

interface PaymentFormData {
  method: PaymentMethod;
  amount_fcfa: number;
  reference?: string;
  paid_at: string;
  note?: string;
}

const costTypeLabels: Record<CostType, string> = {
  freight: 'Freight',
  insurance: 'Insurance',
  fees: 'Fees',
  other: 'Other',
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  mobile_money: 'Mobile Money',
  card: 'Card',
};

export const CostsTab = ({ shipment }: CostsTabProps) => {
  const queryClient = useQueryClient();
  const [isCostLineDialogOpen, setIsCostLineDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [editingCostLine, setEditingCostLine] = useState<CostLine | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isReceiptDrawerOpen, setIsReceiptDrawerOpen] = useState(false);

  // Queries
  const { data: costLines = [], isLoading: isLoadingCosts } = useQuery({
    queryKey: ['costLines', shipment.id],
    queryFn: () => mockApi.listCostLines(shipment.id),
  });

  const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ['payments', shipment.id],
    queryFn: () => mockApi.listPayments(shipment.id),
  });

  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['costSummary', shipment.id],
    queryFn: () => mockApi.getCostSummary(shipment.id),
  });

  const { data: company } = useQuery({
    queryKey: ['company'],
    queryFn: mockApi.getCompany,
  });

  const { data: partners = [] } = useQuery({
    queryKey: ['partners'],
    queryFn: mockApi.listPartners,
  });

  // Mutations
  const createCostLineMutation = useMutation({
    mutationFn: (data: Omit<CostLine, 'id' | 'created_at' | 'updated_at'>) => 
      mockApi.createCostLine(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costLines', shipment.id] });
      queryClient.invalidateQueries({ queryKey: ['costSummary', shipment.id] });
      toast.success('Cost line added successfully');
      setIsCostLineDialogOpen(false);
      setEditingCostLine(null);
    },
    onError: () => {
      toast.error('Failed to add cost line');
    },
  });

  const updateCostLineMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CostLine> }) =>
      mockApi.updateCostLine(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costLines', shipment.id] });
      queryClient.invalidateQueries({ queryKey: ['costSummary', shipment.id] });
      toast.success('Cost line updated successfully');
      setIsCostLineDialogOpen(false);
      setEditingCostLine(null);
    },
    onError: () => {
      toast.error('Failed to update cost line');
    },
  });

  const deleteCostLineMutation = useMutation({
    mutationFn: (id: string) => mockApi.deleteCostLine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costLines', shipment.id] });
      queryClient.invalidateQueries({ queryKey: ['costSummary', shipment.id] });
      toast.success('Cost line deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete cost line');
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: (data: Omit<Payment, 'id' | 'created_at' | 'updated_at'>) =>
      mockApi.createPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', shipment.id] });
      queryClient.invalidateQueries({ queryKey: ['costSummary', shipment.id] });
      toast.success('Payment recorded successfully');
      setIsPaymentDialogOpen(false);
    },
    onError: () => {
      toast.error('Failed to record payment');
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (id: string) => mockApi.deletePayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', shipment.id] });
      queryClient.invalidateQueries({ queryKey: ['costSummary', shipment.id] });
      toast.success('Payment deleted successfully');
      setIsReceiptDrawerOpen(false);
      setSelectedPayment(null);
    },
    onError: () => {
      toast.error('Failed to delete payment');
    },
  });

  const exportCsvMutation = useMutation({
    mutationFn: () => mockApi.exportCostsCsv(shipment.id),
    onSuccess: (result) => {
      const link = document.createElement('a');
      link.href = result.dataUrl;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('CSV exported successfully');
    },
    onError: () => {
      toast.error('Failed to export CSV');
    },
  });

  const handleCostLineSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      shipment_id: shipment.id,
      type: formData.get('type') as CostType,
      label: formData.get('label') as string,
      amount_fcfa: Number(formData.get('amount_fcfa')),
      taxable: formData.get('taxable') === 'on',
      tax_rate_pct: Number(formData.get('tax_rate_pct')),
    };

    if (editingCostLine) {
      updateCostLineMutation.mutate({ id: editingCostLine.id, patch: data });
    } else {
      createCostLineMutation.mutate(data);
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      shipment_id: shipment.id,
      method: formData.get('method') as PaymentMethod,
      amount_fcfa: Number(formData.get('amount_fcfa')),
      reference: formData.get('reference') as string || undefined,
      paid_at: new Date(formData.get('paid_at') as string).toISOString(),
      note: formData.get('note') as string || undefined,
    };

    createPaymentMutation.mutate(data);
  };

  const handleGenerateProforma = async () => {
    if (!company || !summary) return;
    
    const buyer = partners.find(p => p.name === shipment.buyer);
    if (!buyer) {
      toast.error('Buyer not found');
      return;
    }

    try {
      const result = await renderProformaPDF({
        shipment,
        company,
        buyer,
        costLines,
        summary,
        meta: {
          number: nextInvoiceNumber(),
          date: new Date().toLocaleDateString('en-GB'),
        },
      });

      const link = document.createElement('a');
      link.href = result.dataUrl;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Pro-forma invoice generated successfully');
    } catch (error) {
      toast.error('Failed to generate pro-forma invoice');
    }
  };

  const handleGenerateReceipt = async (payment: Payment) => {
    if (!company || !summary) return;

    try {
      const result = await renderReceiptPDF({
        shipment,
        company,
        payment,
        summary,
        meta: {
          number: `RCP-${Date.now()}`,
          date: new Date().toLocaleDateString('en-GB'),
        },
      });

      const link = document.createElement('a');
      link.href = result.dataUrl;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Receipt generated successfully');
    } catch (error) {
      toast.error('Failed to generate receipt');
    }
  };

  if (isLoadingCosts || isLoadingPayments || isLoadingSummary) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Totals Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <CardTitle>Cost Summary</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCsvMutation.mutate()}
                disabled={exportCsvMutation.isPending}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateProforma}
                disabled={!summary || costLines.length === 0}
              >
                <FileText className="mr-2 h-4 w-4" />
                Generate Pro-forma
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {summary ? (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Subtotal</p>
                <p className="text-xl font-bold">{abbreviateFcfa(summary.subtotal_fcfa)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Tax</p>
                <p className="text-xl font-bold">{abbreviateFcfa(summary.tax_fcfa)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Grand Total</p>
                <p className="text-xl font-bold">{abbreviateFcfa(summary.total_fcfa)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-xl font-bold text-green-600">{abbreviateFcfa(summary.paid_fcfa)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Balance</p>
                <p className={`text-xl font-bold ${summary.balance_fcfa > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  {abbreviateFcfa(summary.balance_fcfa)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No cost data available</p>
          )}
        </CardContent>
      </Card>

      {/* Cost Lines and Payments Tables */}
      <Tabs defaultValue="costs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="costs">Cost Lines</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="costs">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Cost Lines</CardTitle>
                <Dialog open={isCostLineDialogOpen} onOpenChange={setIsCostLineDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Line
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingCostLine ? 'Edit Cost Line' : 'Add Cost Line'}
                      </DialogTitle>
                      <DialogDescription>
                        {editingCostLine ? 'Update the cost line details.' : 'Add a new cost line to this shipment.'}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCostLineSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="type">Type</Label>
                          <Select name="type" defaultValue={editingCostLine?.type || 'freight'}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(costTypeLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="label">Label</Label>
                          <Input
                            name="label"
                            placeholder="e.g., Port handling"
                            defaultValue={editingCostLine?.label}
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="amount_fcfa">Amount (FCFA)</Label>
                        <Input
                          name="amount_fcfa"
                          type="number"
                          min="0"
                          step="1000"
                          defaultValue={editingCostLine?.amount_fcfa}
                          required
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch 
                          name="taxable" 
                          defaultChecked={editingCostLine?.taxable || false}
                        />
                        <Label htmlFor="taxable">Taxable</Label>
                      </div>
                      <div>
                        <Label htmlFor="tax_rate_pct">Tax Rate (%)</Label>
                        <Input
                          name="tax_rate_pct"
                          type="number"
                          min="0"
                          max="25"
                          step="0.25"
                          defaultValue={editingCostLine?.tax_rate_pct || 5}
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsCostLineDialogOpen(false);
                            setEditingCostLine(null);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit"
                          disabled={createCostLineMutation.isPending || updateCostLineMutation.isPending}
                        >
                          {editingCostLine ? 'Update' : 'Add'} Line
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {costLines.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Taxable</TableHead>
                      <TableHead className="text-right">Tax %</TableHead>
                      <TableHead className="text-right">Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costLines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {costTypeLabels[line.type]}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{line.label}</TableCell>
                        <TableCell className="text-right">{formatFcfa(line.amount_fcfa)}</TableCell>
                        <TableCell>
                          {line.taxable ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              Yes
                            </Badge>
                          ) : (
                            <Badge variant="secondary">No</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{line.tax_rate_pct.toFixed(2)}%</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {new Date(line.updated_at).toLocaleDateString('en-GB')}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingCostLine(line);
                                setIsCostLineDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Cost Line</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{line.label}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteCostLineMutation.mutate(line.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <div className="rounded-full bg-muted p-4 w-16 h-16 mx-auto mb-4">
                    <DollarSign className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No costs yet</h3>
                  <p className="text-muted-foreground mb-4">Add your first cost line to get started.</p>
                  <Button
                    onClick={() => setIsCostLineDialogOpen(true)}
                    size="sm"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Cost Line
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Payments</CardTitle>
                <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Record Payment
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Record Payment</DialogTitle>
                      <DialogDescription>
                        Record a new payment for this shipment.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handlePaymentSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="method">Method</Label>
                          <Select name="method" defaultValue="bank_transfer">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(paymentMethodLabels).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="amount_fcfa">Amount (FCFA)</Label>
                          <Input
                            name="amount_fcfa"
                            type="number"
                            min="0"
                            step="1000"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="reference">Reference</Label>
                        <Input
                          name="reference"
                          placeholder="Transaction reference"
                        />
                      </div>
                      <div>
                        <Label htmlFor="paid_at">Date</Label>
                        <Input
                          name="paid_at"
                          type="date"
                          defaultValue={new Date().toISOString().split('T')[0]}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="note">Note</Label>
                        <Textarea
                          name="note"
                          placeholder="Optional note"
                          rows={3}
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsPaymentDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit"
                          disabled={createPaymentMutation.isPending}
                        >
                          Record Payment
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {payments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Paid at</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {paymentMethodLabels[payment.method]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatFcfa(payment.amount_fcfa)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {payment.reference || '—'}
                        </TableCell>
                        <TableCell>
                          {new Date(payment.paid_at).toLocaleDateString('en-GB')}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {payment.note || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Drawer 
                            open={isReceiptDrawerOpen && selectedPayment?.id === payment.id} 
                            onOpenChange={(open) => {
                              setIsReceiptDrawerOpen(open);
                              if (!open) setSelectedPayment(null);
                            }}
                          >
                            <DrawerTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedPayment(payment)}
                              >
                                <Receipt className="h-4 w-4" />
                              </Button>
                            </DrawerTrigger>
                            <DrawerContent>
                              <DrawerHeader>
                                <DrawerTitle>Payment Receipt</DrawerTitle>
                                <DrawerDescription>
                                  Payment details and actions
                                </DrawerDescription>
                              </DrawerHeader>
                              {selectedPayment && (
                                <div className="p-6 space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="text-sm text-muted-foreground">Method</p>
                                      <p className="font-medium">
                                        {paymentMethodLabels[selectedPayment.method]}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Amount</p>
                                      <p className="font-medium">
                                        {formatFcfa(selectedPayment.amount_fcfa)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Reference</p>
                                      <p className="font-mono text-sm">
                                        {selectedPayment.reference || '—'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-muted-foreground">Date</p>
                                      <p className="font-medium">
                                        {new Date(selectedPayment.paid_at).toLocaleDateString('en-GB')}
                                      </p>
                                    </div>
                                  </div>
                                  {selectedPayment.note && (
                                    <div>
                                      <p className="text-sm text-muted-foreground">Note</p>
                                      <p>{selectedPayment.note}</p>
                                    </div>
                                  )}
                                </div>
                              )}
                              <DrawerFooter>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => selectedPayment && handleGenerateReceipt(selectedPayment)}
                                    className="flex-1"
                                  >
                                    <Receipt className="mr-2 h-4 w-4" />
                                    Generate Receipt
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Payment</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete this payment? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => selectedPayment && deletePaymentMutation.mutate(selectedPayment.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </DrawerFooter>
                            </DrawerContent>
                          </Drawer>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <div className="rounded-full bg-muted p-4 w-16 h-16 mx-auto mb-4">
                    <CreditCard className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No payments recorded</h3>
                  <p className="text-muted-foreground mb-4">Record your first payment to get started.</p>
                  <Button
                    onClick={() => setIsPaymentDialogOpen(true)}
                    size="sm"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Record Payment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};