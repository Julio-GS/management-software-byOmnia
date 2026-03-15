import { useState, useCallback, useRef, useEffect } from "react"
import { Product } from "@omnia/shared-types"
import { apiClient } from "@/lib/api-client-instance"

interface UseProductPickerOptions {
  /**
   * Only fetch active products
   */
  onlyActive?: boolean
  
  /**
   * Debounce delay in milliseconds
   */
  debounceMs?: number
}

interface UseProductPickerReturn {
  /**
   * List of products matching the search query
   */
  products: Product[]
  
  /**
   * Whether a search is in progress
   */
  isLoading: boolean
  
  /**
   * Error message if search failed
   */
  error: string | null
  
  /**
   * Debounced search function
   */
  debouncedSearch: (query: string) => void
  
  /**
   * Clear search results
   */
  clearSearch: () => void
}

/**
 * Hook for managing product search with debouncing
 * 
 * Features:
 * - Debounced API calls (default 300ms)
 * - Automatic cancellation of pending requests
 * - Error handling
 * - Loading states
 * 
 * @example
 * ```tsx
 * const { products, isLoading, error, debouncedSearch } = useProductPicker()
 * 
 * // Trigger search
 * debouncedSearch("leche")
 * ```
 */
export function useProductPicker(
  options: UseProductPickerOptions = {}
): UseProductPickerReturn {
  const { onlyActive = true, debounceMs = 300 } = options
  
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const searchProducts = useCallback(
    async (query: string) => {
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController()

      setIsLoading(true)
      setError(null)

      try {
        const result = await apiClient.products.getAll(
          {
            search: query,
            active: onlyActive,
          },
          {
            page: 1,
            limit: 50, // Get up to 50 results, display max 10
          }
        )

        // Check if request was aborted
        if (abortControllerRef.current.signal.aborted) {
          return
        }

        setProducts(result.items || [])
      } catch (err: any) {
        // Ignore abort errors
        if (err.name === "AbortError" || err.message?.includes("abort")) {
          return
        }

        console.error("Product search error:", err)
        setError(
          err.response?.data?.message ||
            err.message ||
            "Error al buscar productos"
        )
        setProducts([])
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
      }
    },
    [onlyActive]
  )

  const debouncedSearch = useCallback(
    (query: string) => {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Don't search for empty queries
      if (!query.trim()) {
        setProducts([])
        return
      }

      // Set new timer
      debounceTimerRef.current = setTimeout(() => {
        searchProducts(query)
      }, debounceMs)
    },
    [searchProducts, debounceMs]
  )

  const clearSearch = useCallback(() => {
    // Cancel any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    setProducts([])
    setError(null)
    setIsLoading(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    products,
    isLoading,
    error,
    debouncedSearch,
    clearSearch,
  }
}
