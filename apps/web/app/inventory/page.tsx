"use client"

import { InventoryMovementForm } from "@/features/inventory/InventoryMovementForm"
import { MovementHistoryTable } from "@/features/inventory/MovementHistoryTable"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { Package, History } from "lucide-react"

export default function InventoryPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Inventario</h1>
        <p className="text-muted-foreground">
          Registre movimientos de stock, consulte el historial y mantenga el inventario actualizado
        </p>
      </div>

      <Tabs defaultValue="movements" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="movements" className="gap-2">
            <Package className="h-4 w-4" />
            Movimientos
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="movements" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Registrar Movimiento de Stock</CardTitle>
              <CardDescription>
                Registre entradas, salidas y ajustes de inventario. Los cambios se sincronizan automáticamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InventoryMovementForm />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stock Actual</CardTitle>
              <CardDescription>
                Consulte niveles de stock en tiempo real por producto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">Vista de stock actual - Próximamente</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Movimientos</CardTitle>
              <CardDescription>
                Auditoría completa de todos los movimientos de inventario registrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MovementHistoryTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
