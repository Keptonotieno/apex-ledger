/**
 * IndexedDBCache provides a robust, promise-based wrapper around IndexedDB
 * to cache Supabase query results and table states. This ensures that the application
 * is fully functional and responsive even with unstable internet connections,
 * falling back to the cache when remote queries are offline or delayed.
 */
export class IndexedDBCache {
  private static DB_NAME = 'apex_supabase_cache';
  private static STORE_NAME = 'query_cache';
  private static DB_VERSION = 1;
  private static dbInstance: IDBDatabase | null = null;

  private static openDatabase(): Promise<IDBDatabase> {
    if (this.dbInstance) {
      return Promise.resolve(this.dbInstance);
    }
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };

      request.onsuccess = (event) => {
        this.dbInstance = (event.target as IDBOpenDBRequest).result;
        resolve(this.dbInstance);
      };

      request.onerror = (event) => {
        console.error('[IndexedDBCache] Failed to open IndexedDB:', event);
        reject(new Error('Failed to open IndexedDB database.'));
      };
    });
  }

  /**
   * Caches data with a specific string key.
   * @param key The key to store the data under (e.g. table name or query signature).
   * @param data The data object/array to cache.
   */
  public static async set(key: string, data: any): Promise<void> {
    try {
      const db = await this.openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.STORE_NAME, 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        
        const cacheEntry = {
          data,
          cachedAt: Date.now(),
        };

        const request = store.put(cacheEntry, key);

        request.onsuccess = () => resolve();
        request.onerror = (event) => {
          console.error(`[IndexedDBCache] Error saving cache for key "${key}":`, event);
          reject(new Error(`Failed to save cache for key: ${key}`));
        };
      });
    } catch (err) {
      console.error(`[IndexedDBCache] set error for key "${key}":`, err);
    }
  }

  /**
   * Retrieves cached data for a specific key.
   * @param key The key to fetch data for.
   * @returns The cached data if found, otherwise null.
   */
  public static async get<T = any>(key: string): Promise<T | null> {
    try {
      const db = await this.openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.STORE_NAME, 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.get(key);

        request.onsuccess = (event) => {
          const result = (event.target as IDBRequest).result;
          if (result && result.data !== undefined) {
            resolve(result.data as T);
          } else {
            resolve(null);
          }
        };

        request.onerror = (event) => {
          console.error(`[IndexedDBCache] Error loading cache for key "${key}":`, event);
          reject(new Error(`Failed to load cache for key: ${key}`));
        };
      });
    } catch (err) {
      console.error(`[IndexedDBCache] get error for key "${key}":`, err);
      return null;
    }
  }

  /**
   * Deletes a cached entry from IndexedDB.
   * @param key The key to remove.
   */
  public static async delete(key: string): Promise<void> {
    try {
      const db = await this.openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.STORE_NAME, 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = (event) => {
          console.error(`[IndexedDBCache] Error deleting cache for key "${key}":`, event);
          reject(new Error(`Failed to delete cache for key: ${key}`));
        };
      });
    } catch (err) {
      console.error(`[IndexedDBCache] delete error for key "${key}":`, err);
    }
  }

  /**
   * Clears all cached items from the query cache store.
   */
  public static async clear(): Promise<void> {
    try {
      const db = await this.openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.STORE_NAME, 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = (event) => {
          console.error('[IndexedDBCache] Error clearing database cache:', event);
          reject(new Error('Failed to clear cache database.'));
        };
      });
    } catch (err) {
      console.error('[IndexedDBCache] clear database error:', err);
    }
  }
}
