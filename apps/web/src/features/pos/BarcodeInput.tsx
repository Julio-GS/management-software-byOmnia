'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';
import { isElectron, getElectronAPISafe } from '@/lib/electron';
import { Scan, Loader2 } from 'lucide-react';

interface BarcodeInputProps {
  onProductFound: (product: any) => void;
  onError?: (error: string) => void;
  autoFocus?: boolean;
}

// Audio feedback helpers
const playBeep = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 1000;
  gainNode.gain.value = 0.3;
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.1);
};

const playErrorBeep = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 400;
  gainNode.gain.value = 0.3;
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.2);
};

export function BarcodeInput({ onProductFound, onError, autoFocus = true }: BarcodeInputProps) {
  const [barcode, setBarcode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep input focused for scanner
  useEffect(() => {
    if (!autoFocus) return;

    const interval = setInterval(() => {
      if (document.activeElement !== inputRef.current && inputRef.current) {
        inputRef.current.focus();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [autoFocus]);

  const searchProduct = async (scannedBarcode: string) => {
    if (!isElectron()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Barcode scanner only available in desktop app',
      });
      return;
    }

    setIsSearching(true);
    setBarcode(scannedBarcode); // Show what was scanned

    try {
      const api = getElectronAPISafe();
      if (!api?.product) {
        throw new Error('Product API not available');
      }

      const result = await api.product.searchByBarcode({ barcode: scannedBarcode });
      
      if (result.success && result.data) {
        playBeep();
        onProductFound(result.data);
        setBarcode(''); // Clear for next scan
      } else {
        playErrorBeep();
        const errorMsg = result.error || 'Product not found';
        toast({
          variant: 'destructive',
          title: 'Product Not Found',
          description: `Barcode: ${scannedBarcode}`,
        });
        onError?.(errorMsg);
        
        // Keep barcode visible for a moment, then clear
        setTimeout(() => setBarcode(''), 2000);
      }
    } catch (error) {
      playErrorBeep();
      const errorMsg = error instanceof Error ? error.message : 'Failed to search product';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMsg,
      });
      onError?.(errorMsg);
      
      setTimeout(() => setBarcode(''), 2000);
    } finally {
      setIsSearching(false);
    }
  };

  // Use barcode scanner hook for keyboard wedge input
  useBarcodeScanner(searchProduct, { minLength: 3, maxDelay: 100 });

  return (
    <div className="space-y-2">
      <Label htmlFor="barcode-input" className="flex items-center gap-2">
        <Scan className="h-4 w-4" />
        Scan Barcode
      </Label>
      <div className="relative">
        <Input
          id="barcode-input"
          ref={inputRef}
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Scan barcode or type manually..."
          autoFocus={autoFocus}
          disabled={isSearching}
          className="pr-10"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && barcode.trim()) {
              searchProduct(barcode.trim());
            }
          }}
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Scanner ready. Point scanner at barcode or type manually and press Enter.
      </p>
    </div>
  );
}
