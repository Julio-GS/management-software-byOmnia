'use client'

import { useState, useEffect } from 'react'

/**
 * Device capabilities interface
 */
export interface DeviceCapabilities {
  /** Whether device has touch support */
  hasTouch: boolean
  /** Whether device supports vibration/haptics */
  hasVibration: boolean
  /** Whether device has a camera */
  hasCamera: boolean
  /** Whether device supports geolocation */
  hasGeolocation: boolean
  /** Whether device supports local storage */
  hasLocalStorage: boolean
  /** Whether device supports service workers */
  hasServiceWorker: boolean
  /** Whether device is online */
  isOnline: boolean
  /** Whether device supports web share API */
  hasWebShare: boolean
  /** Whether device supports clipboard API */
  hasClipboard: boolean
  /** Connection type (if available) */
  connectionType?: string
  /** Whether connection is metered/limited */
  isMeteredConnection?: boolean
}

/**
 * Hook to detect device capabilities and features
 * 
 * @returns Object containing various device capability flags
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const capabilities = useDeviceCapabilities()
 *   
 *   return (
 *     <div>
 *       {capabilities.hasCamera && <CameraButton />}
 *       {capabilities.hasVibration && <HapticButton />}
 *       {capabilities.isOnline ? (
 *         <SyncButton />
 *       ) : (
 *         <OfflineIndicator />
 *       )}
 *     </div>
 *   )
 * }
 * ```
 * 
 * Reference: MOBILE_ADAPTATION_SDD.md - Phase 1 Foundation
 */
export function useDeviceCapabilities(): DeviceCapabilities {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    hasTouch: false,
    hasVibration: false,
    hasCamera: false,
    hasGeolocation: false,
    hasLocalStorage: false,
    hasServiceWorker: false,
    isOnline: true,
    hasWebShare: false,
    hasClipboard: false,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const detectCapabilities = async () => {
      // Touch support
      const hasTouch =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore - msMaxTouchPoints is IE specific
        navigator.msMaxTouchPoints > 0

      // Vibration support
      const hasVibration = 'vibrate' in navigator

      // Camera support (check for getUserMedia)
      const hasCamera =
        !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)

      // Geolocation support
      const hasGeolocation = 'geolocation' in navigator

      // Local storage support
      let hasLocalStorage = false
      try {
        hasLocalStorage = typeof window.localStorage !== 'undefined'
        // Test if we can actually use it
        window.localStorage.setItem('test', 'test')
        window.localStorage.removeItem('test')
      } catch (e) {
        hasLocalStorage = false
      }

      // Service worker support
      const hasServiceWorker = 'serviceWorker' in navigator

      // Online status
      const isOnline = navigator.onLine

      // Web Share API
      const hasWebShare = 'share' in navigator

      // Clipboard API
      const hasClipboard = !!(navigator.clipboard && navigator.clipboard.writeText)

      // Connection info
      // @ts-ignore - connection is not in standard Navigator type
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
      const connectionType = connection?.effectiveType
      const isMeteredConnection = connection?.saveData === true

      setCapabilities({
        hasTouch,
        hasVibration,
        hasCamera,
        hasGeolocation,
        hasLocalStorage,
        hasServiceWorker,
        isOnline,
        hasWebShare,
        hasClipboard,
        connectionType,
        isMeteredConnection,
      })
    }

    detectCapabilities()

    // Listen for online/offline changes
    const handleOnline = () => {
      setCapabilities((prev) => ({ ...prev, isOnline: true }))
    }

    const handleOffline = () => {
      setCapabilities((prev) => ({ ...prev, isOnline: false }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Listen for connection changes
    // @ts-ignore
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    const handleConnectionChange = () => {
      setCapabilities((prev) => ({
        ...prev,
        connectionType: connection?.effectiveType,
        isMeteredConnection: connection?.saveData === true,
      }))
    }

    if (connection) {
      connection.addEventListener('change', handleConnectionChange)
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange)
      }
    }
  }, [])

  return capabilities
}

/**
 * Hook to detect if device has touch support
 * 
 * @returns True if device supports touch input
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const hasTouch = useHasTouch()
 *   
 *   return (
 *     <button className={hasTouch ? 'touch-target' : 'mouse-target'}>
 *       Click me
 *     </button>
 *   )
 * }
 * ```
 */
export function useHasTouch(): boolean {
  const { hasTouch } = useDeviceCapabilities()
  return hasTouch
}

/**
 * Hook to detect if device is online
 * 
 * @returns True if device has network connection
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isOnline = useIsOnline()
 *   
 *   return (
 *     <div>
 *       {isOnline ? (
 *         <SyncButton />
 *       ) : (
 *         <OfflineWarning />
 *       )}
 *     </div>
 *   )
 * }
 * ```
 */
export function useIsOnline(): boolean {
  const { isOnline } = useDeviceCapabilities()
  return isOnline
}
