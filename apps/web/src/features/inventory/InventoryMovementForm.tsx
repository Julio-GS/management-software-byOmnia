'use client';

import { useState, FormEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useInventoryAPI } from '@/hooks/use-inventory-api';
import { ProductPicker } from '@/shared/components/forms/ProductPicker';
import { ArrowDownCircle, ArrowUpCircle, Loader2, Settings2 } from 'lucide-react';

interface InventoryMovementFormProps {
  productId?: string;
  productName?: string;
  currentStock?: number;
  onSuccess?: () => void;
}

export function InventoryMovementForm({ 
  productId: initialProductId, 
  productName,
  currentStock,
  onSuccess 
}: InventoryMovementFormProps) {
  const [productId, setProductId] = useState(initialProductId || '');
  const [type, setType] = useState<'ENTRY' | 'EXIT' | 'ADJUSTMENT'>('ENTRY');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { createMovement, isAvailable } = useInventoryAPI();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!isAvailable) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Inventory API is only available in desktop app',
      });
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty === 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Quantity',
        description: 'Please enter a valid quantity',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createMovement({
        productId,
        type,
        quantity: qty,
        reason: reason || undefined,
        reference: reference || undefined,
        notes: notes || undefined,
      });

      toast({
        title: 'Success',
        description: `Stock movement created successfully`,
      });

      // Reset form
      setQuantity('');
      setReason('');
      setReference('');
      setNotes('');
      
      onSuccess?.();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create movement',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'ENTRY':
        return <ArrowDownCircle className="h-5 w-5 text-green-600" />;
      case 'EXIT':
        return <ArrowUpCircle className="h-5 w-5 text-red-600" />;
      case 'ADJUSTMENT':
        return <Settings2 className="h-5 w-5 text-blue-600" />;
    }
  };

  if (!isAvailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory Movement</CardTitle>
          <CardDescription>Feature only available in desktop app</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!initialProductId && (
        <div className="space-y-2">
          <Label htmlFor="product">Producto</Label>
          <ProductPicker 
            value={productId} 
            onValueChange={setProductId}
            disabled={isSubmitting}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="type">Movement Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ENTRY">
                  <span className="flex items-center gap-2">
                    <ArrowDownCircle className="h-4 w-4 text-green-600" />
                    Entry (Increase Stock)
                  </span>
                </SelectItem>
                <SelectItem value="EXIT">
                  <span className="flex items-center gap-2">
                    <ArrowUpCircle className="h-4 w-4 text-red-600" />
                    Exit (Decrease Stock)
                  </span>
                </SelectItem>
                <SelectItem value="ADJUSTMENT">
                  <span className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-blue-600" />
                    Adjustment
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              step="1"
              placeholder="Enter quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Input
              id="reason"
              type="text"
              placeholder="e.g., Stock delivery, Damaged, Inventory count"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Reference (Optional)</Label>
            <Input
              id="reference"
              type="text"
              placeholder="e.g., Invoice #123, Order #456"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Movement
        </Button>
      </form>
    );
  }

  if (!isAvailable) {
    return (
      <div className="rounded-lg border border-border bg-muted/50 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Inventory movement feature only available in desktop app
        </p>
      </div>
    );
  }
