/**
 * Utilities for managing pinned groups (Quick Access)
 * Uses browser localStorage to persist user's favorite groups
 */

import type { PinnedGroup, PinnedGroupsStorage } from '@/lib/types/pinned-groups';

const STORAGE_KEY = 'expense-calc-pinned-groups';
const MAX_PINNED = 5;

/**
 * Get all pinned groups from localStorage
 * @returns Array of pinned groups, sorted by most recently pinned
 */
export function getPinnedGroups(): PinnedGroup[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const data: PinnedGroupsStorage = JSON.parse(stored);
    return data.groups.sort((a, b) => b.pinnedAt - a.pinnedAt);
  } catch (error) {
    console.error('Failed to load pinned groups:', error);
    return [];
  }
}

/**
 * Pin a group to Quick Access
 * @param group - Group information (without pinnedAt timestamp)
 * @returns true if successfully pinned, false if already pinned or limit reached
 */
export function pinGroup(group: Omit<PinnedGroup, 'pinnedAt'>): boolean {
  try {
    const pinned = getPinnedGroups();
    
    // Check if already pinned
    if (pinned.some(g => g.code === group.code)) {
      return false; // Already pinned
    }
    
    // Check limit
    if (pinned.length >= MAX_PINNED) {
      return false; // Max limit reached
    }
    
    // Add new pin
    const newPin: PinnedGroup = {
      ...group,
      pinnedAt: Date.now(),
    };
    
    pinned.unshift(newPin);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      groups: pinned,
      maxPinned: MAX_PINNED,
    } as PinnedGroupsStorage));
    
    return true;
  } catch (error) {
    console.error('Failed to pin group:', error);
    return false;
  }
}

/**
 * Unpin a group from Quick Access
 * @param code - Group code to unpin
 * @returns true if successfully unpinned, false on error
 */
export function unpinGroup(code: string): boolean {
  try {
    const pinned = getPinnedGroups();
    const filtered = pinned.filter(g => g.code !== code);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      groups: filtered,
      maxPinned: MAX_PINNED,
    } as PinnedGroupsStorage));
    
    return true;
  } catch (error) {
    console.error('Failed to unpin group:', error);
    return false;
  }
}

/**
 * Check if a group is pinned
 * @param code - Group code to check
 * @returns true if pinned, false otherwise
 */
export function isGroupPinned(code: string): boolean {
  const pinned = getPinnedGroups();
  return pinned.some(g => g.code === code);
}

/**
 * Update the last visited timestamp for a pinned group
 * @param code - Group code to update
 */
export function updateLastVisited(code: string): void {
  try {
    const pinned = getPinnedGroups();
    const updated = pinned.map(g => 
      g.code === code 
        ? { ...g, lastVisited: Date.now() }
        : g
    );
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      groups: updated,
      maxPinned: MAX_PINNED,
    } as PinnedGroupsStorage));
  } catch (error) {
    console.error('Failed to update last visited:', error);
  }
}

/**
 * Format a timestamp as relative time (e.g., "5m ago", "2h ago", "3d ago")
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted relative time string
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Get the maximum number of groups that can be pinned
 * @returns Maximum pinned groups limit
 */
export function getMaxPinnedLimit(): number {
  return MAX_PINNED;
}
