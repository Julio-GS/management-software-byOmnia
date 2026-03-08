"use client"

import { useState } from "react"
import { BarcodeInput } from "@/features/pos/BarcodeInput"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Barcode, ShoppingCart } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"

export default function POSPage() {
  const [scannedProducts, setScannedProducts] = useState<Array<{barcode: string, timestamp: Date}>>([])

  const handleBarcodeScanned = (barcode: string) => {
    setScannedProducts(prev => [{barcode, timestamp: new Date()}, ...prev].slice(0, 20))
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Punto de Venta</h1>
        <p className="text-muted-foreground">
          Escaneo de productos con lector de código de barras y gestión de ventas
        </p>
      </div>

      <Tabs defaultValue="scanner" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="scanner" className="gap-2">
            <Barcode className="h-4 w-4" />
            Escáner
          </TabsTrigger>
          <TabsTrigger value="sales" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Ventas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scanner" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Escáner de Código de Barras</CardTitle>
              <CardDescription>
                Use un lector de código de barras de tipo keyboard wedge para escanear productos.
                Se detecta automáticamente cuando se escanea rápidamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <BarcodeInput onBarcodeScanned={handleBarcodeScanned} />

              {scannedProducts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Productos Escaneados</h3>
                    <Badge variant="secondary">{scannedProducts.length}</Badge>
                  </div>
                  <div className="border rounded-lg divide-y max-h-[400px] overflow-auto">
                    {scannedProducts.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 hover:bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <Barcode className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-mono text-sm font-medium">{item.barcode}</span>
                            <span className="text-xs text-muted-foreground">
                              {item.timestamp.toLocaleTimeString('es-AR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Instrucciones</CardTitle>
              <CardDescription>Cómo usar el escáner de código de barras</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  1
                </div>
                <p>Conecte un lector de código de barras USB (tipo keyboard wedge)</p>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  2
                </div>
                <p>Haga clic en el campo de entrada o presione la tecla de acceso rápido</p>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  3
                </div>
                <p>Escanee el código de barras del producto - se detectará automáticamente</p>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  4
                </div>
                <p>Escuchará un tono de confirmación cuando el escaneo sea exitoso</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Ventas</CardTitle>
              <CardDescription>
                Interfaz completa de punto de venta con carrito, pagos múltiples y facturación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Vista completa de POS disponible en el menú principal
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
