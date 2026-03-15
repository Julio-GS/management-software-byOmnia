/**
 * Haptic Feedback Hook
 * Reference: MOBILE_ADAPTATION_SDD.md - Section "Touch Optimization"
 * 
 * Provides haptic feedback (vibration) for touch interactions.
 * Wraps the Vibration API with a simple interface.
 * 
 * @example
 * ```tsx
 * const { trigger, isSupported } = useHapticFeedback();
 * 
 * // Light tap
 * trigger('light');
 * 
 * // Success confirmation
 * trigger('success');
 * 
 * // Error alert
 * trigger('error');
 * ```
 */

import { useEffect, useState } from 'react';

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

interface HapticFeedbackResult {
  /** Trigger a haptic feedback pattern */
  trigger: (pattern: HapticPattern) => void;
  /** Whether haptic feedback is supported on this device */
  isSupported: boolean;
}

/**
 * Pattern definitions for different haptic feedback types
 * Values are in milliseconds for the Vibration API
 */
const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,              // Quick tap
  medium: 20,             // Standard tap
  heavy: 30,              // Strong tap
  success: [10, 50, 10],  // Double tap pattern
  warning: [20, 100, 20], // Double tap with pause
  error: [30, 100, 30, 100, 30], // Triple tap pattern
};

/**
 * Hook to trigger haptic feedback on supported devices
 * 
 * @returns Object with trigger function and support status
 */
export function useHapticFeedback(): HapticFeedbackResult {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if Vibration API is supported
    setIsSupported('vibrate' in navigator);
  }, []);

  const trigger = (pattern: HapticPattern) => {
    if (!isSupported) return;

    try {
      const vibrationPattern = HAPTIC_PATTERNS[pattern];
      navigator.vibrate(vibrationPattern);
    } catch (error) {
      // Silently fail if vibration is blocked or not available
      console.warn('Haptic feedback failed:', error);
    }
  };

  return { trigger, isSupported };
}

/**
 * Utility function to trigger haptic feedback without using the hook
 * Useful for one-off haptic triggers
 */
export function triggerHaptic(pattern: HapticPattern): void {
  if ('vibrate' in navigator) {
    try {
      const vibrationPattern = HAPTIC_PATTERNS[pattern];
      navigator.vibrate(vibrationPattern);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }
}
