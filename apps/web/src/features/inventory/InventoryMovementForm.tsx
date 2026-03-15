'use client';

import { useState, FormEvent } from 'react';
import { Product } from '@omnia/shared-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useInventoryAPI } from '@/hooks/use-inventory-api';
import { ProductPicker } from '@/shared/components/product-picker';
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
  currentStock: initialCurrentStock,
  onSuccess 
}: InventoryMovementFormProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [type, setType] = useState<'ENTRY' | 'EXIT' | 'ADJUSTMENT'>('ENTRY');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { createMovement } = useInventoryAPI();

  // Derived values
  const productId = initialProductId || selectedProduct?.id || '';
  const currentStock = initialCurrentStock ?? selectedProduct?.stock ?? 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Validate product selection
    if (!productId) {
      toast({
        variant: 'destructive',
        title: 'Producto Requerido',
        description: 'Por favor selecciona un producto',
      });
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty === 0) {
      toast({
        variant: 'destructive',
        title: 'Cantidad Inválida',
        description: 'Por favor ingresa una cantidad válida',
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
        title: 'Éxito',
        description: `Movimiento de inventario creado correctamente`,
      });

      // Reset form
      setQuantity('');
      setReason('');
      setReference('');
      setNotes('');
      setSelectedProduct(null);
      
      onSuccess?.();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al crear el movimiento',
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!initialProductId && (
        <div className="space-y-2">
          <Label htmlFor="product">Producto</Label>
          <ProductPicker
            selectedProduct={selectedProduct}
            onSelectProduct={setSelectedProduct}
            placeholder="Seleccionar producto..."
            showDetails={true}
          />
          {selectedProduct && (
            <p className="text-xs text-muted-foreground">
              Stock actual: {selectedProduct.stock} unidades
            </p>
          )}
        </div>
      )}

      {initialProductId && productName && (
        <div className="space-y-2">
          <Label>Producto Seleccionado</Label>
          <div className="rounded-md border bg-muted px-3 py-2 text-sm">
            <p className="font-medium">{productName}</p>
            <p className="text-xs text-muted-foreground">
              Stock actual: {currentStock} unidades
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="type">Tipo de Movimiento</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)} disabled={isSubmitting}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ENTRY">
                  <span className="flex items-center gap-2">
                    <ArrowDownCircle className="h-4 w-4 text-green-600" />
                    Entrada (Aumentar Stock)
                  </span>
                </SelectItem>
                <SelectItem value="EXIT">
                  <span className="flex items-center gap-2">
                    <ArrowUpCircle className="h-4 w-4 text-red-600" />
                    Salida (Disminuir Stock)
                  </span>
                </SelectItem>
                <SelectItem value="ADJUSTMENT">
                  <span className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-blue-600" />
                    Ajuste
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Cantidad</Label>
            <Input
              id="quantity"
              type="number"
              step="1"
              placeholder="Ingresa la cantidad"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo (Opcional)</Label>
            <Input
              id="reason"
              type="text"
              placeholder="ej. Recepción, Rotura, Conteo de inventario"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Referencia (Opcional)</Label>
            <Input
              id="reference"
              type="text"
              placeholder="ej. Factura #123, Pedido #456"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionales..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

      <Button type="submit" disabled={isSubmitting || !productId} className="w-full">
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Crear Movimiento
      </Button>
    </form>
  );
}
