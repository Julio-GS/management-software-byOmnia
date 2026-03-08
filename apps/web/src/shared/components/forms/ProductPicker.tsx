"use client"

import { useState, useEffect } from "react"
import { isElectron } from "@/lib/electron"
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
import { Button } from "@/shared/components/ui/button"
import { Check, ChevronsUpDown, Package } from "lucide-react"
import { cn } from "@/shared/utils/utils"

interface Product {
  id: string
  name: string
  barcode?: string
  price?: number
}

interface ProductPickerProps {
  value?: string
  onValueChange: (productId: string) => void
  placeholder?: string
  disabled?: boolean
}

export function ProductPicker({ 
  value, 
  onValueChange, 
  placeholder = "Seleccionar producto...",
  disabled = false 
}: ProductPickerProps) {
  const [open, setOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    if (!isElectron()) {
      // Mock data for web mode
      setProducts([
        { id: "1", name: "Leche Entera La Serenísima 1L", barcode: "7790070001234", price: 1250 },
        { id: "2", name: "Pan Lactal Bimbo 500g", barcode: "7790500045678", price: 2100 },
        { id: "3", name: "Aceite Girasol Cocinero 1.5L", barcode: "7790001234567", price: 3450 },
        { id: "4", name: "Fideos Matarazzo Spaghetti 500g", barcode: "7790040199901", price: 1890 },
        { id: "5", name: "Yogurt Natural Activia 200g", barcode: "7790600012345", price: 980 },
      ])
      return
    }

    setLoading(true)
    try {
      const result = await window.electron.db.query(
        "SELECT id, name, barcode, price FROM products WHERE deletedAt IS NULL ORDER BY name ASC LIMIT 100"
      )
      setProducts(result.rows as Product[])
    } catch (error) {
      console.error("Error loading products:", error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const selectedProduct = products.find(p => p.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || loading}
        >
          {selectedProduct ? (
            <div className="flex items-center gap-2 truncate">
              <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{selectedProduct.name}</span>
              {selectedProduct.barcode && (
                <span className="font-mono text-xs text-muted-foreground">
                  {selectedProduct.barcode}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar producto..." />
          <CommandList>
            <CommandEmpty>
              {loading ? "Cargando productos..." : "No se encontraron productos"}
            </CommandEmpty>
            <CommandGroup>
              {products.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.id}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === product.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{product.name}</span>
                      {product.price && (
                        <span className="font-mono text-xs text-muted-foreground shrink-0">
                          ${product.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {product.barcode && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {product.barcode}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
