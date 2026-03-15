/**
 * Touch Gestures Hook
 * Reference: MOBILE_ADAPTATION_SDD.md - Section "Touch Optimization"
 * 
 * Provides swipe and long-press gesture detection for touch interfaces.
 * 
 * @example
 * ```tsx
 * const ref = useTouchGestures({
 *   onSwipeLeft: () => console.log('Next'),
 *   onSwipeRight: () => console.log('Previous'),
 *   onLongPress: () => console.log('Context menu'),
 *   threshold: 50,
 *   longPressDelay: 500,
 * });
 * 
 * <div ref={ref}>Swipeable content</div>
 * ```
 */

import { useRef, useEffect, RefObject } from 'react';

export interface TouchGestureOptions {
  /** Callback fired when swipe left is detected */
  onSwipeLeft?: () => void;
  /** Callback fired when swipe right is detected */
  onSwipeRight?: () => void;
  /** Callback fired when swipe up is detected */
  onSwipeUp?: () => void;
  /** Callback fired when swipe down is detected */
  onSwipeDown?: () => void;
  /** Callback fired when long press is detected */
  onLongPress?: () => void;
  /** Minimum distance in pixels to register as swipe (default: 50) */
  threshold?: number;
  /** Time in ms before long press fires (default: 500) */
  longPressDelay?: number;
  /** Whether to prevent default touch behavior (default: false) */
  preventDefault?: boolean;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  longPressTimer?: NodeJS.Timeout;
}

/**
 * Hook to detect touch gestures (swipe, long press)
 * 
 * @param options - Gesture configuration and callbacks
 * @returns RefObject to attach to the target element
 */
export function useTouchGestures<T extends HTMLElement = HTMLDivElement>(
  options: TouchGestureOptions
): RefObject<T> {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onLongPress,
    threshold = 50,
    longPressDelay = 500,
    preventDefault = false,
  } = options;

  const elementRef = useRef<T>(null);
  const touchStateRef = useRef<TouchState | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      
      touchStateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
      };

      // Start long press timer
      if (onLongPress) {
        const timer = setTimeout(() => {
          if (touchStateRef.current) {
            onLongPress();
            // Trigger haptic feedback
            if ('vibrate' in navigator) {
              navigator.vibrate(50);
            }
          }
        }, longPressDelay);

        touchStateRef.current.longPressTimer = timer;
      }

      if (preventDefault) {
        event.preventDefault();
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      // Cancel long press on move
      if (touchStateRef.current?.longPressTimer) {
        clearTimeout(touchStateRef.current.longPressTimer);
        touchStateRef.current.longPressTimer = undefined;
      }

      if (preventDefault) {
        event.preventDefault();
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!touchStateRef.current) return;

      // Clear long press timer
      if (touchStateRef.current.longPressTimer) {
        clearTimeout(touchStateRef.current.longPressTimer);
      }

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStateRef.current.startX;
      const deltaY = touch.clientY - touchStateRef.current.startY;
      const deltaTime = Date.now() - touchStateRef.current.startTime;

      // Only consider it a swipe if it's fast (< 300ms)
      if (deltaTime < 300) {
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);

        // Horizontal swipe
        if (absDeltaX > threshold && absDeltaX > absDeltaY) {
          if (deltaX > 0 && onSwipeRight) {
            onSwipeRight();
            // Trigger haptic feedback
            if ('vibrate' in navigator) {
              navigator.vibrate(10);
            }
          } else if (deltaX < 0 && onSwipeLeft) {
            onSwipeLeft();
            // Trigger haptic feedback
            if ('vibrate' in navigator) {
              navigator.vibrate(10);
            }
          }
        }
        // Vertical swipe
        else if (absDeltaY > threshold && absDeltaY > absDeltaX) {
          if (deltaY > 0 && onSwipeDown) {
            onSwipeDown();
            // Trigger haptic feedback
            if ('vibrate' in navigator) {
              navigator.vibrate(10);
            }
          } else if (deltaY < 0 && onSwipeUp) {
            onSwipeUp();
            // Trigger haptic feedback
            if ('vibrate' in navigator) {
              navigator.vibrate(10);
            }
          }
        }
      }

      touchStateRef.current = null;

      if (preventDefault) {
        event.preventDefault();
      }
    };

    const handleTouchCancel = () => {
      if (touchStateRef.current?.longPressTimer) {
        clearTimeout(touchStateRef.current.longPressTimer);
      }
      touchStateRef.current = null;
    };

    // Add event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefault });
    element.addEventListener('touchend', handleTouchEnd, { passive: !preventDefault });
    element.addEventListener('touchcancel', handleTouchCancel);

    // Cleanup
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);

      if (touchStateRef.current?.longPressTimer) {
        clearTimeout(touchStateRef.current.longPressTimer);
      }
    };
  }, [
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onLongPress,
    threshold,
    longPressDelay,
    preventDefault,
  ]);

  return elementRef;
}
