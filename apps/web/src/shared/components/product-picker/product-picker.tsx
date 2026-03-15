"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2, Search, X, Package } from "lucide-react"
import { Product } from "@omnia/shared-types"
import { cn } from "@/shared/utils/utils"
import { Button } from "@/shared/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover"
import { Badge } from "@/shared/components/ui/badge"
import { useProductPicker } from "./use-product-picker"

export interface ProductPickerProps {
  /**
   * Callback when a product is selected
   */
  onSelectProduct: (product: Product) => void
  
  /**
   * Currently selected product (for controlled mode)
   */
  selectedProduct?: Product | null
  
  /**
   * Placeholder text for the search input
   */
  placeholder?: string
  
  /**
   * Whether the picker is disabled
   */
  disabled?: boolean
  
  /**
   * Custom className for the trigger button
   */
  className?: string
  
  /**
   * Whether to show detailed product info in results
   */
  showDetails?: boolean
  
  /**
   * Filter to only show active products
   */
  onlyActive?: boolean
}

/**
 * ProductPicker Component
 * 
 * A searchable autocomplete component for selecting products.
 * Features:
 * - Real-time search by name, SKU, or barcode
 * - Debounced API calls (300ms)
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Loading, error, and empty states
 * - Accessible (ARIA labels, focus management)
 * 
 * @example
 * ```tsx
 * <ProductPicker
 *   onSelectProduct={(product) => console.log(product)}
 *   placeholder="Search products..."
 * />
 * ```
 */
export function ProductPicker({
  onSelectProduct,
  selectedProduct,
  placeholder = "Buscar producto...",
  disabled = false,
  className,
  showDetails = true,
  onlyActive = true,
}: ProductPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  
  const {
    products,
    isLoading,
    error,
    debouncedSearch,
    clearSearch,
  } = useProductPicker({ onlyActive })

  // Debounced search effect
  React.useEffect(() => {
    if (open && searchQuery.trim()) {
      debouncedSearch(searchQuery)
    } else if (!searchQuery.trim()) {
      clearSearch()
    }
  }, [searchQuery, open, debouncedSearch, clearSearch])

  const handleSelect = (product: Product) => {
    onSelectProduct(product)
    setOpen(false)
    setSearchQuery("")
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelectProduct(null as any)
    setSearchQuery("")
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Seleccionar producto"
          disabled={disabled}
          className={cn(
            "w-full justify-between",
            !selectedProduct && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectedProduct ? (
              <>
                <Package className="h-4 w-4 shrink-0" />
                <span className="truncate">{selectedProduct.name}</span>
                {showDetails && (
                  <span className="text-xs text-muted-foreground font-mono">
                    ({selectedProduct.sku})
                  </span>
                )}
              </>
            ) : (
              <>
                <Search className="h-4 w-4 shrink-0" />
                <span>{placeholder}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {selectedProduct && !disabled && (
              <X
                className="h-4 w-4 opacity-50 hover:opacity-100"
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar por nombre, SKU o código de barras..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Buscando productos...
                </span>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
                <p className="text-sm text-destructive font-medium">
                  Error al buscar productos
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {error}
                </p>
              </div>
            )}

            {!isLoading && !error && products.length === 0 && searchQuery && (
              <CommandEmpty>
                <div className="flex flex-col items-center gap-2 py-6">
                  <Search className="h-8 w-8 opacity-30" />
                  <p className="text-sm font-medium">No se encontraron productos</p>
                  <p className="text-xs text-muted-foreground">
                    Intenta con otros términos de búsqueda
                  </p>
                </div>
              </CommandEmpty>
            )}

            {!isLoading && !error && products.length === 0 && !searchQuery && (
              <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                <Search className="h-8 w-8 opacity-30" />
                <p className="text-sm">
                  Escribe para buscar productos
                </p>
              </div>
            )}

            {!isLoading && !error && products.length > 0 && (
              <CommandGroup>
                {products.slice(0, 10).map((product) => {
                  const isSelected = selectedProduct?.id === product.id
                  const isLowStock = product.stock <= product.minStock
                  const isOutOfStock = product.stock === 0

                  return (
                    <CommandItem
                      key={product.id}
                      value={product.id}
                      onSelect={() => handleSelect(product)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Check
                            className={cn(
                              "h-4 w-4 shrink-0",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">
                                {product.name}
                              </span>
                              {isOutOfStock && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-destructive/30 bg-destructive/10 text-destructive shrink-0"
                                >
                                  Sin stock
                                </Badge>
                              )}
                              {!isOutOfStock && isLowStock && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-warning/30 bg-warning/10 text-warning-foreground shrink-0"
                                >
                                  Stock bajo
                                </Badge>
                              )}
                            </div>
                            {showDetails && (
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="font-mono">{product.sku}</span>
                                {product.barcode && (
                                  <span className="font-mono">{product.barcode}</span>
                                )}
                                <span>Stock: {product.stock}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {showDetails && (
                          <div className="flex flex-col items-end gap-0.5 shrink-0">
                            <span className="text-sm font-semibold">
                              {formatCurrency(product.price)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Stock: {product.stock}
                            </span>
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  )
                })}
                {products.length > 10 && (
                  <div className="px-2 py-1.5 text-xs text-center text-muted-foreground border-t">
                    Mostrando 10 de {products.length} resultados
                  </div>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
