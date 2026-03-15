/**
 * Viewport Height Hook
 * Reference: MOBILE_ADAPTATION_SDD.md - Section "Support & Troubleshooting"
 * 
 * Fixes the iOS Safari 100vh problem by calculating the actual viewport height
 * and exposing it as a CSS custom property.
 * 
 * Issue: On iOS Safari, 100vh includes the browser chrome, causing overflow
 * Solution: Calculate actual viewport height and set --vh CSS variable
 * 
 * @example
 * ```tsx
 * // In your component
 * useViewportHeight();
 * 
 * // In your CSS/Tailwind
 * <div className="h-[calc(var(--vh,1vh)*100)]">
 *   Full viewport height
 * </div>
 * ```
 */

import { useEffect } from 'react';

/**
 * Hook to set CSS custom property --vh for accurate viewport height on iOS
 * Call this hook at the root of your app to make --vh available globally
 */
export function useViewportHeight(): void {
  useEffect(() => {
    // Function to update the viewport height
    const updateViewportHeight = () => {
      // Get the actual viewport height
      const vh = window.innerHeight * 0.01;
      
      // Set the --vh custom property on the document root
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // Set initial value
    updateViewportHeight();

    // Update on resize
    window.addEventListener('resize', updateViewportHeight);
    
    // Update on orientation change (important for mobile)
    window.addEventListener('orientationchange', updateViewportHeight);

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('orientationchange', updateViewportHeight);
    };
  }, []);
}

/**
 * Get the current viewport height in pixels
 * Useful for programmatic height calculations
 */
export function getViewportHeight(): number {
  if (typeof window === 'undefined') return 0;
  return window.innerHeight;
}
