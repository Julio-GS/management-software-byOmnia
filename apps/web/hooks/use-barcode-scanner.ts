'use client';

import { useEffect, useCallback, useRef } from 'react';

/**
 * Hook to detect barcode scanner input (keyboard wedge mode)
 * Barcode scanners typically send characters rapidly and end with Enter
 * 
 * @param onScan - Callback when a barcode is detected
 * @param options - Configuration options
 */
export function useBarcodeScanner(
  onScan: (barcode: string) => void,
  options: {
    minLength?: number;
    maxDelay?: number; // Max time between chars in ms
    preventDefault?: boolean;
  } = {}
) {
  const {
    minLength = 3, // Minimum barcode length
    maxDelay = 100, // Max 100ms between characters
    preventDefault = true,
  } = options;

  const bufferRef = useRef('');
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleKeyPress = useCallback(
    (e: KeyboardEvent) => {
      // Clear timeout on each keypress
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Handle Enter key - end of barcode
      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minLength) {
          if (preventDefault) {
            e.preventDefault();
          }
          onScan(bufferRef.current);
          bufferRef.current = '';
        }
        return;
      }

      // Add character to buffer if it's a single printable character
      if (e.key.length === 1) {
        bufferRef.current += e.key;

        // Set timeout to clear buffer if scanning stops
        timeoutRef.current = setTimeout(() => {
          bufferRef.current = '';
        }, maxDelay);
      }
    },
    [onScan, minLength, maxDelay, preventDefault]
  );

  useEffect(() => {
    window.addEventListener('keypress', handleKeyPress);

    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [handleKeyPress]);

  // Expose manual clear function
  const clearBuffer = useCallback(() => {
    bufferRef.current = '';
  }, []);

  return { clearBuffer };
}
