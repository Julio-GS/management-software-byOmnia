'use client'

import { useState, useEffect } from 'react'

/**
 * Device orientation type
 */
export type Orientation = 'portrait' | 'landscape'

/**
 * Hook to detect and track device orientation
 * 
 * @returns Current device orientation ('portrait' or 'landscape')
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const orientation = useOrientation()
 *   
 *   return (
 *     <div>
 *       Current orientation: {orientation}
 *       {orientation === 'landscape' && <LandscapeView />}
 *       {orientation === 'portrait' && <PortraitView />}
 *     </div>
 *   )
 * }
 * ```
 * 
 * Reference: MOBILE_ADAPTATION_SDD.md - Phase 1 Foundation
 */
export function useOrientation(): Orientation {
  // Initialize with SSR-safe default
  const [orientation, setOrientation] = useState<Orientation>('portrait')

  useEffect(() => {
    // Set initial orientation
    const updateOrientation = () => {
      if (typeof window !== 'undefined') {
        // Use window.screen.orientation if available (modern API)
        if (window.screen?.orientation) {
          const type = window.screen.orientation.type
          setOrientation(
            type.includes('portrait') ? 'portrait' : 'landscape'
          )
        } else {
          // Fallback to matchMedia
          setOrientation(
            window.matchMedia('(orientation: portrait)').matches
              ? 'portrait'
              : 'landscape'
          )
        }
      }
    }

    // Set initial value
    updateOrientation()

    // Listen for orientation changes
    if (window.screen?.orientation) {
      // Modern API
      window.screen.orientation.addEventListener('change', updateOrientation)
      
      return () => {
        window.screen.orientation.removeEventListener('change', updateOrientation)
      }
    } else {
      // Fallback to resize event
      window.addEventListener('resize', updateOrientation)
      
      return () => {
        window.removeEventListener('resize', updateOrientation)
      }
    }
  }, [])

  return orientation
}

/**
 * Hook to detect if device is in portrait orientation
 * 
 * @returns True if device is in portrait orientation
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isPortrait = useIsPortrait()
 *   
 *   return (
 *     <div className={isPortrait ? 'flex-col' : 'flex-row'}>
 *       Content adapts to orientation
 *     </div>
 *   )
 * }
 * ```
 */
export function useIsPortrait(): boolean {
  const orientation = useOrientation()
  return orientation === 'portrait'
}

/**
 * Hook to detect if device is in landscape orientation
 * 
 * @returns True if device is in landscape orientation
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isLandscape = useIsLandscape()
 *   
 *   return (
 *     <div>
 *       {isLandscape && <WideLayoutView />}
 *       {!isLandscape && <NarrowLayoutView />}
 *     </div>
 *   )
 * }
 * ```
 */
export function useIsLandscape(): boolean {
  const orientation = useOrientation()
  return orientation === 'landscape'
}
