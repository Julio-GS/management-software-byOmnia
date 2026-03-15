'use client';

// TODO: This page was previously a demo for Electron-specific features (barcode scanning, real-time sync)
// Web-compatible alternatives needed:
// - BarcodeInput: Implement web-based barcode scanner using WebRTC camera API
// - useRealtimeUpdates: Replace with WebSocket connection to backend
// - SyncStatus components: Not applicable in web-only mode (no offline sync)

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Separator } from '@/shared/components/ui/separator';
import { GlobalMarkupSettings, PriceCalculator } from '@/src/features/pricing';
import { InventoryMovementForm, MovementHistoryTable } from '@/src/features/inventory';
import { toast } from '@/hooks/use-toast';
import { Package2, DollarSign, AlertCircle } from 'lucide-react';

export default function FeaturesDemoPage() {
  const [selectedProductId, setSelectedProductId] = useState<string>('demo-product-123');

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

        {/* Web Mode Notice */}
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Web Mode - Limited Features
            </CardTitle>
            <CardDescription>Some Electron-specific features are not available in web mode</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Removed features: Barcode scanner (keyboard wedge), offline sync, real-time desktop updates.</p>
            <p className="mt-2">Available features: Pricing management, inventory movements.</p>
          </CardContent>
        </Card>

        <Separator />

        {/* Main Features Tabs */}
        <Tabs defaultValue="pricing" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pricing" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package2 className="h-4 w-4" />
              Inventory
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
              <span className="text-red-600">❌</span>
              <span>Barcode Scanner Integration (Electron-only, removed)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-600">❌</span>
              <span>Real-time Desktop Updates (Electron-only, removed)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-600">❌</span>
              <span>Offline Sync (Electron-only, removed)</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
