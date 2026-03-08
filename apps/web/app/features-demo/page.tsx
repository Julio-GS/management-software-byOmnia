'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Separator } from '@/shared/components/ui/separator';
import { GlobalMarkupSettings, PriceCalculator } from '@/src/features/pricing';
import { InventoryMovementForm, MovementHistoryTable } from '@/src/features/inventory';
import { BarcodeInput } from '@/src/features/pos';
import { SyncStatusBadge, SyncQueueIndicator } from '@/shared/components/layout';
import { toast } from '@/hooks/use-toast';
import { useRealtimeUpdates } from '@/hooks/use-realtime-updates';
import { Package2, DollarSign, Scan, Cloud } from 'lucide-react';

export default function FeaturesDemoPage() {
  const [scannedProduct, setScannedProduct] = useState<any>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>('demo-product-123');

  // Listen for real-time updates
  useRealtimeUpdates({
    onProductUpdated: (product) => {
      console.log('Product updated:', product);
    },
    onInventoryMovement: (movement) => {
      console.log('Inventory movement:', movement);
      toast({
        title: 'Stock Updated',
        description: `Product stock changed by ${movement.quantity}`,
      });
    },
  });

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Phase 3 Features Demo</h1>
          <p className="text-muted-foreground">
            Interactive demonstration of pricing, inventory, sync, and barcode scanning features
          </p>
        </div>

        {/* Sync Status Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Sync Status
            </CardTitle>
            <CardDescription>Real-time sync status and queue management</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <SyncStatusBadge />
            <SyncQueueIndicator />
          </CardContent>
        </Card>

        <Separator />

        {/* Main Features Tabs */}
        <Tabs defaultValue="pricing" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pricing" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package2 className="h-4 w-4" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="barcode" className="flex items-center gap-2">
              <Scan className="h-4 w-4" />
              Barcode Scanner
            </TabsTrigger>
          </TabsList>

          {/* Pricing Tab */}
          <TabsContent value="pricing" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <GlobalMarkupSettings />
              <PriceCalculator />
            </div>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <InventoryMovementForm
                productId={selectedProductId}
                productName="Demo Product"
                currentStock={100}
                onSuccess={() => {
                  toast({
                    title: 'Movement Created',
                    description: 'Stock movement was recorded successfully',
                  });
                }}
              />
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Demo Info</CardTitle>
                    <CardDescription>
                      This is a demo form. In production, you would select a real product.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Selected Product ID: <code className="rounded bg-muted px-2 py-1">{selectedProductId}</code>
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <MovementHistoryTable 
              productId={selectedProductId} 
              productName="Demo Product" 
            />
          </TabsContent>

          {/* Barcode Scanner Tab */}
          <TabsContent value="barcode" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Barcode Scanner</CardTitle>
                  <CardDescription>
                    Use a keyboard wedge barcode scanner or type manually
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BarcodeInput
                    onProductFound={(product) => {
                      setScannedProduct(product);
                      toast({
                        title: 'Product Found!',
                        description: `${product.name} - $${product.price}`,
                      });
                    }}
                    onError={(error) => {
                      console.error('Barcode error:', error);
                    }}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Scanned Product</CardTitle>
                  <CardDescription>Last scanned product details</CardDescription>
                </CardHeader>
                <CardContent>
                  {scannedProduct ? (
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Name</span>
                        <span className="text-sm font-medium">{scannedProduct.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Barcode</span>
                        <code className="rounded bg-muted px-2 py-1 text-xs">{scannedProduct.barcode}</code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Price</span>
                        <span className="text-lg font-bold">${scannedProduct.price}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Stock</span>
                        <span className="text-sm font-medium">{scannedProduct.stock} units</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-32 items-center justify-center text-center text-sm text-muted-foreground">
                      No product scanned yet. Scan a barcode to see product details.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <strong>Keyboard Wedge Scanner:</strong> Point your scanner at a barcode. The scanner will
                  automatically input the barcode and trigger a product search.
                </p>
                <p>
                  <strong>Manual Entry:</strong> Type a barcode in the input field and press Enter to search.
                </p>
                <p>
                  <strong>Audio Feedback:</strong> Success beep (1000Hz) for found products, error beep (400Hz)
                  for not found.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
        <Card>
          <CardHeader>
            <CardTitle>Phase 3 Implementation Status</CardTitle>
            <CardDescription>Frontend UI Components</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <span>Custom Hooks (usePricingAPI, useInventoryAPI, useSyncStatus, useRealtimeUpdates, useBarcodeScanner)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <span>Pricing Management UI (Global Markup, Price Calculator)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <span>Inventory Management UI (Movement Form, History Table)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <span>Sync Status Indicators (Badge, Queue Indicator)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <span>Barcode Scanner Integration (Keyboard wedge support)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <span>Real-time Updates (WebSocket event listeners)</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
