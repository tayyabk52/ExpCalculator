/**
 * OfflineProvider Component
 * Initializes offline database and provides offline context
 */

'use client';

import { useEffect } from 'react';
import { initDatabase } from '@/lib/db/offline-db';
import { OfflineBanner } from './OfflineBanner';

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize database on mount
    initDatabase();
  }, []);

  return (
    <>
      <OfflineBanner />
      {children}
    </>
  );
}
