import { StorageSpace, StorageItem } from '../types/storage';

const DB_NAME = 'UbicaYa_OfflineDB';
const DB_VERSION = 1;
const STORE_SPACES = 'spaces';
const STORE_ITEMS = 'items';
const STORE_META = 'metadata';

const LS_KEY_SPACES = 'ubicaya_spaces_v2';
const LS_KEY_ITEMS = 'ubicaya_items_v2';
const LS_KEY_META = 'ubicaya_cache_meta_v2';

export interface CacheMetadata {
  lastUpdated: string;
  itemsCount: number;
  spacesCount: number;
  roomsCount: number;
  furnitureCount: number;
  version: string;
}

class OfflineCacheService {
  private db: IDBDatabase | null = null;
  private isDbSupported = typeof window !== 'undefined' && 'indexedDB' in window;

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    if (!this.isDbSupported) {
      throw new Error('IndexedDB no está soportado en este entorno.');
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_SPACES)) {
          db.createObjectStore(STORE_SPACES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_ITEMS)) {
          db.createObjectStore(STORE_ITEMS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.warn('Error opening IndexedDB, falling back to LocalStorage', event);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  }

  /**
   * Persists both spaces and items to IndexedDB and LocalStorage simultaneously.
   */
  public async syncToCache(spaces: StorageSpace[], items: StorageItem[]): Promise<CacheMetadata> {
    const roomsCount = spaces.reduce((acc, s) => acc + s.rooms.length, 0);
    const furnitureCount = spaces.reduce(
      (acc, s) => acc + s.rooms.reduce((rAcc, r) => rAcc + r.furniture.length, 0),
      0
    );

    const meta: CacheMetadata = {
      lastUpdated: new Date().toISOString(),
      itemsCount: items.length,
      spacesCount: spaces.length,
      roomsCount,
      furnitureCount,
      version: '2.1.0',
    };

    // 1. Fast synchronous write to LocalStorage
    try {
      localStorage.setItem(LS_KEY_SPACES, JSON.stringify(spaces));
      localStorage.setItem(LS_KEY_ITEMS, JSON.stringify(items));
      localStorage.setItem(LS_KEY_META, JSON.stringify(meta));
    } catch (e) {
      console.warn('LocalStorage quota or write error', e);
    }

    // 2. Persistent structured write to IndexedDB
    try {
      const db = await this.openDB();
      const tx = db.transaction([STORE_SPACES, STORE_ITEMS, STORE_META], 'readwrite');

      const spaceStore = tx.objectStore(STORE_SPACES);
      const itemStore = tx.objectStore(STORE_ITEMS);
      const metaStore = tx.objectStore(STORE_META);

      // Clear existing records
      spaceStore.clear();
      itemStore.clear();

      spaces.forEach((s) => spaceStore.put(s));
      items.forEach((i) => itemStore.put(i));
      metaStore.put({ key: 'main', ...meta });

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('IndexedDB write skipped/fallback', err);
    }

    return meta;
  }

  /**
   * Hydrates application data from IndexedDB or LocalStorage.
   */
  public async loadFromCache(): Promise<{
    spaces: StorageSpace[] | null;
    items: StorageItem[] | null;
    meta: CacheMetadata | null;
    source: 'indexedDB' | 'localStorage' | 'none';
  }> {
    // Try IndexedDB first
    try {
      const db = await this.openDB();
      const tx = db.transaction([STORE_SPACES, STORE_ITEMS, STORE_META], 'readonly');

      const spaceStore = tx.objectStore(STORE_SPACES);
      const itemStore = tx.objectStore(STORE_ITEMS);
      const metaStore = tx.objectStore(STORE_META);

      const [spaces, items, metaRecord] = await Promise.all([
        new Promise<StorageSpace[]>((res, rej) => {
          const req = spaceStore.getAll();
          req.onsuccess = () => res(req.result);
          req.onerror = () => rej(req.error);
        }),
        new Promise<StorageItem[]>((res, rej) => {
          const req = itemStore.getAll();
          req.onsuccess = () => res(req.result);
          req.onerror = () => rej(req.error);
        }),
        new Promise<{ key: string } & CacheMetadata>((res, rej) => {
          const req = metaStore.get('main');
          req.onsuccess = () => res(req.result);
          req.onerror = () => rej(req.error);
        }),
      ]);

      if (spaces && spaces.length > 0 && items && items.length > 0) {
        return {
          spaces,
          items,
          meta: metaRecord || null,
          source: 'indexedDB',
        };
      }
    } catch (e) {
      // Fallback to LocalStorage
    }

    // LocalStorage fallback
    try {
      const savedSpaces = localStorage.getItem(LS_KEY_SPACES);
      const savedItems = localStorage.getItem(LS_KEY_ITEMS);
      const savedMeta = localStorage.getItem(LS_KEY_META);

      if (savedSpaces && savedItems) {
        return {
          spaces: JSON.parse(savedSpaces),
          items: JSON.parse(savedItems),
          meta: savedMeta ? JSON.parse(savedMeta) : null,
          source: 'localStorage',
        };
      }
    } catch (e) {
      console.warn('LocalStorage read error', e);
    }

    return { spaces: null, items: null, meta: null, source: 'none' };
  }

  /**
   * Retrieves cache statistics and storage metrics.
   */
  public async getCacheStatus(): Promise<{
    hasIndexedDB: boolean;
    hasLocalStorage: boolean;
    meta: CacheMetadata | null;
    estimatedSizeKb: number;
  }> {
    let meta: CacheMetadata | null = null;
    try {
      const savedMeta = localStorage.getItem(LS_KEY_META);
      if (savedMeta) meta = JSON.parse(savedMeta);
    } catch (e) {}

    // Calculate approximate size in LocalStorage
    let estimatedSizeKb = 0;
    try {
      const s1 = localStorage.getItem(LS_KEY_SPACES)?.length || 0;
      const s2 = localStorage.getItem(LS_KEY_ITEMS)?.length || 0;
      estimatedSizeKb = Math.round((s1 + s2) / 1024);
    } catch (e) {}

    return {
      hasIndexedDB: this.isDbSupported,
      hasLocalStorage: typeof window !== 'undefined' && 'localStorage' in window,
      meta,
      estimatedSizeKb,
    };
  }

  public async clearAllCache(): Promise<void> {
    try {
      localStorage.removeItem(LS_KEY_SPACES);
      localStorage.removeItem(LS_KEY_ITEMS);
      localStorage.removeItem(LS_KEY_META);
    } catch (e) {}

    try {
      const db = await this.openDB();
      const tx = db.transaction([STORE_SPACES, STORE_ITEMS, STORE_META], 'readwrite');
      tx.objectStore(STORE_SPACES).clear();
      tx.objectStore(STORE_ITEMS).clear();
      tx.objectStore(STORE_META).clear();
    } catch (e) {}
  }
}

export const offlineCacheService = new OfflineCacheService();
