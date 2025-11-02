/**
 * useOffline Hook
 * Tracks online/offline status with real-time updates
 */

'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect online/offline status
 * Returns true when offline, false when online
 */
export function useOffline(): boolean {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Set initial state
    setIsOffline(!navigator.onLine);

    // Handler functions
    const handleOnline = () => {
      console.log('🌐 Connection restored');
      setIsOffline(false);
    };

    const handleOffline = () => {
      console.log('📴 Connection lost');
      setIsOffline(true);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOffline;
}

/**
 * Hook to get online/offline status (opposite of useOffline)
 * Returns true when online, false when offline
 */
export function useOnline(): boolean {
  return !useOffline();
}
