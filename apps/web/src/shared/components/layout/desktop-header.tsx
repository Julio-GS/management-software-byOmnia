/**
 * Desktop Header Component
 * Reference: MOBILE_ADAPTATION_SDD.md - Section "Navigation Hierarchy"
 * 
 * Desktop-optimized header bar with:
 * - Breadcrumb navigation (Omnia › Page)
 * - Sync status indicators
 * - Date display
 * - Notification button
 * - Full height (56px)
 * 
 * @example
 * ```tsx
 * <DesktopHeader title="Dashboard" />
 * ```
 */

'use client';

import { Bell, ChevronRight } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { SyncStatusBadge } from '@/shared/components/layout/SyncStatusBadge';
import { SyncQueueIndicator } from '@/shared/components/layout/SyncQueueIndicator';

export interface DesktopHeaderProps {
  /** Page title to display in breadcrumb */
  title?: string;
  /** Custom className */
  className?: string;
}

export function DesktopHeader({ title = 'Dashboard', className }: DesktopHeaderProps) {
  return (
    <header className={`flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-6 ${className || ''}`}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Omnia</span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
        <span className="font-medium text-foreground">{title}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Sync Status */}
        <SyncStatusBadge />
        <SyncQueueIndicator />

        {/* Date Display */}
        <span className="font-mono text-xs text-muted-foreground">
          {new Date().toLocaleDateString('es-AR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </span>

        {/* Notifications Button */}
        <button
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label="Notificaciones"
        >
          <Bell className="h-[18px] w-[18px]" />
          <Badge className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full bg-destructive px-1 text-[10px] text-white">
            8
          </Badge>
        </button>
      </div>
    </header>
  );
}
