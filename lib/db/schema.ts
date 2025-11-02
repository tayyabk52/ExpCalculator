/**
 * IndexedDB Schema Definitions
 * Defines the structure for offline data storage
 */

import type { GroupExpense, GroupMember } from '@/lib/types/group';

/**
 * Cached group data
 * Stores recently accessed groups for offline use
 */
export interface CachedGroup {
  code: string;              // Group code (primary key)
  name: string;              // Group name
  members: GroupMember[];    // Group members array
  lastAccessed: number;      // Timestamp of last access
  lastSynced: number;        // Timestamp of last sync with server
}

/**
 * Offline expense (pending sync)
 * Stores expenses created offline that need to be synced
 */
export interface OfflineExpense {
  id: string;                // Expense ID (primary key)
  groupCode: string;         // Associated group code
  expenseData: any;          // Full expense data object
  createdAt: number;         // Timestamp of creation
  syncStatus: 'pending' | 'synced' | 'failed';  // Sync status
  syncAttempts: number;      // Number of sync attempts
  lastSyncAttempt?: number;  // Timestamp of last sync attempt
  syncError?: string;        // Error message if failed
}

/**
 * Cached expense history
 * Stores expense history for offline viewing
 */
export interface CachedExpense {
  id: string;                // Expense ID (primary key)
  groupCode: string;         // Associated group code
  expenseData: any;          // Full expense data
  cachedAt: number;          // Timestamp when cached
}

/**
 * Database version and schema configuration
 */
export const DB_CONFIG = {
  name: 'ExpenseCalculatorDB',
  version: 1,
  stores: {
    cachedGroups: 'code, lastAccessed',
    offlineExpenses: 'id, groupCode, syncStatus, createdAt',
    cachedExpenses: 'id, groupCode, cachedAt',
  },
} as const;

/**
 * Cache management configuration
 */
export const CACHE_CONFIG = {
  maxCachedGroups: 10,        // Maximum number of groups to cache
  maxCachedExpenses: 100,     // Maximum number of expenses to cache per group
  syncRetryLimit: 5,          // Maximum sync retry attempts
  syncRetryDelay: 1000,       // Delay between sync retries (ms)
} as const;
