// Multi-step shipment creation wizard

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  ArrowLeft, 
  ArrowRight, 
  Plus, 
  Trash2, 
  Package, 
  Users, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react';
import { toast } from 'sonner';
import { mockApi } from '@/mocks/api';
import { formatFcfa } from '@/utils/currency';
import { HsQuickPicker } from '@/features/hs/components/HsQuickPicker';
import { isPhytoHs } from '@/utils/hs';
import type { ShipmentWithItems, Product, Partner } from '@/mocks/seeds';

// Form schemas for each step
const basicsSchema = z.object({
  reference: z.string().min(1, 'Reference is required'),
  incoterm: z.enum(['FOB', 'CIF', 'CIP']),
  mode: z.enum(['SEA', 'AIR', 'ROAD']),
  origin: z.string().min(1, 'Origin is required'),
  destination: z.string().min(2, 'Destination is required'),
  origin_port: z.string().min(1, 'Origin port is required'),
  destination_port: z.string().min(1, 'Destination port is required'),
});

const partiesSchema = z.object({
  buyer_id: z.string().min(1, 'Buyer is required'),
});

const itemSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
});

const itemsSchema = z.object({
  items: z.array(itemSchema).min(1, 'At least one item is required'),
});

type BasicsForm = z.infer<typeof basicsSchema>;
type PartiesForm = z.infer<typeof partiesSchema>;
type ItemsForm = z.infer<typeof itemsSchema>;

interface WizardData extends BasicsForm, PartiesForm, ItemsForm {}

const COUNTRIES = [
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' }, 
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'UK', name: 'United Kingdom' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
];

const generateReference = (): string => {
  const year = new Date().getFullYear();
  const sequence = Math.floor(Math.random() * 9999) + 1;
  return `PL-${year}-EX-${sequence.toString().padStart(4, '0')}`;
};

export const ShipmentWizard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState<Partial<WizardData>>({
    reference: generateReference(),
    origin: 'CM',
  });

  const steps = [
    { title: 'Basics', icon: Package, description: 'Shipment details' },
    { title: 'Parties', icon: Users, description: 'Buyer information' },
    { title: 'Items', icon: Package, description: 'Products & quantities' },
    { title: 'Review', icon: CheckCircle, description: 'Confirm & create' },
  ];

  // Fetch products and partners
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: mockApi.listProducts,
  });

  const { data: partners = [] } = useQuery({
    queryKey: ['partners'],
    queryFn: mockApi.listPartners,
  });

  // Create shipment mutation
  const createShipmentMutation = useMutation({
    mutationFn: (data: Omit<ShipmentWithItems, 'id' | 'updated_at'>) => 
      mockApi.createShipment(data),
    onSuccess: (shipment) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      toast.success('Shipment created successfully');
      navigate(`/shipments/${shipment.id}`);
    },
    onError: () => {
      toast.error('Failed to create shipment');
    },
  });

  // Step 1: Basics
  const BasicsStep = () => {
    const form = useForm<BasicsForm>({
      resolver: zodResolver(basicsSchema),
      defaultValues: {
        reference: wizardData.reference || generateReference(),
        incoterm: wizardData.incoterm || 'FOB',
        mode: wizardData.mode || 'SEA',
        origin: wizardData.origin || 'CM',
        destination: wizardData.destination || '',
        origin_port: wizardData.origin_port || '',
        destination_port: wizardData.destination_port || '',
      },
    });

    const onSubmit = (data: BasicsForm) => {
      setWizardData(prev => ({ ...prev, ...data }));
      setCurrentStep(1);
    };

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="reference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference</FormLabel>
                  <FormControl>
                    <Input {...field} disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="incoterm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Incoterm</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select incoterm" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="FOB">FOB - Free on Board</SelectItem>
                      <SelectItem value="CIF">CIF - Cost, Insurance & Freight</SelectItem>
                      <SelectItem value="CIP">CIP - Carriage & Insurance Paid</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transport Mode</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SEA">Sea</SelectItem>
                      <SelectItem value="AIR">Air</SelectItem>
                      <SelectItem value="ROAD">Road</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination Country</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select destination" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COUNTRIES.map(country => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="origin_port"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Origin Port</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Douala Port" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="destination_port"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destination Port</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Le Havre Port" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit">
              Next: Parties
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </Form>
    );
  };

  // Step 2: Parties
  const PartiesStep = () => {
    const form = useForm<PartiesForm>({
      resolver: zodResolver(partiesSchema),
      defaultValues: {
        buyer_id: wizardData.buyer_id || '',
      },
    });

    const onSubmit = (data: PartiesForm) => {
      setWizardData(prev => ({ ...prev, ...data }));
      setCurrentStep(2);
    };

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="buyer_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Buyer</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select buyer" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {partners.filter(p => p.type === 'buyer').map(partner => (
                      <SelectItem key={partner.id} value={partner.id}>
                        {partner.name} ({partner.country})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-between">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setCurrentStep(0)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button type="submit">
              Next: Items
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </Form>
    );
  };

  // Step 3: Items
  const ItemsStep = () => {
    const [items, setItems] = useState(wizardData.items || [{ product_id: '', quantity: 1 }]);
    const [isHsPickerOpen, setIsHsPickerOpen] = useState(false);

    const addItem = () => {
      setItems([...items, { product_id: '', quantity: 1 }]);
    };

    const addAdHocProduct = (product: Product) => {
      // Add the new product to the items list with quantity 1
      const newItem = { product_id: product.id, quantity: 1 };
      setItems(prevItems => [...prevItems, newItem]);
    };

    const removeItem = (index: number) => {
      setItems(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: keyof typeof itemSchema.shape, value: any) => {
      const updated = [...items];
      updated[index] = { ...updated[index], [field]: value };
      setItems(updated);
    };

    const handleNext = () => {
      // Validate items
      const validItems = items.filter(item => item.product_id && item.quantity > 0);
      if (validItems.length === 0) {
        toast.error('Please add at least one item');
        return;
      }

      setWizardData(prev => ({ ...prev, items: validItems }));
      setCurrentStep(3);
    };

    const calculateTotals = () => {
      return items.reduce((acc, item) => {
        const product = products.find(p => p.id === item.product_id);
        if (product && item.quantity > 0) {
          const lineValue = product.unit_price_fcfa * item.quantity;
          const lineWeight = (product.weight_kg || 0) * item.quantity;
          acc.value += lineValue;
          acc.weight += lineWeight;
        }
        return acc;
      }, { value: 0, weight: 0 });
    };

    const totals = calculateTotals();

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Products</h3>
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsHsPickerOpen(true)}
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Pick via HS Code
            </Button>
            <Button type="button" onClick={addItem} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="text-sm font-medium">Product</label>
                    <Select 
                      value={item.product_id} 
                      onValueChange={(value) => updateItem(index, 'product_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - {formatFcfa(product.unit_price_fcfa)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Quantity</label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      {(() => {
                        const product = products.find(p => p.id === item.product_id);
                        if (product && item.quantity > 0) {
                          return (
                            <span className="font-medium">
                              {formatFcfa(product.unit_price_fcfa * item.quantity)}
                            </span>
                          );
                        }
                        return <span className="text-muted-foreground">-</span>;
                      })()}
                    </div>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Totals */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{items.filter(i => i.product_id).length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Weight</p>
                <p className="text-2xl font-bold">{totals.weight.toFixed(0)} kg</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">{formatFcfa(totals.value)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setCurrentStep(1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button type="button" onClick={handleNext}>
            Next: Review
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* HS Quick Picker */}
        <HsQuickPicker
          isOpen={isHsPickerOpen}
          onClose={() => setIsHsPickerOpen(false)}
          onProductCreated={addAdHocProduct}
        />
      </div>
    );
  };

  // Step 4: Review
  const ReviewStep = () => {
    const selectedBuyer = partners.find(p => p.id === wizardData.buyer_id);
    const destination = COUNTRIES.find(c => c.code === wizardData.destination);
    
    const totals = (wizardData.items || []).reduce((acc, item) => {
      const product = products.find(p => p.id === item.product_id);
      if (product && item.quantity > 0) {
        acc.value += product.unit_price_fcfa * item.quantity;
        acc.weight += (product.weight_kg || 0) * item.quantity;
      }
      return acc;
    }, { value: 0, weight: 0 });

    const handleCreate = () => {
      if (!wizardData.reference || !selectedBuyer || !wizardData.items) {
        toast.error('Please complete all steps');
        return;
      }

      const shipmentData: Omit<ShipmentWithItems, 'id' | 'updated_at'> = {
        reference: wizardData.reference,
        buyer: selectedBuyer.name,
        incoterm: wizardData.incoterm!,
        mode: wizardData.mode!,
        route: `${wizardData.origin} → ${wizardData.destination}`,
        value_fcfa: totals.value,
        status: 'draft',
        items: wizardData.items.map((item, index) => ({
          id: `item_${index}`,
          product_id: item.product_id,
          quantity: item.quantity,
        })),
      };

      createShipmentMutation.mutate(shipmentData);
    };

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Shipment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference:</span>
                <span className="font-medium">{wizardData.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Route:</span>
                <span className="font-medium">{wizardData.origin} → {destination?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Incoterm:</span>
                <Badge variant="outline">{wizardData.incoterm}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mode:</span>
                <Badge variant="secondary">{wizardData.mode}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Parties & Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Buyer:</span>
                <span className="font-medium">{selectedBuyer?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items:</span>
                <span className="font-medium">{wizardData.items?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Weight:</span>
                <span className="font-medium">{totals.weight.toFixed(0)} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Value:</span>
                <span className="font-bold text-lg">{formatFcfa(totals.value)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>HS Code</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wizardData.items?.map((item, index) => {
                  const product = products.find(p => p.id === item.product_id);
                  if (!product) return null;
                  
                  return (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell><Badge variant="outline" className="font-mono text-xs">{product.hs_code}</Badge></TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatFcfa(product.unit_price_fcfa)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatFcfa(product.unit_price_fcfa * item.quantity)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setCurrentStep(2)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={createShipmentMutation.isPending}
          >
            {createShipmentMutation.isPending ? 'Creating...' : 'Create Shipment'}
          </Button>
        </div>
      </div>
    );
  };

  const stepComponents = [BasicsStep, PartiesStep, ItemsStep, ReviewStep];
  const StepComponent = stepComponents[currentStep];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/shipments')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Shipments
        </Button>
        <div>
          <h1 className="text-3xl font-bold">New Shipment</h1>
          <p className="text-muted-foreground">Create a new export shipment</p>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div 
                key={step.title}
                className={`flex items-center gap-2 ${
                  index <= currentStep ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div className={`rounded-full p-2 ${
                  index <= currentStep ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  <step.icon className="h-4 w-4" />
                </div>
                <div className="hidden sm:block">
                  <p className="font-medium">{step.title}</p>
                  <p className="text-xs">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
          <Progress value={(currentStep + 1) / steps.length * 100} />
        </CardContent>
      </Card>

      {/* Current Step */}
      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStep].title}</CardTitle>
        </CardHeader>
        <CardContent>
          <StepComponent />
        </CardContent>
      </Card>
    </div>
  );
};