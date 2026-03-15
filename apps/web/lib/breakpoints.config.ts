/**
 * Breakpoint System Configuration
 * Reference: MOBILE_ADAPTATION_SDD.md - Section "Breakpoint System"
 * 
 * Defines the responsive breakpoints used throughout the application.
 * Aligned with Tailwind CSS breakpoints for consistency.
 */

export const BREAKPOINTS = {
  mobile: { min: 0, max: 639 },      // Phones: < 640px
  tablet: { min: 640, max: 1023 },   // Tablets: 640-1023px
  desktop: { min: 1024, max: Infinity }, // Desktop: >= 1024px
} as const;

/**
 * Breakpoint pixel values for media queries
 * Use these with window.matchMedia or CSS media queries
 */
export const BREAKPOINT_VALUES = {
  mobile: 640,   // sm breakpoint in Tailwind
  tablet: 1024,  // lg breakpoint in Tailwind
} as const;

/**
 * Type definitions for breakpoints
 */
export type Breakpoint = keyof typeof BREAKPOINTS;
export type BreakpointValue = typeof BREAKPOINT_VALUES[keyof typeof BREAKPOINT_VALUES];

/**
 * Helper function to check if a width falls within a breakpoint range
 */
export function isWithinBreakpoint(width: number, breakpoint: Breakpoint): boolean {
  const range = BREAKPOINTS[breakpoint];
  return width >= range.min && width <= range.max;
}

/**
 * Get the current breakpoint based on window width
 */
export function getCurrentBreakpoint(width: number): Breakpoint {
  if (width < BREAKPOINT_VALUES.mobile) return 'mobile';
  if (width < BREAKPOINT_VALUES.tablet) return 'tablet';
  return 'desktop';
}
