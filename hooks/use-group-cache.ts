/**
 * useGroupCache Hook
 * Handles caching and loading groups for offline access
 */

'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/db/offline-db';
import { useOffline } from './use-offline';
import type { Group, GroupMember } from '@/lib/types/group';
import type { CachedGroup } from '@/lib/db/schema';

interface UseGroupCacheResult {
  cachedGroup: CachedGroup | null;
  isCached: boolean;
  isLoadingCache: boolean;
}

/**
 * Hook to cache group data and retrieve it when offline
 */
export function useGroupCache(groupCode: string, group: Group | null, members: GroupMember[]): UseGroupCacheResult {
  const isOffline = useOffline();
  const [cachedGroup, setCachedGroup] = useState<CachedGroup | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [isLoadingCache, setIsLoadingCache] = useState(true);

  // Cache group when online and group data is available
  useEffect(() => {
    async function cacheGroupData() {
      if (!group || !members || members.length === 0 || !group.name) return;

      try {
        await db.cacheGroup({
          code: groupCode,
          name: group.name,
          members: members,
        });
        
        setIsCached(true);
        console.log(`✅ Cached group: ${group.name}`);
      } catch (error) {
        console.error('Failed to cache group:', error);
      }
    }

    // Only cache when online
    if (!isOffline && group) {
      cacheGroupData();
    }
  }, [group, members, groupCode, isOffline]);

  // Load cached group when offline
  useEffect(() => {
    async function loadCachedGroup() {
      setIsLoadingCache(true);
      
      try {
        const cached = await db.getCachedGroup(groupCode);
        setCachedGroup(cached);
        setIsCached(!!cached);
      } catch (error) {
        console.error('Failed to load cached group:', error);
      } finally {
        setIsLoadingCache(false);
      }
    }

    // Load cache when initializing or when going offline
    if (isOffline) {
      loadCachedGroup();
    } else {
      setIsLoadingCache(false);
    }
  }, [groupCode, isOffline]);

  return {
    cachedGroup,
    isCached,
    isLoadingCache,
  };
}
