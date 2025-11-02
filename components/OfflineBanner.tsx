/**
 * OfflineBanner Component
 * Displays connection status and sync information at the top of the page
 */

'use client';

import { useOffline } from '@/hooks/use-offline';
import { useSyncStatus } from '@/hooks/use-sync-status';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { syncManager } from '@/lib/sync/sync-manager';
import { useState } from 'react';

export function OfflineBanner() {
  const isOffline = useOffline();
  const { pendingCount, isSyncing } = useSyncStatus();
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  // Don't show banner if online and no pending expenses
  if (!isOffline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      await syncManager.syncAll();
    } finally {
      setIsManualSyncing(false);
    }
  };

  return (
    <div
      className={`
        fixed top-0 left-0 right-0 z-50
        px-4 py-2
        flex items-center justify-center gap-2
        text-sm font-medium
        transition-colors duration-300
        ${isOffline 
          ? 'bg-amber-500/90 text-white' 
          : isSyncing
          ? 'bg-blue-500/90 text-white'
          : 'bg-green-500/90 text-white'
        }
      `}
    >
      {/* Status Icon */}
      {isOffline ? (
        <CloudOff className="h-4 w-4" />
      ) : isSyncing ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : pendingCount > 0 ? (
        <AlertCircle className="h-4 w-4" />
      ) : (
        <CheckCircle2 className="h-4 w-4" />
      )}

      {/* Status Message */}
      <span>
        {isOffline ? (
          <>You're offline. Changes will sync when connection is restored.</>
        ) : isSyncing ? (
          <>Syncing {pendingCount} expense{pendingCount !== 1 ? 's' : ''}...</>
        ) : pendingCount > 0 ? (
          <>
            {pendingCount} expense{pendingCount !== 1 ? 's' : ''} waiting to sync
          </>
        ) : (
          <>All changes synced!</>
        )}
      </span>

      {/* Manual Sync Button (only show when online with pending) */}
      {!isOffline && pendingCount > 0 && !isSyncing && (
        <button
          onClick={handleManualSync}
          disabled={isManualSyncing}
          className="
            ml-2 px-2 py-0.5 
            bg-white/20 hover:bg-white/30
            rounded text-xs font-medium
            transition-colors duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {isManualSyncing ? 'Syncing...' : 'Sync Now'}
        </button>
      )}
    </div>
  );
}
