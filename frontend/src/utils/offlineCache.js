import { openDB } from '../config/dbConfig';

const APP_CACHE_STORE = 'app_cache';
const THUMBNAILS_STORE = 'place_thumbnails';
const getMapConfigKey = () => {
    const rid = localStorage.getItem('capsule_relationship_id');
    return rid ? `mapConfig_${rid}` : 'capsule_mapConfig';
};

const THUMBNAIL_EXPIRATION_DAYS = 7;
const MAX_THUMBNAILS = 100;

/**
 * Get map configuration from IndexedDB
 */
export async function getMapConfigCache() {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(APP_CACHE_STORE, 'readonly');
            const store = tx.objectStore(APP_CACHE_STORE);
            const request = store.get(getMapConfigKey());
            request.onsuccess = () => resolve(request.result?.data || null);
            request.onerror = () => resolve(null);
        });
    } catch (err) {
        // silent fail
        return null;
    }
}

/**
 * Save map configuration to IndexedDB
 */
export async function setMapConfigCache(config) {
    try {
        const db = await openDB();
        const tx = db.transaction(APP_CACHE_STORE, 'readwrite');
        const store = tx.objectStore(APP_CACHE_STORE);
        store.put({
            key: getMapConfigKey(),
            data: config,
            updatedAt: Date.now()
        });
        return true;
    } catch (err) {
        // silent fail
        return false;
    }
}

/**
 * Get a cached thumbnail for a place as a Blob URL
 */
export async function getThumbnail(placeId) {
    try {
        const db = await openDB();
        const item = await new Promise((resolve) => {
            const tx = db.transaction(THUMBNAILS_STORE, 'readonly');
            const store = tx.objectStore(THUMBNAILS_STORE);
            const request = store.get(placeId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
        });

        if (!item) return null;

        // Check expiration (7 days)
        const now = Date.now();
        const isExpired = (now - item.cachedAt) > (THUMBNAIL_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
        
        if (isExpired) {
            // silent warn
            return null;
        }

        // Convert Blob to URL
        return URL.createObjectURL(item.blob);
    } catch (err) {
        // silent fail
        return null;
    }
}

/**
 * Save a thumbnail to the cache
 */
export async function cacheThumbnail(placeId, blob) {
    try {
        const db = await openDB();
        
        // Before adding, maybe clean up if full (simple LRU by count)
        await cleanOldThumbnails(db);

        const tx = db.transaction(THUMBNAILS_STORE, 'readwrite');
        const store = tx.objectStore(THUMBNAILS_STORE);
        store.put({
            placeId,
            blob,
            cachedAt: Date.now()
        });
        return true;
    } catch (err) {
        // silent fail
        return false;
    }
}

/**
 * High-level helper for usePlaces or other components.
 * Fetches URL and caches it.
 */
export async function cachePlaceThumbnail(placeId, url) {
    if (!url || typeof url !== 'string' || url.startsWith('blob:') || url.startsWith('data:')) return;
    
    try {
        // Only fetch if not already in cache (or if expired)
        const db = await openDB();
        const existing = await new Promise(resolve => {
            const tx = db.transaction(THUMBNAILS_STORE, 'readonly');
            const req = tx.objectStore(THUMBNAILS_STORE).get(placeId);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        });

        if (existing) {
            const now = Date.now();
            const isFresh = (now - existing.cachedAt) < (THUMBNAIL_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
            if (isFresh) return;
        }

        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) return;
        const blob = await res.blob();
        await cacheThumbnail(placeId, blob);
    } catch (err) {
        // Silent fail for background caching
    }
}

/**
 * Simple cleanup of old or excessive thumbnails
 */
async function cleanOldThumbnails(dbInstance) {
    const db = dbInstance || await openDB();
    const tx = db.transaction(THUMBNAILS_STORE, 'readwrite');
    const store = tx.objectStore(THUMBNAILS_STORE);
    const index = store.index('cachedAt');
    
    return new Promise((resolve) => {
        const countRequest = store.count();
        countRequest.onsuccess = () => {
            if (countRequest.result < MAX_THUMBNAILS) {
                resolve();
                return;
            }

            // If over limit, delete the oldest 10%
            const toDelete = Math.ceil(MAX_THUMBNAILS * 0.1);
            let deletedCount = 0;
            // silent fail
            const cursorRequest = index.openCursor();
            cursorRequest.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor && deletedCount < toDelete) {
                    cursor.delete();
                    deletedCount++;
                    cursor.continue();
                } else {
                    resolve();
                }
            };
        };
        countRequest.onerror = () => resolve();
    });
}
