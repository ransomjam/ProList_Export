// HS Quick Picker Component for Adding Ad-hoc Products

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, Package, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { mockApi } from '@/mocks/api';
import { abbrHs, validateHsCode } from '@/utils/hs';
import { safeNumber } from '@/utils/math';
import type { HsCode, Product } from '@/mocks/seeds';

interface HsQuickPickerProps {
  prefilledHs?: HsCode | null;
  isOpen: boolean;
  onClose: () => void;
  onProductCreated?: (product: Product) => void;
}

export const HsQuickPicker = ({ 
  prefilledHs, 
  isOpen, 
  onClose, 
  onProductCreated 
}: HsQuickPickerProps) => {
  const { toast } = useToast();

  // Form state
  const [selectedHs, setSelectedHs] = useState<HsCode | null>(null);
  const [hsSearchOpen, setHsSearchOpen] = useState(false);
  const [productName, setProductName] = useState('');
  const [unitValue, setUnitValue] = useState('');
  const [unitWeight, setUnitWeight] = useState('');

  // Form validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: hsCodes } = useQuery({
    queryKey: ['hs-codes'],
    queryFn: mockApi.listHs,
    staleTime: 10 * 60 * 1000,
  });

  const createProductMutation = useMutation({
    mutationFn: mockApi.createAdHocProduct,
    onSuccess: (product) => {
      toast({
        title: 'Product created',
        description: `${product.name} has been added to your products.`,
      });
      onProductCreated?.(product);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create product',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Reset form when dialog opens/closes or prefilled HS changes
  useEffect(() => {
    if (isOpen) {
      if (prefilledHs) {
        setSelectedHs(prefilledHs);
      } else {
        resetForm();
      }
    }
  }, [isOpen, prefilledHs]);

  const resetForm = () => {
    setSelectedHs(null);
    setProductName('');
    setUnitValue('');
    setUnitWeight('');
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedHs) {
      newErrors.hsCode = 'Please select an HS code';
    }

    if (!productName.trim()) {
      newErrors.productName = 'Product name is required';
    }

    const unitValueNum = safeNumber(unitValue);
    if (!unitValue || unitValueNum <= 0) {
      newErrors.unitValue = 'Unit value must be greater than 0';
    }

    const unitWeightNum = safeNumber(unitWeight);
    if (!unitWeight || unitWeightNum <= 0) {
      newErrors.unitWeight = 'Unit weight must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    createProductMutation.mutate({
      hs_code: selectedHs!.code,
      name: productName.trim(),
      unit_value_fcfa: safeNumber(unitValue),
      unit_weight_kg: safeNumber(unitWeight),
    });
  };

  const handleClose = () => {
    if (!createProductMutation.isPending) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Add Product via HS Code
          </DialogTitle>
          <DialogDescription>
            Create a new product using an HS code and add it to your shipment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* HS Code Selector */}
          <div>
            <Label htmlFor="hs-code">HS Code</Label>
            <div className="mt-1">
              {prefilledHs ? (
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-mono font-semibold">
                          {abbrHs(prefilledHs.code)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {prefilledHs.description}
                        </div>
                      </div>
                      <Badge variant="outline">{prefilledHs.uom}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Popover open={hsSearchOpen} onOpenChange={setHsSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={hsSearchOpen}
                      className="w-full justify-between"
                    >
                      {selectedHs ? (
                        <span className="font-mono">
                          {abbrHs(selectedHs.code)} - {selectedHs.description.substring(0, 30)}...
                        </span>
                      ) : (
                        "Search HS codes..."
                      )}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search HS codes..." />
                      <CommandList>
                        <CommandEmpty>No HS codes found.</CommandEmpty>
                        <CommandGroup>
                          {hsCodes?.map((hsCode) => (
                            <CommandItem
                              key={hsCode.code}
                              value={`${hsCode.code} ${hsCode.description}`}
                              onSelect={() => {
                                setSelectedHs(hsCode);
                                setHsSearchOpen(false);
                              }}
                            >
                              <div className="flex flex-col">
                                <span className="font-mono font-semibold">
                                  {abbrHs(hsCode.code)}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {hsCode.description}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>
            {errors.hsCode && (
              <div className="flex items-center gap-1 mt-1 text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                {errors.hsCode}
              </div>
            )}
          </div>

          {/* Product Name */}
          <div>
            <Label htmlFor="product-name">Product Name</Label>
            <Input
              id="product-name"
              placeholder="e.g., Premium Cocoa Beans"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="mt-1"
            />
            {errors.productName && (
              <div className="flex items-center gap-1 mt-1 text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                {errors.productName}
              </div>
            )}
          </div>

          {/* Unit Value */}
          <div>
            <Label htmlFor="unit-value">Unit Value (FCFA)</Label>
            <Input
              id="unit-value"
              type="number"
              placeholder="85000"
              value={unitValue}
              onChange={(e) => setUnitValue(e.target.value)}
              min="0"
              step="100"
              className="mt-1"
            />
            {errors.unitValue && (
              <div className="flex items-center gap-1 mt-1 text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                {errors.unitValue}
              </div>
            )}
          </div>

          {/* Unit Weight */}
          <div>
            <Label htmlFor="unit-weight">Unit Weight (kg)</Label>
            <Input
              id="unit-weight"
              type="number"
              placeholder="25"
              value={unitWeight}
              onChange={(e) => setUnitWeight(e.target.value)}
              min="0"
              step="0.1"
              className="mt-1"
            />
            {errors.unitWeight && (
              <div className="flex items-center gap-1 mt-1 text-sm text-destructive">
                <AlertCircle className="h-3 w-3" />
                {errors.unitWeight}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={handleClose} 
              disabled={createProductMutation.isPending}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createProductMutation.isPending}
              className="flex-1"
            >
              {createProductMutation.isPending ? 'Creating...' : 'Save & Add to Shipment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};