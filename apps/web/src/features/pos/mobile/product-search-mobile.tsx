/**
 * Product Search Mobile Component
 * Reference: MOBILE_DESIGN_SYSTEM.md - Section "Product Card Design"
 * 
 * Mobile-optimized product search with:
 * - Search input with barcode scanner
 * - 2-column product grid
 * - Touch-optimized add buttons
 * - Image placeholders
 * 
 * @example
 * ```tsx
 * <ProductSearchMobile onAddToCart={handleAdd} />
 * ```
 */

"use client"

import { useState, useCallback, useEffect } from "react"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"
import { Card } from "@/shared/components/ui/card"
import { Search, Plus, Barcode, Camera } from "lucide-react"
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner"
import { useHapticFeedback } from "@/hooks/use-haptic-feedback"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Product {
  id: string
  name: string
  barcode: string
  price: number
  stock: number
  sku: string
  image?: string
}

interface ProductSearchMobileProps {
  onAddToCart: (product: { id: string; name: string; barcode: string; price: number }) => void
}

/* ------------------------------------------------------------------ */
/*  Mock Data (TODO: Replace with API call)                           */
/* ------------------------------------------------------------------ */

const mockProducts: Product[] = [
  {
    id: "1",
    name: "Coca Cola 600ml",
    barcode: "7790315531774",
    price: 2.5,
    stock: 45,
    sku: "CC600",
  },
  {
    id: "2",
    name: "Pan Blanco",
    barcode: "7790310951774",
    price: 1.2,
    stock: 120,
    sku: "PB001",
  },
  {
    id: "3",
    name: "Arroz 1kg",
    barcode: "7790310951775",
    price: 3.75,
    stock: 80,
    sku: "AR1K",
  },
  {
    id: "4",
    name: "Aceite Vegetal 900ml",
    barcode: "7790310951776",
    price: 4.5,
    stock: 35,
    sku: "AV900",
  },
  {
    id: "5",
    name: "Leche Entera 1L",
    barcode: "7790310951777",
    price: 1.8,
    stock: 60,
    sku: "LE1L",
  },
  {
    id: "6",
    name: "Azúcar 1kg",
    barcode: "7790310951778",
    price: 2.2,
    stock: 90,
    sku: "AZ1K",
  },
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ProductSearchMobile({ onAddToCart }: ProductSearchMobileProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(mockProducts)
  const [showScanner, setShowScanner] = useState(false)
  const haptic = useHapticFeedback()

  /* ------------------------------------------------------------------ */
  /*  Barcode Scanner Integration                                        */
  /* ------------------------------------------------------------------ */

  const handleBarcodeDetected = useCallback(
    (barcode: string) => {
      setSearchQuery(barcode)
      const product = mockProducts.find((p) => p.barcode === barcode)
      if (product) {
        onAddToCart(product)
        haptic.trigger("success")
      }
    },
    [onAddToCart, haptic]
  )

  useBarcodeScanner(handleBarcodeDetected)

  /* ------------------------------------------------------------------ */
  /*  Search Filter                                                      */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts(mockProducts)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = mockProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        product.barcode.includes(query) ||
        product.sku.toLowerCase().includes(query)
    )
    setFilteredProducts(filtered)
  }, [searchQuery])

  /* ------------------------------------------------------------------ */
  /*  Handlers                                                           */
  /* ------------------------------------------------------------------ */

  const handleAddClick = useCallback(
    (product: Product) => {
      onAddToCart(product)
      haptic.trigger("light")
    },
    [onAddToCart, haptic]
  )

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Search Bar */}
      <div className="p-4 bg-card border-b space-y-3">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="text"
            placeholder="Buscar producto o escanear..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 h-12 text-base"
            autoComplete="off"
          />
        </div>

        <Button
          variant="outline"
          className="w-full h-11 gap-2"
          onClick={() => setShowScanner(true)}
        >
          <Camera className="w-5 h-5" aria-hidden="true" />
          Escanear con cámara
        </Button>
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <Search className="w-12 h-12 text-muted-foreground mb-4" aria-hidden="true" />
            <p className="text-base font-medium text-muted-foreground">
              No se encontraron productos
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Intenta con otro término de búsqueda
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-4">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="flex flex-col gap-2 p-3 hover:shadow-md transition-shadow"
              >
                {/* Product Image */}
                <div className="w-full h-20 rounded-md bg-muted overflow-hidden flex items-center justify-center">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Barcode className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 min-h-0">
                  <h3 className="text-sm font-semibold line-clamp-2 mb-1">
                    {product.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    SKU: {product.sku}
                  </p>
                  <p
                    className={cn(
                      "text-xs",
                      product.stock > 20
                        ? "text-green-600"
                        : product.stock > 10
                        ? "text-yellow-600"
                        : "text-red-600"
                    )}
                  >
                    Stock: {product.stock}
                  </p>
                </div>

                {/* Price and Add Button */}
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-lg font-bold">
                    ${product.price.toFixed(2)}
                  </span>
                </div>
                <Button
                  size="sm"
                  className="w-full h-9 gap-1"
                  onClick={() => handleAddClick(product)}
                  disabled={product.stock === 0}
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  Añadir
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
