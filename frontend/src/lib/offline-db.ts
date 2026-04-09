import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'wms-offline';
const DB_VERSION = 1;

interface PendingSync {
  id: string;
  url: string;
  method: string;
  body: string;
  headers: Record<string, string>;
  createdAt: string;
}

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Cache store for API responses
      if (!db.objectStoreNames.contains('api-cache')) {
        db.createObjectStore('api-cache', { keyPath: 'url' });
      }
      // Pending sync store for offline mutations
      if (!db.objectStoreNames.contains('pending-sync')) {
        const store = db.createObjectStore('pending-sync', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
      // Inventory snapshot for offline access
      if (!db.objectStoreNames.contains('inventory')) {
        db.createObjectStore('inventory', { keyPath: 'id' });
      }
      // Products cache
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id' });
      }
    },
  });
}

// ─── API Cache ──────────────────────────────────────────

export async function cacheApiResponse(url: string, data: any): Promise<void> {
  const db = await getDB();
  await db.put('api-cache', {
    url,
    data,
    cachedAt: new Date().toISOString(),
  });
}

export async function getCachedResponse(url: string): Promise<any | null> {
  const db = await getDB();
  const cached = await db.get('api-cache', url);
  return cached?.data || null;
}

// ─── Pending Sync (Offline Mutations) ───────────────────

export async function addPendingSync(
  url: string,
  method: string,
  body: any,
  headers: Record<string, string> = {},
): Promise<void> {
  const db = await getDB();
  const id = `sync-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await db.put('pending-sync', {
    id,
    url,
    method,
    body: JSON.stringify(body),
    headers,
    createdAt: new Date().toISOString(),
  } as PendingSync);
}

export async function getPendingSyncs(): Promise<PendingSync[]> {
  const db = await getDB();
  return db.getAll('pending-sync');
}

export async function removePendingSync(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('pending-sync', id);
}

export async function syncPending(): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingSyncs();
  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          ...item.headers,
        },
        body: item.method !== 'GET' ? item.body : undefined,
      });

      if (response.ok) {
        await removePendingSync(item.id);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

// ─── Inventory Cache ────────────────────────────────────

export async function cacheInventory(items: any[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('inventory', 'readwrite');
  for (const item of items) {
    await tx.store.put(item);
  }
  await tx.done;
}

export async function getCachedInventory(): Promise<any[]> {
  const db = await getDB();
  return db.getAll('inventory');
}

// ─── Products Cache ─────────────────────────────────────

export async function cacheProducts(products: any[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('products', 'readwrite');
  for (const product of products) {
    await tx.store.put(product);
  }
  await tx.done;
}

export async function getCachedProducts(): Promise<any[]> {
  const db = await getDB();
  return db.getAll('products');
}

// ─── Online/Offline Status ──────────────────────────────

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function onOnlineStatusChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
