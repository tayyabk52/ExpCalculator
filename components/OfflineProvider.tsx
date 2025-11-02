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

    // Register service worker for PWA (production only)
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✅ Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
        });
    }
  }, []);

  return (
    <>
      <OfflineBanner />
      {children}
    </>
  );
}
