import { openDB } from '../config/dbConfig';

const PHOTO_STORE = 'photo_cache';

/**
 * Saves a photo blob to IndexedDB.
 */
export async function savePhotoToCache(id, blob, url = null) {
    if (!id || !blob) return;
    try {
        const db = await openDB();
        const tx = db.transaction(PHOTO_STORE, 'readwrite');
        const store = tx.objectStore(PHOTO_STORE);
        await store.put({
            id,
            blob,
            url,
            cachedAt: Date.now()
        });
    } catch (err) {
        console.error('[PhotoCache] Error saving photo:', err);
    }
}

/**
 * Downloads a photo from a URL and saves it to cache.
 */
export async function downloadAndCachePhoto(id, url) {
    if (!id || !url || url.startsWith('blob:') || url.startsWith('data:')) return;
    try {
        // Check if already cached
        const existing = await getPhotoFromCache(id);
        if (existing) return;

        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) return;
        const blob = await res.blob();
        await savePhotoToCache(id, blob, url);
    } catch (err) {
        // Silent fail for background caching
    }
}

/**
 * Retrieves a cached photo as a Blob.
 */
export async function getPhotoFromCache(id) {
    if (!id) return null;
    try {
        const db = await openDB();
        const tx = db.transaction(PHOTO_STORE, 'readonly');
        const store = tx.objectStore(PHOTO_STORE);
        const request = store.get(id);
        
        const result = await new Promise((resolve) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
        });

        return result?.blob || null;
    } catch (err) {
        return null;
    }
}
