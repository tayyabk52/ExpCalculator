/**
 * Types for Pinned Groups (Quick Access) Feature
 * Stores user's favorite groups in browser localStorage
 */

export type PinnedGroup = {
  code: string;           // Group code (e.g., "ABCD-1234")
  name: string;           // Group name
  pinnedAt: number;       // Timestamp when pinned
  lastVisited?: number;   // Last access timestamp (optional)
};

export type PinnedGroupsStorage = {
  groups: PinnedGroup[];
  maxPinned: number;      // Maximum number of groups that can be pinned
};
