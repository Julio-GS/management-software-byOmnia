/**
 * Enhanced Responsive Hook
 * Reference: MOBILE_ADAPTATION_SDD.md - Section "Responsive Hook"
 * 
 * Provides comprehensive breakpoint detection and viewport information.
 * Replaces the legacy use-mobile.ts hook with enhanced capabilities.
 * 
 * @example
 * ```tsx
 * const { isMobile, isTablet, isDesktop, currentBreakpoint, width } = useResponsive();
 * 
 * return isMobile ? <MobileView /> : <DesktopView />;
 * ```
 */

import { useEffect, useState } from 'react';
import { BREAKPOINT_VALUES, getCurrentBreakpoint, type Breakpoint } from '@/lib/breakpoints.config';

export interface ResponsiveState {
  /** True if viewport is < 640px (mobile phones) */
  isMobile: boolean;
  /** True if viewport is 640-1023px (tablets) */
  isTablet: boolean;
  /** True if viewport is >= 1024px (desktop) */
  isDesktop: boolean;
  /** Current breakpoint: 'mobile' | 'tablet' | 'desktop' */
  currentBreakpoint: Breakpoint;
  /** Current viewport width in pixels */
  width: number;
}

/**
 * Hook to detect current responsive breakpoint
 * 
 * @returns ResponsiveState object with breakpoint information
 */
export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    // Initialize with SSR-safe defaults (assume desktop to avoid hydration mismatch)
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        currentBreakpoint: 'desktop' as Breakpoint,
        width: 1024,
      };
    }

    // Client-side initialization
    const width = window.innerWidth;
    const breakpoint = getCurrentBreakpoint(width);

    return {
      isMobile: breakpoint === 'mobile',
      isTablet: breakpoint === 'tablet',
      isDesktop: breakpoint === 'desktop',
      currentBreakpoint: breakpoint,
      width,
    };
  });

  useEffect(() => {
    // Update state based on current window size
    const updateState = () => {
      const width = window.innerWidth;
      const breakpoint = getCurrentBreakpoint(width);

      setState({
        isMobile: breakpoint === 'mobile',
        isTablet: breakpoint === 'tablet',
        isDesktop: breakpoint === 'desktop',
        currentBreakpoint: breakpoint,
        width,
      });
    };

    // Set initial state on mount
    updateState();

    // Create media query listeners for efficient breakpoint detection
    const mobileMediaQuery = window.matchMedia(`(max-width: ${BREAKPOINT_VALUES.mobile - 1}px)`);
    const tabletMediaQuery = window.matchMedia(
      `(min-width: ${BREAKPOINT_VALUES.mobile}px) and (max-width: ${BREAKPOINT_VALUES.tablet - 1}px)`
    );

    // Listen for breakpoint changes
    const handleChange = () => {
      updateState();
    };

    // Add event listeners (modern API)
    mobileMediaQuery.addEventListener('change', handleChange);
    tabletMediaQuery.addEventListener('change', handleChange);

    // Also listen to resize for width updates
    window.addEventListener('resize', updateState);

    // Cleanup
    return () => {
      mobileMediaQuery.removeEventListener('change', handleChange);
      tabletMediaQuery.removeEventListener('change', handleChange);
      window.removeEventListener('resize', updateState);
    };
  }, []);

  return state;
}

/**
 * Legacy compatibility export
 * @deprecated Use useResponsive() instead
 */
export function useIsMobile(): boolean {
  const { isMobile } = useResponsive();
  return isMobile;
}
