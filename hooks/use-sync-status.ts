/**
 * useSyncStatus Hook
 * Tracks pending sync count and sync status in real-time
 */

'use client';

import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/offline-db';
import { syncManager } from '@/lib/sync/sync-manager';

/**
 * Sync status information
 */
export interface SyncStatus {
  pendingCount: number;
  isSyncing: boolean;
  lastSync: Date | null;
}

/**
 * Hook to track pending sync count and status
 * Uses Dexie's live query for reactive updates
 */
export function useSyncStatus(): SyncStatus {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Live query for pending count (auto-updates when data changes)
  const pendingCount = useLiveQuery(
    async () => await db.getPendingSyncCount(),
    [],
    0 // Default value while loading
  );

  useEffect(() => {
    // Poll sync status
    const checkSyncStatus = () => {
      setIsSyncing(syncManager.isSyncInProgress);
    };

    // Check immediately
    checkSyncStatus();

    // Poll every second while syncing
    const interval = setInterval(checkSyncStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  // Track last sync time when pending count changes
  useEffect(() => {
    if (pendingCount === 0 && !isSyncing) {
      setLastSync(new Date());
    }
  }, [pendingCount, isSyncing]);

  return {
    pendingCount: pendingCount ?? 0,
    isSyncing,
    lastSync,
  };
}

/**
 * Hook to track if a specific group has pending expenses
 */
export function useGroupSyncStatus(groupCode: string): {
  hasPending: boolean;
  pendingCount: number;
} {
  const hasPending = useLiveQuery(
    async () => {
      const pending = await db.getPendingExpenses(groupCode);
      return pending.length > 0;
    },
    [groupCode],
    false
  );

  const pendingCount = useLiveQuery(
    async () => {
      const pending = await db.getPendingExpenses(groupCode);
      return pending.length;
    },
    [groupCode],
    0
  );

  return {
    hasPending: hasPending ?? false,
    pendingCount: pendingCount ?? 0,
  };
}
