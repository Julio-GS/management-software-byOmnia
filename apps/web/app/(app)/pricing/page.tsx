"use client"

import { GlobalMarkupSettings } from "@/src/features/pricing/GlobalMarkupSettings"
import { PriceCalculator } from "@/src/features/pricing/PriceCalculator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"

export default function PricingPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Precios</h1>
        <p className="text-muted-foreground">
          Configure markup global, calcule precios individuales y gestione márgenes por categoría
        </p>
      </div>

      <Tabs defaultValue="calculator" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="calculator">Calculadora</TabsTrigger>
          <TabsTrigger value="global">Markup Global</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Calculadora de Precios</CardTitle>
              <CardDescription>
                Calcule precios de venta individuales basándose en el costo y markup configurado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PriceCalculator />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="global" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Markup Global</CardTitle>
              <CardDescription>
                Ajuste el markup global aplicado a todos los productos. Los cambios se sincronizan automáticamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GlobalMarkupSettings />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Markup por Categoría</CardTitle>
              <CardDescription>
                Próximamente: Configure markup personalizado para categorías específicas de productos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">Función en desarrollo</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
