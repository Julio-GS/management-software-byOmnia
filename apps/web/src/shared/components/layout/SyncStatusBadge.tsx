'use client';

// TODO: Sync functionality removed during Electron cleanup
// This component is no longer applicable in web-only mode (no offline sync)
// Consider removing from layouts or reimplementing with server-side status if needed

import { Badge } from '@/shared/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { Cloud, CloudOff, Loader2, WifiOff } from 'lucide-react';

// Stub component - sync not available in web mode
export function SyncStatusBadge() {
  // Always return null in web mode (no offline sync)
  return null;
}
