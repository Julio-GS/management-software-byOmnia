'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { useInventoryAPI } from '@/hooks/use-inventory-api';
import { useToast } from '@/hooks/use-toast';
import { Trash2, X } from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  stock: number;
  price: number;
  minStock?: number;
}

interface BulkMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedProducts?: InventoryItem[];
  onSuccess: () => void;
}

interface MovementFormItem {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  currentPrice: number;
  enabled: boolean;
  stockMode: 'quantity' | 'absolute';
  stockValue: number;
  movementType: 'ENTRY' | 'EXIT' | 'ADJUSTMENT';
  updatePrice: boolean;
  newPrice: number;
}

export function BulkMovementDialog({ 
  open, 
  onOpenChange, 
  preselectedProducts, 
  onSuccess 
}: BulkMovementDialogProps) {
  const { bulkMovement } = useInventoryAPI();
  const { toast } = useToast();
  
  const [items, setItems] = useState<MovementFormItem[]>([]);
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && preselectedProducts) {
      const newItems: MovementFormItem[] = preselectedProducts.map((product, index) => ({
        id: `${product.id}-${Date.now()}-${index}`,
        productId: product.id,
        productName: product.name,
        currentStock: product.stock,
        currentPrice: product.price,
        enabled: true,
        stockMode: 'quantity',
        stockValue: 0,
        movementType: 'ENTRY',
        updatePrice: false,
        newPrice: product.price,
      }));
      setItems(newItems);
    }
  }, [open, preselectedProducts]);

  const updateItem = (id: string, updates: Partial<MovementFormItem>) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = async () => {
    const enabledItems = items.filter(item => item.enabled);
    
    if (enabledItems.length === 0) {
      toast({
        title: 'Error',
        description: 'Debe seleccionar al menos un producto',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const apiItems = enabledItems.map(item => ({
        productId: item.productId,
        stockQuantity: item.stockMode === 'quantity' && item.stockValue ? item.stockValue : undefined,
        setStockTo: item.stockMode === 'absolute' ? item.stockValue : undefined,
        movementType: item.movementType,
        newPrice: item.updatePrice && item.newPrice !== item.currentPrice ? item.newPrice : undefined,
        enabled: true,
      }));

      const result = await bulkMovement({
        items: apiItems,
        reason,
        reference,
        notes,
        continueOnError: true,
      });

      if (result.success) {
        toast({
          title: 'Éxito',
          description: `${result.processedCount} movimiento(s) creado(s) correctamente`,
        });
        onSuccess();
        onOpenChange(false);
        setItems([]);
        setReason('');
        setReference('');
        setNotes('');
      } else if (result.failedCount > 0 && result.processedCount > 0) {
        toast({
          title: 'Advertencia',
          description: `${result.processedCount} exitoso(s), ${result.failedCount} fallido(s)`,
        });
        onSuccess();
        onOpenChange(false);
      } else {
        toast({
          title: 'Error',
          description: result.errors[0]?.error || 'Error al crear movimientos',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Error de conexión',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStockPreview = (item: MovementFormItem): string => {
    if (!item.enabled || item.stockValue === 0) return item.currentStock.toString();
    
    if (item.stockMode === 'absolute') {
      return `${item.currentStock} → ${item.stockValue}`;
    }
    
    const newStock = item.movementType === 'ENTRY' 
      ? item.currentStock + item.stockValue 
      : item.currentStock - item.stockValue;
    
    return `${item.currentStock} → ${Math.max(0, newStock)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Movimiento de Inventario</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Productos ({items.length})</Label>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay productos seleccionados</p>
            ) : (
              <div className="border rounded-md divide-y max-h-60 overflow-y-auto">
                {items.map(item => (
                  <div key={item.id} className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={item.enabled}
                          onCheckedChange={(checked) => updateItem(item.id, { enabled: !!checked })}
                        />
                        <span className="font-medium">{item.productName}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {item.enabled && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 ml-6">
                        <div>
                          <Label className="text-xs">Modo Stock</Label>
                          <Select
                            value={item.stockMode}
                            onValueChange={(value: 'quantity' | 'absolute') => 
                              updateItem(item.id, { stockMode: value, stockValue: 0 })
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="quantity">Cantidad</SelectItem>
                              <SelectItem value="absolute">Stock Final</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label className="text-xs">
                            {item.stockMode === 'quantity' ? 'Cantidad' : 'Stock Final'}
                          </Label>
                          <Input
                            type="number"
                            className="h-8"
                            value={item.stockValue}
                            onChange={(e) => updateItem(item.id, { 
                              stockValue: parseInt(e.target.value) || 0 
                            })}
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs">Tipo</Label>
                          <Select
                            value={item.movementType}
                            onValueChange={(value: 'ENTRY' | 'EXIT' | 'ADJUSTMENT') =>
                              updateItem(item.id, { movementType: value })
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ENTRY">Entrada</SelectItem>
                              <SelectItem value="EXIT">Salida</SelectItem>
                              <SelectItem value="ADJUSTMENT">Ajuste</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label className="text-xs">Preview Stock</Label>
                          <div className="h-8 flex items-center text-sm">
                            {getStockPreview(item)}
                          </div>
                        </div>
                        
                        <div className="col-span-2 md:col-span-4 flex items-center gap-2">
                          <Checkbox
                            checked={item.updatePrice}
                            onCheckedChange={(checked) => updateItem(item.id, { 
                              updatePrice: !!checked,
                              newPrice: item.currentPrice 
                            })}
                          />
                          <Label className="text-sm">Actualizar precio</Label>
                          {item.updatePrice && (
                            <div className="flex items-center gap-1 ml-2">
                              <span className="text-sm">${item.currentPrice}</span>
                              <span>→</span>
                              <Input
                                type="number"
                                className="h-7 w-24"
                                value={item.newPrice}
                                onChange={(e) => updateItem(item.id, { 
                                  newPrice: parseFloat(e.target.value) || 0 
                                })}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="reason">Motivo</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Inventario mensual"
              />
            </div>
            <div>
              <Label htmlFor="reference">Referencia</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="REF-001"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notas</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionales"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || items.filter(i => i.enabled).length === 0}
          >
            {isSubmitting ? 'Guardando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
