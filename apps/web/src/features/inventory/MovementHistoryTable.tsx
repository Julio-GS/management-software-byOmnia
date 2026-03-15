'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { useInventoryAPI, InventoryMovement } from '@/hooks/use-inventory-api';
import { ArrowDownCircle, ArrowUpCircle, Settings2, History } from 'lucide-react';
import { format } from 'date-fns';

interface MovementHistoryTableProps {
  productId: string;
  productName?: string;
}

export function MovementHistoryTable({ productId, productName }: MovementHistoryTableProps) {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'ENTRY' | 'EXIT' | 'ADJUSTMENT'>('ALL');
  
  const { getMovements } = useInventoryAPI();

  useEffect(() => {
    const loadMovements = async () => {
      setIsLoading(true);
      try {
        const type = filterType === 'ALL' ? undefined : filterType;
        const data = await getMovements(productId, type);
        setMovements(data);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to load movements',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadMovements();
  }, [productId, filterType, getMovements]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ENTRY':
        return <ArrowDownCircle className="h-4 w-4 text-green-600" />;
      case 'EXIT':
        return <ArrowUpCircle className="h-4 w-4 text-red-600" />;
      case 'ADJUSTMENT':
        return <Settings2 className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'secondary'> = {
      ENTRY: 'default',
      EXIT: 'destructive',
      ADJUSTMENT: 'secondary',
    };
    return <Badge variant={variants[type] || 'default'}>{type}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Movement History
            </CardTitle>
            {productName && <CardDescription>{productName}</CardDescription>}
          </div>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Types</SelectItem>
              <SelectItem value="ENTRY">Entries Only</SelectItem>
              <SelectItem value="EXIT">Exits Only</SelectItem>
              <SelectItem value="ADJUSTMENT">Adjustments Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : movements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No movements found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Previous</TableHead>
                <TableHead className="text-right">New Stock</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell className="text-sm">
                    {format(new Date(movement.createdAt), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(movement.type)}
                      {getTypeBadge(movement.type)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {movement.type === 'EXIT' ? '-' : '+'}{movement.quantity}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {movement.previousStock}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {movement.newStock}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {movement.reason || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {movement.reference || '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
