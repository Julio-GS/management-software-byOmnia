'use client';

import { useState, FormEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Separator } from '@/shared/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { usePricingAPI, PriceCalculation } from '@/hooks/use-pricing-api';
import { ProductPicker } from '@/shared/components/forms/ProductPicker';
import { Calculator, Loader2 } from 'lucide-react';

export function PriceCalculator() {
  const [productId, setProductId] = useState('');
  const [cost, setCost] = useState('');
  const [result, setResult] = useState<PriceCalculation | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const { calculatePrice, isAvailable } = usePricingAPI();

  const handleCalculate = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!isAvailable) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Price calculator is only available in desktop app',
      });
      return;
    }

    const costValue = parseFloat(cost);
    if (isNaN(costValue) || costValue <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Input',
        description: 'Please enter a valid cost amount',
      });
      return;
    }

    setIsCalculating(true);
    try {
      const calculation = await calculatePrice(costValue);
      setResult(calculation);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to calculate price',
      });
    } finally {
      setIsCalculating(false);
    }
  };

  if (!isAvailable) {
    return (
      <div className="rounded-lg border border-border bg-muted/50 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Price calculator only available in desktop app
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCalculate} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="product">Product (Optional)</Label>
          <ProductPicker 
            value={productId} 
            onValueChange={setProductId}
            disabled={isCalculating}
            placeholder="Select product for reference..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cost">Product Cost</Label>
          <div className="flex gap-2">
            <Input
              id="cost"
              type="number"
              step="0.01"
              placeholder="100.00"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              disabled={isCalculating}
            />
            <Button type="submit" disabled={isCalculating || !cost}>
              {isCalculating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Calculate
            </Button>
            </div>
            </div>
          </div>
        </form>

        {result && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Calculated Price</p>
                  <p className="text-2xl font-bold">${result.calculatedPrice.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Suggested Price</p>
                  <p className="text-2xl font-bold text-primary">${result.suggestedPrice.toFixed(2)}</p>
                </div>
              </div>

              <div className="rounded-lg bg-muted p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Markup Applied</span>
                  <span className="font-medium">{result.markupPercentage}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Markup Source</span>
                  <span className="font-medium capitalize">{result.markupSource}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }
