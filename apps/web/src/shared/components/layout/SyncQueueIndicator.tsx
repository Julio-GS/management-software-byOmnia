'use client';

// TODO: Sync functionality removed during Electron cleanup
// This component is no longer applicable in web-only mode (no offline sync)
// Consider removing from layouts or reimplementing with server-side queue if needed

import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { CloudUpload, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { useState } from 'react';

// Stub component - sync not available in web mode
export function SyncQueueIndicator() {
  // Always return null in web mode (no offline sync)
  return null;
}
