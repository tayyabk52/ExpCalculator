/**
 * Sync Manager
 * Handles syncing offline expenses to Supabase when connection is restored
 */

import { db } from '@/lib/db/offline-db';
import { CACHE_CONFIG } from '@/lib/db/schema';
import type { OfflineExpense } from '@/lib/db/schema';

/**
 * Sync result for individual expense
 */
export interface SyncResult {
  id: string;
  success: boolean;
  error?: string;
}

/**
 * Batch sync result
 */
export interface BatchSyncResult {
  total: number;
  synced: number;
  failed: number;
  results: SyncResult[];
}

class SyncManager {
  private isSyncing = false;
  private syncInProgress: Set<string> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      // Listen for online events
      window.addEventListener('online', () => this.onOnline());
      
      // Sync on visibility change (when user returns to tab)
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && navigator.onLine) {
          this.syncAll();
        }
      });
    }
  }

  /**
   * Handler for when connection is restored
   */
  private async onOnline() {
    console.log('🌐 Connection restored, syncing offline expenses...');
    await this.syncAll();
  }

  /**
   * Add an expense while offline
   * Saves to IndexedDB for later sync
   */
  async addExpenseOffline(groupCode: string, expenseData: any): Promise<string> {
    try {
      const id = await db.addOfflineExpense(groupCode, expenseData);
      console.log(`💾 Expense saved offline: ${id}`);
      return id;
    } catch (error) {
      console.error('❌ Failed to save expense offline:', error);
      throw error;
    }
  }

  /**
   * Sync a single offline expense to Supabase
   */
  async syncExpense(expense: OfflineExpense): Promise<SyncResult> {
    // Prevent duplicate syncing
    if (this.syncInProgress.has(expense.id)) {
      return { id: expense.id, success: false, error: 'Sync already in progress' };
    }

    this.syncInProgress.add(expense.id);

    try {
      // Check if already exceeded retry limit
      if (expense.syncAttempts >= CACHE_CONFIG.syncRetryLimit) {
        await db.updateExpenseSyncStatus(expense.id, 'failed', 'Max retry attempts exceeded');
        this.syncInProgress.delete(expense.id);
        return {
          id: expense.id,
          success: false,
          error: 'Max retry attempts exceeded',
        };
      }

      // Call API to add expense to Supabase
      const response = await fetch(`/api/groups/${expense.groupCode}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expense.expenseData),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || `HTTP ${response.status}`);
      }

      // Success - remove from offline storage
      await db.markExpenseSynced(expense.id);
      console.log(`✅ Synced expense: ${expense.id}`);

      this.syncInProgress.delete(expense.id);
      return { id: expense.id, success: true };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to sync expense ${expense.id}:`, errorMessage);

      // Update sync status
      await db.updateExpenseSyncStatus(
        expense.id,
        expense.syncAttempts + 1 >= CACHE_CONFIG.syncRetryLimit ? 'failed' : 'pending',
        errorMessage
      );

      this.syncInProgress.delete(expense.id);
      return { id: expense.id, success: false, error: errorMessage };
    }
  }

  /**
   * Sync all pending offline expenses
   * Returns results for each expense
   */
  async syncAll(): Promise<BatchSyncResult> {
    // Prevent concurrent sync operations
    if (this.isSyncing) {
      console.log('⏳ Sync already in progress, skipping...');
      return {
        total: 0,
        synced: 0,
        failed: 0,
        results: [],
      };
    }

    // Check if online
    if (!navigator.onLine) {
      console.log('📴 Offline, skipping sync');
      return {
        total: 0,
        synced: 0,
        failed: 0,
        results: [],
      };
    }

    this.isSyncing = true;

    try {
      const pendingExpenses = await db.getAllPendingExpenses();
      
      if (pendingExpenses.length === 0) {
        console.log('✨ No pending expenses to sync');
        return {
          total: 0,
          synced: 0,
          failed: 0,
          results: [],
        };
      }

      console.log(`🔄 Syncing ${pendingExpenses.length} pending expenses...`);

      // Sync each expense with delay to avoid overwhelming server
      const results: SyncResult[] = [];
      
      for (const expense of pendingExpenses) {
        const result = await this.syncExpense(expense);
        results.push(result);
        
        // Small delay between syncs
        await new Promise(resolve => setTimeout(resolve, CACHE_CONFIG.syncRetryDelay));
      }

      const synced = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      console.log(`✅ Sync complete: ${synced} synced, ${failed} failed`);

      return {
        total: pendingExpenses.length,
        synced,
        failed,
        results,
      };

    } catch (error) {
      console.error('❌ Batch sync failed:', error);
      return {
        total: 0,
        synced: 0,
        failed: 0,
        results: [],
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Get pending sync count
   * Useful for showing badge/indicator
   */
  async getPendingCount(): Promise<number> {
    return await db.getPendingSyncCount();
  }

  /**
   * Retry failed expenses
   * Resets failed status to pending for retry
   */
  async retryFailedExpenses(): Promise<void> {
    const failedExpenses = await db.getFailedExpenses();
    
    for (const expense of failedExpenses) {
      await db.updateExpenseSyncStatus(expense.id, 'pending');
    }

    console.log(`🔄 Reset ${failedExpenses.length} failed expenses for retry`);
  }

  /**
   * Check if currently syncing
   */
  get isSyncInProgress(): boolean {
    return this.isSyncing;
  }
}

/**
 * Export singleton sync manager instance
 * Use this throughout the app for sync operations
 */
export const syncManager = new SyncManager();
