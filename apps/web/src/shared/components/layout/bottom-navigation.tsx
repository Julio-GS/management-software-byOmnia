/**
 * Bottom Navigation Component
 * Reference: MOBILE_ADAPTATION_SDD.md - Section "Bottom Navigation"
 * Reference: MOBILE_DESIGN_SYSTEM.md - Section "Bottom Navigation Design"
 * 
 * Mobile-optimized bottom navigation bar with:
 * - 5 main navigation items (Dashboard, POS, Inventory, Pricing, Reports)
 * - Badge support for notifications
 * - Active state indicators
 * - Touch-optimized targets (48px)
 * - Haptic feedback (when available)
 * - iOS safe area handling
 * 
 * @example
 * ```tsx
 * <BottomNavigation />
 * ```
 */

'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BottomNavigationProps {
  className?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  href: string;
  badge?: number;
}

const navigationItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
  },
  {
    id: 'pos',
    label: 'POS',
    icon: ShoppingCart,
    href: '/pos',
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Package,
    href: '/inventory',
  },
  {
    id: 'pricing',
    label: 'Pricing',
    icon: DollarSign,
    href: '/pricing',
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    href: '/pricing/reports',
  },
];

export function BottomNavigation({ className }: BottomNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleNavigation = (href: string) => {
    // Trigger haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    router.push(href);
  };

  const isActive = (href: string) => {
    // Match exact path or child paths
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  return (
    <nav
      className={cn(
        // Container
        'fixed bottom-0 left-0 right-0 z-50',
        'flex items-center justify-around',
        'h-14 bg-card border-t border-border shadow-lg',
        // Safe area handling for iOS home indicator
        'pb-[calc(0.5rem+env(safe-area-inset-bottom))]',
        className
      )}
      aria-label="Main navigation"
      role="navigation"
    >
      {navigationItems.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleNavigation(item.href)}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            className={cn(
              // Layout
              'relative flex flex-col items-center justify-center',
              'w-12 h-12 gap-0.5',
              // Touch feedback
              'transition-all duration-150',
              'active:scale-95 active:bg-secondary',
              // Focus styles
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-ring focus-visible:ring-offset-2',
              // Rounded for better touch feedback
              'rounded-lg'
            )}
          >
            {/* Icon */}
            <Icon
              className={cn(
                'w-5 h-5 transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
              aria-hidden="true"
            />

            {/* Label */}
            <span
              className={cn(
                'text-[10px] font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {item.label}
            </span>

            {/* Active Indicator Dot */}
            {active && (
              <span
                className="w-1 h-1 rounded-full bg-primary"
                aria-hidden="true"
              />
            )}

            {/* Badge for notifications */}
            {item.badge && item.badge > 0 && (
              <span
                className={cn(
                  'absolute top-0 right-0',
                  'flex items-center justify-center',
                  'min-w-4 min-h-4 px-1',
                  'text-[10px] font-semibold',
                  'text-white bg-destructive',
                  'rounded-full',
                  'ring-2 ring-card'
                )}
                aria-label={`${item.badge} notifications`}
              >
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
