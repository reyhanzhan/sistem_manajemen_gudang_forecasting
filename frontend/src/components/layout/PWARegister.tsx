'use client';

import { useEffect, useState } from 'react';
import { syncPending } from '@/lib/offline-db';

export function PWARegister() {
  const [isOffline, setIsOffline] = useState(false);
  const [syncCount, setSyncCount] = useState(0);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('Service Worker registration failed:', err);
        });

      // Listen for sync messages from service worker
      navigator.serviceWorker.addEventListener('message', async (event) => {
        if (event.data?.type === 'SYNC_PENDING') {
          const result = await syncPending();
          setSyncCount(result.synced);
        }
      });
    }

    // Online/offline detection
    const handleOnline = async () => {
      setIsOffline(false);
      // Auto-sync pending requests when coming back online
      const result = await syncPending();
      if (result.synced > 0) {
        setSyncCount(result.synced);
        setTimeout(() => setSyncCount(0), 3000);
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      {/* Offline indicator banner */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-yellow-500 text-yellow-900 text-center py-1 text-sm font-medium">
          ⚠️ Anda sedang offline — Data tersimpan lokal dan akan disinkronkan saat online
        </div>
      )}

      {/* Sync notification */}
      {syncCount > 0 && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-green-500 text-white text-center py-1 text-sm font-medium">
          ✅ {syncCount} data berhasil disinkronkan
        </div>
      )}
    </>
  );
}
