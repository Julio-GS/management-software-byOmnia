"use client"

import { useState, FormEvent } from "react"
import { Product } from "@omnia/shared-types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Slider } from "@/shared/components/ui/slider"
import { toast } from "@/hooks/use-toast"
import { usePricingAPI, PriceCalculation } from "@/hooks/use-pricing-api"
import { ProductPicker } from "@/shared/components/product-picker"
import { Calculator, Settings, Loader2, DollarSign, TrendingUp } from "lucide-react"
import { useHapticFeedback } from "@/hooks/use-haptic-feedback"

export function PricingMobileView() {
  const haptic = useHapticFeedback()
  const [activeTab, setActiveTab] = useState<"calculator" | "global">("calculator")
  
  // Calculator state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [cost, setCost] = useState("")
  const [result, setResult] = useState<PriceCalculation | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  
  // Global markup state
  const [markup, setMarkup] = useState(30)
  const [isLoading, setIsLoading] = useState(false)
  
  const { calculatePrice, updateGlobalMarkup } = usePricingAPI()

  // Calculator handlers
  const handleProductSelect = (product: Product | null) => {
    setSelectedProduct(product)
    if (product) {
      setCost(product.cost.toString())
    }
    haptic.trigger("light")
  }

  const handleCalculate = async (e: FormEvent) => {
    e.preventDefault()
    haptic.trigger("light")

    const costValue = parseFloat(cost)
    if (isNaN(costValue) || costValue <= 0) {
      toast({
        variant: "destructive",
        title: "Entrada inválida",
        description: "Ingrese un costo válido",
      })
      haptic.trigger("error")
      return
    }

    setIsCalculating(true)
    try {
      const calculation = await calculatePrice(costValue)
      setResult(calculation)
      haptic.trigger("success")
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Error al calcular precio",
      })
      haptic.trigger("error")
    } finally {
      setIsCalculating(false)
    }
  }

  // Global markup handlers
  const handleSaveMarkup = async () => {
    haptic.trigger("light")
    setIsLoading(true)
    try {
      await updateGlobalMarkup(markup)
      toast({
        title: "Guardado",
        description: "Markup global actualizado correctamente",
      })
      haptic.trigger("success")
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Error al actualizar markup",
      })
      haptic.trigger("error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleTabChange = (tab: "calculator" | "global") => {
    setActiveTab(tab)
    haptic.trigger("light")
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-foreground">Gestión de Precios</h1>
        <p className="text-xs text-muted-foreground">
          Calcule precios y configure markup
        </p>
      </div>

      {/* Tab Selector */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
        <button
          onClick={() => handleTabChange("calculator")}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${
            activeTab === "calculator"
              ? "bg-card text-card-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          <Calculator className="h-4 w-4" />
          Calculadora
        </button>
        <button
          onClick={() => handleTabChange("global")}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${
            activeTab === "global"
              ? "bg-card text-card-foreground shadow-sm"
              : "text-muted-foreground"
          }`}
        >
          <Settings className="h-4 w-4" />
          Markup Global
        </button>
      </div>

      {/* Calculator Tab */}
      {activeTab === "calculator" && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Calculadora de Precios</CardTitle>
              <CardDescription className="text-xs">
                Calcule precios de venta basados en costo y markup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleCalculate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="product" className="text-sm">Producto (Opcional)</Label>
                  <ProductPicker
                    selectedProduct={selectedProduct}
                    onSelectProduct={handleProductSelect}
                    placeholder="Seleccionar producto..."
                    showDetails={true}
                  />
                  {selectedProduct && (
                    <p className="text-xs text-muted-foreground">
                      Costo: ${selectedProduct.cost.toFixed(2)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cost" className="text-sm">Costo del Producto</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cost"
                      type="number"
                      step="0.01"
                      placeholder="100.00"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      disabled={isCalculating}
                      className="text-base"
                    />
                    <Button 
                      type="submit" 
                      disabled={isCalculating || !cost}
                      className="shrink-0"
                    >
                      {isCalculating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Calcular
                    </Button>
                  </div>
                </div>
              </form>

              {result && (
                <div className="pt-4 border-t space-y-3">
                  {/* Result Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-muted/50">
                      <CardContent className="p-3 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <DollarSign className="h-3 w-3" />
                          Precio Calculado
                        </div>
                        <p className="text-xl font-bold font-mono">
                          ${result.calculatedPrice.toFixed(2)}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="p-3 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-primary">
                          <TrendingUp className="h-3 w-3" />
                          Precio Sugerido
                        </div>
                        <p className="text-xl font-bold font-mono text-primary">
                          ${result.suggestedPrice.toFixed(2)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Details */}
                  <Card className="bg-muted/30">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Markup Aplicado</span>
                        <span className="font-semibold">{result.markupPercentage}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Origen del Markup</span>
                        <span className="font-medium capitalize">{result.markupSource}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Global Markup Tab */}
      {activeTab === "global" && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Markup Global</CardTitle>
              <CardDescription className="text-xs">
                Markup por defecto aplicado a todos los productos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label className="text-sm">Porcentaje de Markup</Label>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[markup]}
                    onValueChange={([v]) => {
                      setMarkup(v)
                      haptic.trigger("light")
                    }}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <div className="flex items-center gap-1 w-16">
                    <Input
                      type="number"
                      value={markup}
                      onChange={(e) => setMarkup(Number(e.target.value))}
                      className="w-full text-center font-semibold"
                      min={0}
                      max={100}
                      disabled={isLoading}
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
              </div>

              {/* Example Card */}
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">Ejemplo:</p>
                  <p className="text-sm">
                    Producto con costo <span className="font-semibold">$100</span> tendrá precio{" "}
                    <span className="font-bold text-primary text-base">
                      ${(100 * (1 + markup / 100)).toFixed(2)}
                    </span>
                  </p>
                </CardContent>
              </Card>

              <Button 
                onClick={handleSaveMarkup} 
                disabled={isLoading}
                className="w-full h-11"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </CardContent>
          </Card>

          {/* Category Markup - Coming Soon */}
          <Card className="border-dashed border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Markup por Categoría</CardTitle>
              <CardDescription className="text-xs">
                Configure markup personalizado por categoría
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-24 rounded-lg bg-muted/30">
                <p className="text-xs text-muted-foreground">Próximamente</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
