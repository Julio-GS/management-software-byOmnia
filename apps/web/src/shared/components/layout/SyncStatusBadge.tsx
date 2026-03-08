'use client';

import { useSyncStatus } from '@/hooks/use-sync-status';
import { Badge } from '@/shared/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/components/ui/tooltip';
import { Cloud, CloudOff, Loader2, WifiOff } from 'lucide-react';

export function SyncStatusBadge() {
  const { status, queuedItems, connected, isAvailable } = useSyncStatus();

  if (!isAvailable) {
    return null; // Don't show in web mode
  }

  const statusConfig = {
    online: {
      icon: <Cloud className="h-3 w-3" />,
      text: 'Online',
      color: 'bg-green-500',
      variant: 'default' as const,
    },
    offline: {
      icon: <CloudOff className="h-3 w-3" />,
      text: 'Offline',
      color: 'bg-gray-500',
      variant: 'secondary' as const,
    },
    syncing: {
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      text: 'Syncing...',
      color: 'bg-blue-500',
      variant: 'default' as const,
    },
    error: {
      icon: <WifiOff className="h-3 w-3" />,
      text: 'Error',
      color: 'bg-red-500',
      variant: 'destructive' as const,
    },
  };

  const config = statusConfig[status];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${config.color} ${status !== 'offline' ? 'animate-pulse' : ''}`} />
            <span className="text-sm font-medium">{config.text}</span>
            {queuedItems > 0 && (
              <Badge variant="secondary" className="ml-1">
                {queuedItems}
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {connected ? 'Connected to server' : 'Not connected'}
            {queuedItems > 0 && ` • ${queuedItems} items pending sync`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
