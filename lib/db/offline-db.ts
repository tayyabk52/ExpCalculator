/**
 * Offline Database Implementation using Dexie
 * Provides IndexedDB wrapper with helper methods for offline caching
 */

import Dexie, { type Table } from 'dexie';
import {
  CachedGroup,
  OfflineExpense,
  CachedExpense,
  CachedGroupHistory,
  DB_CONFIG,
  CACHE_CONFIG,
} from './schema';

/**
 * Dexie Database Class
 * Defines tables and provides type-safe access to IndexedDB
 */
class OfflineDatabase extends Dexie {
  cachedGroups!: Table<CachedGroup, string>;
  offlineExpenses!: Table<OfflineExpense, string>;
  cachedExpenses!: Table<CachedExpense, string>;
  cachedGroupHistory!: Table<CachedGroupHistory, string>;

  constructor() {
    super(DB_CONFIG.name);

    // Define schema versions
    this.version(1).stores({
      cachedGroups: 'code, lastAccessed',
      offlineExpenses: 'id, groupCode, syncStatus, createdAt',
      cachedExpenses: 'id, groupCode, cachedAt',
    });

    // Version 2: Add cachedGroupHistory
    this.version(2).stores({
      cachedGroups: 'code, lastAccessed',
      offlineExpenses: 'id, groupCode, syncStatus, createdAt',
      cachedExpenses: 'id, groupCode, cachedAt',
      cachedGroupHistory: 'groupCode, cachedAt',
    });
  }

  // ==================== CACHED GROUPS ====================

  /**
   * Cache a group for offline access
   * Updates lastAccessed timestamp if already cached
   */
  async cacheGroup(group: Omit<CachedGroup, 'lastAccessed' | 'lastSynced'>) {
    const now = Date.now();
    
    await this.cachedGroups.put({
      ...group,
      lastAccessed: now,
      lastSynced: now,
    });

    // Clean up old cached groups if over limit
    await this.cleanOldCachedGroups();
  }

  /**
   * Get a cached group by code
   * Updates lastAccessed timestamp when retrieved
   */
  async getCachedGroup(code: string): Promise<CachedGroup | null> {
    const group = await this.cachedGroups.get(code);
    
    if (group) {
      // Update last accessed timestamp
      await this.cachedGroups.update(code, {
        lastAccessed: Date.now(),
      });
    }

    return group || null;
  }

  /**
   * Get all cached groups sorted by last accessed
   */
  async getAllCachedGroups(): Promise<CachedGroup[]> {
    return await this.cachedGroups
      .orderBy('lastAccessed')
      .reverse()
      .toArray();
  }

  /**
   * Remove old cached groups over the limit
   * Keeps the most recently accessed groups
   */
  async cleanOldCachedGroups() {
    const allGroups = await this.cachedGroups
      .orderBy('lastAccessed')
      .reverse()
      .toArray();

    if (allGroups.length > CACHE_CONFIG.maxCachedGroups) {
      // Delete oldest groups over the limit
      const groupsToDelete = allGroups.slice(CACHE_CONFIG.maxCachedGroups);
      const codesToDelete = groupsToDelete.map(g => g.code);
      
      await this.cachedGroups.bulkDelete(codesToDelete);

      // Also clean up associated expenses
      await this.cachedExpenses
        .where('groupCode')
        .anyOf(codesToDelete)
        .delete();
    }
  }

  /**
   * Check if a group is cached
   */
  async isGroupCached(code: string): Promise<boolean> {
    const count = await this.cachedGroups.where('code').equals(code).count();
    return count > 0;
  }

  // ==================== OFFLINE EXPENSES ====================

  /**
   * Add an expense created while offline
   * Returns the generated expense ID
   */
  async addOfflineExpense(
    groupCode: string,
    expenseData: any
  ): Promise<string> {
    const id = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await this.offlineExpenses.add({
      id,
      groupCode,
      expenseData,
      createdAt: Date.now(),
      syncStatus: 'pending',
      syncAttempts: 0,
    });

    return id;
  }

  /**
   * Get all pending offline expenses for a group
   */
  async getPendingExpenses(groupCode: string): Promise<OfflineExpense[]> {
    return await this.offlineExpenses
      .where('groupCode')
      .equals(groupCode)
      .and(expense => expense.syncStatus === 'pending')
      .toArray();
  }

  /**
   * Get all pending offline expenses across all groups
   */
  async getAllPendingExpenses(): Promise<OfflineExpense[]> {
    return await this.offlineExpenses
      .where('syncStatus')
      .equals('pending')
      .toArray();
  }

  /**
   * Get count of pending sync expenses
   */
  async getPendingSyncCount(): Promise<number> {
    return await this.offlineExpenses
      .where('syncStatus')
      .equals('pending')
      .count();
  }

  /**
   * Update offline expense sync status
   */
  async updateExpenseSyncStatus(
    id: string,
    status: OfflineExpense['syncStatus'],
    error?: string
  ) {
    await this.offlineExpenses.update(id, {
      syncStatus: status,
      lastSyncAttempt: Date.now(),
      syncAttempts: (await this.offlineExpenses.get(id))?.syncAttempts || 0 + 1,
      ...(error && { syncError: error }),
    });
  }

  /**
   * Mark offline expense as synced and remove it
   */
  async markExpenseSynced(id: string) {
    await this.offlineExpenses.delete(id);
  }

  /**
   * Get failed sync expenses (exceeded retry limit)
   */
  async getFailedExpenses(): Promise<OfflineExpense[]> {
    return await this.offlineExpenses
      .where('syncStatus')
      .equals('failed')
      .toArray();
  }

  // ==================== CACHED EXPENSES ====================

  /**
   * Cache expense history for offline viewing
   */
  async cacheExpenses(groupCode: string, expenses: any[]) {
    const now = Date.now();

    const cachedExpenses: CachedExpense[] = expenses.map(expense => ({
      id: expense.id,
      groupCode,
      expenseData: expense,
      cachedAt: now,
    }));

    await this.cachedExpenses.bulkPut(cachedExpenses);

    // Clean up old cached expenses over limit
    await this.cleanOldCachedExpenses(groupCode);
  }

  /**
   * Get cached expenses for a group
   */
  async getCachedExpenses(groupCode: string): Promise<any[]> {
    const cached = await this.cachedExpenses
      .where('groupCode')
      .equals(groupCode)
      .toArray();

    return cached.map(c => c.expenseData);
  }

  /**
   * Remove old cached expenses over the limit for a group
   */
  async cleanOldCachedExpenses(groupCode: string) {
    const expenses = await this.cachedExpenses
      .where('groupCode')
      .equals(groupCode)
      .sortBy('cachedAt');

    if (expenses.length > CACHE_CONFIG.maxCachedExpenses) {
      const expensesToDelete = expenses.slice(
        0,
        expenses.length - CACHE_CONFIG.maxCachedExpenses
      );
      const idsToDelete = expensesToDelete.map(e => e.id);
      
      await this.cachedExpenses.bulkDelete(idsToDelete);
    }
  }

  // ==================== CACHED GROUP HISTORY ====================

  /**
   * Cache complete group history for offline viewing
   */
  async cacheGroupHistory(
    groupCode: string,
    expenses: any[],
    settlements: any[],
    netSettlements: any[],
    memberBalances: any[]
  ) {
    await this.cachedGroupHistory.put({
      groupCode,
      expenses,
      settlements,
      netSettlements,
      memberBalances,
      cachedAt: Date.now(),
    });

    console.log(`✅ Cached history for group: ${groupCode}`);
  }

  /**
   * Get cached group history
   */
  async getCachedGroupHistory(groupCode: string): Promise<CachedGroupHistory | null> {
    const history = await this.cachedGroupHistory.get(groupCode);
    return history || null;
  }

  /**
   * Check if group history is cached
   */
  async isGroupHistoryCached(groupCode: string): Promise<boolean> {
    const count = await this.cachedGroupHistory.where('groupCode').equals(groupCode).count();
    return count > 0;
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Clear all offline data
   * Useful for testing or clearing cache
   */
  async clearAllData() {
    await Promise.all([
      this.cachedGroups.clear(),
      this.offlineExpenses.clear(),
      this.cachedExpenses.clear(),
      this.cachedGroupHistory.clear(),
    ]);
  }

  /**
   * Get database statistics
   */
  async getStats() {
    const [cachedGroupsCount, pendingCount, cachedExpensesCount, cachedHistoryCount] = await Promise.all([
      this.cachedGroups.count(),
      this.getPendingSyncCount(),
      this.cachedExpenses.count(),
      this.cachedGroupHistory.count(),
    ]);

    return {
      cachedGroups: cachedGroupsCount,
      pendingExpenses: pendingCount,
      cachedExpenses: cachedExpensesCount,
      cachedHistory: cachedHistoryCount,
    };
  }
}

/**
 * Export singleton database instance
 * Use this throughout the app for database access
 */
export const db = new OfflineDatabase();

/**
 * Initialize database on app start
 * Call this in root layout or app entry point
 */
export async function initDatabase() {
  try {
    await db.open();
    console.log('✅ Offline database initialized');
  } catch (error) {
    console.error('❌ Failed to initialize offline database:', error);
  }
}
