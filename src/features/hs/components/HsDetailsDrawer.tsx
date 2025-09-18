// HS Details Drawer with Duty Calculator

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Calculator, Save, Plus } from 'lucide-react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { mockApi } from '@/mocks/api';
import { abbrHs } from '@/utils/hs';
import { formatFcfa, abbreviateFcfa } from '@/utils/currency';
import { safeNumber } from '@/utils/math';
import type { HsCode } from '@/mocks/seeds';

interface HsDetailsDrawerProps {
  hsCode: HsCode | null;
  isOpen: boolean;
  onClose: () => void;
  onAddAsProduct: () => void;
}

export const HsDetailsDrawer = ({ 
  hsCode, 
  isOpen, 
  onClose, 
  onAddAsProduct 
}: HsDetailsDrawerProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Duty rate management
  const [newRatePct, setNewRatePct] = useState<string>('');

  // Duty calculator state
  const [cifValue, setCifValue] = useState<string>('');
  const [customRate, setCustomRate] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');

  const { data: savedRate } = useQuery({
    queryKey: ['saved-hs-rate', hsCode?.code],
    queryFn: () => hsCode ? mockApi.getSavedHsRate(hsCode.code) : Promise.resolve(undefined),
    enabled: !!hsCode,
    staleTime: 2 * 60 * 1000,
  });

  const saveRateMutation = useMutation({
    mutationFn: (data: { code: string; ratePct: number }) =>
      mockApi.saveHsRate(data.code, data.ratePct),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-hs-rate'] });
      toast({
        title: 'Duty rate saved',
        description: 'Your custom duty rate has been saved.',
      });
      setNewRatePct('');
    },
  });

  const { data: dutyCalculation } = useQuery({
    queryKey: ['duty-calculation', hsCode?.code, cifValue, customRate],
    queryFn: () => {
      if (!hsCode || !cifValue) return null;
      
      const cifValueFcfa = safeNumber(cifValue);
      const ratePct = customRate ? safeNumber(customRate) : undefined;
      
      return mockApi.calculateDuty({
        hsCode: hsCode.code,
        cifValueFcfa,
        ratePct,
      });
    },
    enabled: !!hsCode && !!cifValue,
    staleTime: 1 * 60 * 1000,
  });

  // Reset form when HS code changes
  useEffect(() => {
    if (hsCode) {
      setNewRatePct(savedRate?.ratePct.toString() || '');
      setCustomRate('');
      setCifValue('');
      setQuantity('1');
    }
  }, [hsCode, savedRate]);

  const handleSaveRate = () => {
    if (!hsCode || !newRatePct) return;
    
    const ratePct = safeNumber(newRatePct);
    if (ratePct < 0 || ratePct > 100) {
      toast({
        title: 'Invalid rate',
        description: 'Duty rate must be between 0% and 100%.',
        variant: 'destructive',
      });
      return;
    }
    
    saveRateMutation.mutate({
      code: hsCode.code,
      ratePct,
    });
  };

  if (!hsCode) return null;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-w-2xl mx-auto">
        <DrawerHeader>
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="font-mono text-2xl">
                {abbrHs(hsCode.code)}
              </DrawerTitle>
              <DrawerDescription className="mt-1 text-base">
                {hsCode.description}
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Unit of Measurement</Label>
                  <Badge variant="outline" className="mt-1">
                    {hsCode.uom}
                  </Badge>
                </div>
                <div>
                  <Label>Default Duty Rate</Label>
                  <div className="text-lg font-semibold mt-1">
                    {hsCode.defaultDutyRate}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Duty Rate Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Custom Duty Rate</CardTitle>
              <CardDescription>
                Save a custom duty rate for this HS code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="rate-input">Duty Rate (%)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="rate-input"
                    type="number"
                    placeholder={hsCode.defaultDutyRate.toString()}
                    value={newRatePct}
                    onChange={(e) => setNewRatePct(e.target.value)}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <Button 
                    onClick={handleSaveRate}
                    disabled={!newRatePct || saveRateMutation.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                </div>
              </div>
              
              {savedRate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary">
                    Current saved: {savedRate.ratePct}%
                  </Badge>
                  <span>•</span>
                  <span>Updated {new Date(savedRate.updated_at).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Duty Calculator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Duty Calculator
              </CardTitle>
              <CardDescription>
                Estimate import duties for this HS code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="cif-value">CIF Value (FCFA)</Label>
                  <Input
                    id="cif-value"
                    type="number"
                    placeholder="10,000,000"
                    value={cifValue}
                    onChange={(e) => setCifValue(e.target.value)}
                    min="0"
                  />
                </div>
                
                <div>
                  <Label htmlFor="custom-rate">Custom Rate (%)</Label>
                  <Input
                    id="custom-rate"
                    type="number"
                    placeholder="Use saved/default"
                    value={customRate}
                    onChange={(e) => setCustomRate(e.target.value)}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="quantity">Quantity (for info)</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="0"
                  />
                </div>
              </div>

              {dutyCalculation && cifValue && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        Effective Duty Rate
                      </Label>
                      <div className="text-xl font-semibold">
                        {dutyCalculation.effectiveRatePct}%
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">
                        Calculated Duty
                      </Label>
                      <div className="text-xl font-semibold text-primary">
                        {abbreviateFcfa(dutyCalculation.dutyFcfa)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-muted-foreground">
                    Demo calculator — not for official use
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Close
            </Button>
            <Button onClick={onAddAsProduct} className="flex-1">
              <Plus className="mr-2 h-4 w-4" />
              Add as Product...
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};