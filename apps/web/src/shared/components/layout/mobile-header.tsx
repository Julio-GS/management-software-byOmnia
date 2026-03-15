/**
 * Mobile Header Component
 * Reference: MOBILE_ADAPTATION_SDD.md - Section "Mobile Header"
 * Reference: MOBILE_DESIGN_SYSTEM.md - Section "Mobile Header Design"
 * 
 * Simplified header for mobile devices with:
 * - Back button (conditional - not shown on dashboard)
 * - Page title (center-aligned)
 * - Sync status indicator
 * - Menu button
 * - Compact height (56px)
 * - iOS safe area handling
 * 
 * @example
 * ```tsx
 * <MobileHeader title="Punto de Venta" onMenuOpen={() => setMenuOpen(true)} />
 * ```
 */

'use client';

import { useRouter, usePathname } from 'next/navigation';
import { ChevronLeft, RefreshCw, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MobileHeaderProps {
  /** Page title to display */
  title?: string;
  /** Whether sync is in progress */
  isSyncing?: boolean;
  /** Callback when sync button is clicked */
  onSync?: () => void;
  /** Callback when menu button is clicked */
  onMenuOpen?: () => void;
  /** Custom className */
  className?: string;
}

export function MobileHeader({
  title = 'Dashboard',
  isSyncing = false,
  onSync,
  onMenuOpen,
  className,
}: MobileHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Check if we're on the dashboard (home page)
  const isHome = pathname === '/dashboard' || pathname === '/';

  const handleBack = () => {
    // Trigger haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    router.back();
  };

  const handleSync = () => {
    // Trigger haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    onSync?.();
  };

  const handleMenuOpen = () => {
    // Trigger haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    onMenuOpen?.();
  };

  return (
    <header
      className={cn(
        // Container
        'sticky top-0 z-40',
        'flex items-center justify-between',
        'h-14 px-4 gap-3',
        'bg-card border-b border-border shadow-sm',
        // Safe area handling for iOS notch
        'pt-[env(safe-area-inset-top)]',
        className
      )}
    >
      {/* Back Button */}
      <button
        type="button"
        onClick={handleBack}
        aria-label="Go back"
        className={cn(
          'flex items-center justify-center',
          'w-10 h-10',
          'rounded-md',
          'transition-colors',
          'hover:bg-secondary active:bg-muted',
          'focus-visible:outline-none focus-visible:ring-2',
          'focus-visible:ring-ring focus-visible:ring-offset-2',
          // Hide on home page
          isHome && 'invisible'
        )}
      >
        <ChevronLeft className="w-6 h-6" aria-hidden="true" />
      </button>

      {/* Title */}
      <h1
        className={cn(
          'flex-1 text-lg font-semibold truncate',
          // Center align when back button is visible
          !isHome ? 'text-center' : 'text-left'
        )}
      >
        {title}
      </h1>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Sync Button */}
        {onSync && (
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            aria-label={isSyncing ? 'Syncing...' : 'Sync data'}
            className={cn(
              'flex items-center justify-center',
              'w-10 h-10',
              'rounded-md',
              'transition-colors',
              'hover:bg-secondary active:bg-muted',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <RefreshCw
              className={cn('w-5 h-5', isSyncing && 'animate-spin')}
              aria-hidden="true"
            />
          </button>
        )}

        {/* Menu Button */}
        {onMenuOpen && (
          <button
            type="button"
            onClick={handleMenuOpen}
            aria-label="Open menu"
            className={cn(
              'flex items-center justify-center',
              'w-10 h-10',
              'rounded-md',
              'transition-colors',
              'hover:bg-secondary active:bg-muted',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-ring focus-visible:ring-offset-2'
            )}
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>
    </header>
  );
}
