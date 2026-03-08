'use client';

import { useSyncStatus } from '@/hooks/use-sync-status';
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

export function SyncQueueIndicator() {
  const { queuedItems, forceSync, clearQueue, isAvailable } = useSyncStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  if (!isAvailable || queuedItems === 0) {
    return null;
  }

  const handleForceSync = async () => {
    setIsSyncing(true);
    try {
      await forceSync();
      toast({
        title: 'Sync Complete',
        description: 'All pending changes have been synchronized',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Sync Failed',
        description: error instanceof Error ? error.message : 'Failed to sync',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearQueue = async () => {
    setIsClearing(true);
    try {
      await clearQueue();
      toast({
        title: 'Queue Cleared',
        description: 'Synced items have been removed from queue',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to Clear Queue',
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <CloudUpload className="mr-2 h-4 w-4" />
          {queuedItems} Pending
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Sync Queue</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleForceSync} disabled={isSyncing}>
          {isSyncing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Sync Now
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleClearQueue} disabled={isClearing}>
          {isClearing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          Clear Synced Items
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
